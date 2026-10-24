import type { DatabaseSync } from "node:sqlite";

import { z } from "zod";

import { migrateDocument } from "@/content/migrations";
import {
  CURRENT_SCHEMA_VERSION,
  portfolioDocumentSchema,
  type PortfolioDocument,
} from "@/content/schema";

/** Resumo de uma revisão publicada, para o histórico. */
export type RevisionSummary = {
  id: number;
  schemaVersion: number;
  /** Hora da publicação, em ISO 8601 (UTC). */
  publishedAt: string;
  note: string | null;
};

/** Uma revisão publicada, com o documento. */
export type PublishedRevision = Omit<RevisionSummary, "schemaVersion"> & {
  document: PortfolioDocument;
};

const summaryRowSchema = z.object({
  id: z.number().int(),
  schema_version: z.number().int(),
  published_at: z.string(),
  note: z.string().nullable(),
});

const revisionRowSchema = summaryRowSchema
  .omit({ schema_version: true })
  .extend({ document: z.string() });

function toRevision(row: unknown): PublishedRevision {
  const { id, published_at, note, document } = revisionRowSchema.parse(row);
  return {
    id,
    publishedAt: published_at,
    note,
    document: migrateDocument(JSON.parse(document)),
  };
}

/**
 * Grava uma revisão publicada. Só acrescenta: revisões publicadas são
 * imutáveis, e o banco recusa alterá-las ou apagá-las.
 *
 * É só a parte do banco. A publicação completa (validação estrita, currículo e
 * invalidação do cache) é do fluxo de publicação do painel.
 *
 * @param db - Conexão aberta e migrada.
 * @param document - Documento a publicar; é validado de novo aqui.
 * @param note - Observação opcional, mostrada no histórico.
 * @param now - Hora da publicação; os testes fixam o valor.
 * @returns A revisão gravada.
 * @throws {z.ZodError} Se o documento não seguir o schema.
 */
export function insertRevision(
  db: DatabaseSync,
  document: PortfolioDocument,
  note: string | null = null,
  now: Date = new Date(),
): PublishedRevision {
  const valid = portfolioDocumentSchema.parse(document);
  const publishedAt = now.toISOString();
  const result = db
    .prepare(
      `INSERT INTO published_revisions (schema_version, document, published_at, note)
       VALUES (?, ?, ?, ?)`,
    )
    .run(valid.schemaVersion, JSON.stringify(valid), publishedAt, note);

  return {
    id: Number(result.lastInsertRowid),
    publishedAt,
    note,
    document: valid,
  };
}

/**
 * Lê a revisão publicada mais recente que esta versão do código sabe ler.
 *
 * Revisões gravadas por uma versão mais nova do schema ficam de fora: depois de
 * um rollback do deploy, o site continua no ar com a última revisão que a
 * imagem anterior entende.
 *
 * @param db - Conexão aberta e migrada.
 * @returns A revisão, ou `null` se nada foi publicado ainda.
 */
export function readLatestRevision(db: DatabaseSync): PublishedRevision | null {
  const row = db
    .prepare(
      `SELECT id, document, published_at, note FROM published_revisions
       WHERE schema_version <= ?
       ORDER BY id DESC
       LIMIT 1`,
    )
    .get(CURRENT_SCHEMA_VERSION);
  return row === undefined ? null : toRevision(row);
}

/**
 * Lê uma revisão publicada, para restaurá-la como rascunho.
 *
 * @param db - Conexão aberta e migrada.
 * @param id - Id da revisão.
 * @returns A revisão, ou `null` se não existir.
 * @throws {NewerDocumentVersionError} Se foi gravada por uma versão mais nova
 *   do schema.
 */
export function readRevision(
  db: DatabaseSync,
  id: number,
): PublishedRevision | null {
  const row = db
    .prepare(
      "SELECT id, document, published_at, note FROM published_revisions WHERE id = ?",
    )
    .get(id);
  return row === undefined ? null : toRevision(row);
}

/**
 * Lista as revisões publicadas, da mais recente para a mais antiga, sem os
 * documentos.
 *
 * @param db - Conexão aberta e migrada.
 * @param limit - Quantas revisões listar.
 * @returns Os resumos das revisões.
 */
export function listRevisions(db: DatabaseSync, limit = 50): RevisionSummary[] {
  return db
    .prepare(
      `SELECT id, schema_version, published_at, note FROM published_revisions
       ORDER BY id DESC
       LIMIT ?`,
    )
    .all(limit)
    .map((row) => {
      const { id, schema_version, published_at, note } =
        summaryRowSchema.parse(row);
      return {
        id,
        schemaVersion: schema_version,
        publishedAt: published_at,
        note,
      };
    });
}
