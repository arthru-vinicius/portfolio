import type { DatabaseSync } from "node:sqlite";

import { z } from "zod";

import { migrateDocument } from "@/content/migrations";
import {
  portfolioDocumentSchema,
  type PortfolioDocument,
} from "@/content/schema";

import { withTransaction } from "./transaction";

/** O rascunho de trabalho do painel. */
export type Draft = {
  document: PortfolioDocument;
  /** Versão lida, a devolver ao salvar (concorrência otimista). */
  lockVersion: number;
  /** Hora do último salvamento, em ISO 8601 (UTC). */
  updatedAt: string;
};

/**
 * O rascunho mudou desde que foi lido, por exemplo em outra aba. Salvar por
 * cima perderia a outra alteração.
 */
export class DraftConflictError extends Error {
  /** @param expected - Versão que quem salvava tinha lido. */
  constructor(expected: number) {
    super(
      `O rascunho mudou desde a versão ${expected}. Recarregue antes de salvar.`,
    );
    this.name = "DraftConflictError";
  }
}

const draftRowSchema = z.object({
  document: z.string(),
  lock_version: z.number().int(),
  updated_at: z.string(),
});

/**
 * Lê o rascunho.
 *
 * @param db - Conexão aberta e migrada.
 * @returns O rascunho, ou `null` se ainda não houver um.
 * @throws {NewerDocumentVersionError} Se foi gravado por uma versão mais nova
 *   do schema (depois de um rollback do deploy).
 */
export function readDraft(db: DatabaseSync): Draft | null {
  const row = db
    .prepare(
      "SELECT document, lock_version, updated_at FROM draft WHERE id = 1",
    )
    .get();
  if (row === undefined) {
    return null;
  }
  const { document, lock_version, updated_at } = draftRowSchema.parse(row);
  return {
    document: migrateDocument(JSON.parse(document)),
    lockVersion: lock_version,
    updatedAt: updated_at,
  };
}

/**
 * Salva o rascunho, desde que ele não tenha mudado desde a leitura.
 *
 * O rascunho aceita campos incompletos; a exigência dos dois idiomas é da
 * publicação.
 *
 * @param db - Conexão aberta e migrada.
 * @param document - Documento a salvar; é validado de novo aqui.
 * @param expectedLockVersion - `lockVersion` lido junto com o rascunho, ou `0`
 *   se ainda não havia rascunho.
 * @param now - Hora do salvamento; os testes fixam o valor.
 * @returns O rascunho salvo, com a nova `lockVersion`.
 * @throws {DraftConflictError} Se o rascunho mudou desde a leitura.
 * @throws {z.ZodError} Se o documento não seguir o schema.
 */
export function saveDraft(
  db: DatabaseSync,
  document: PortfolioDocument,
  expectedLockVersion: number,
  now: Date = new Date(),
): Draft {
  const valid = portfolioDocumentSchema.parse(document);

  return withTransaction(db, () => {
    const current = db
      .prepare("SELECT lock_version FROM draft WHERE id = 1")
      .get();
    const currentLockVersion =
      current === undefined
        ? 0
        : draftRowSchema.pick({ lock_version: true }).parse(current)
            .lock_version;
    if (currentLockVersion !== expectedLockVersion) {
      throw new DraftConflictError(expectedLockVersion);
    }

    const lockVersion = currentLockVersion + 1;
    const updatedAt = now.toISOString();
    db.prepare(
      `INSERT INTO draft (id, schema_version, document, lock_version, updated_at)
       VALUES (1, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         schema_version = excluded.schema_version,
         document = excluded.document,
         lock_version = excluded.lock_version,
         updated_at = excluded.updated_at`,
    ).run(valid.schemaVersion, JSON.stringify(valid), lockVersion, updatedAt);

    return { document: valid, lockVersion, updatedAt };
  });
}
