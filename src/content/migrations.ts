import { z } from "zod";

import {
  CURRENT_SCHEMA_VERSION,
  portfolioDocumentSchema,
  type PortfolioDocument,
} from "./schema";

/**
 * Documento gravado por uma versão do schema mais nova que a deste código. É o
 * caso do rascunho depois de um rollback do deploy: a imagem anterior não sabe
 * ler o que a nova gravou.
 */
export class NewerDocumentVersionError extends Error {
  /** Versão do schema gravada no documento. */
  readonly version: number;

  /** @param version - Versão do schema gravada no documento. */
  constructor(version: number) {
    super(
      `Documento na versão ${version} do schema; este código lê até a ${CURRENT_SCHEMA_VERSION}.`,
    );
    this.name = "NewerDocumentVersionError";
    this.version = version;
  }
}

type StoredDocument = Record<string, unknown>;

/**
 * Funções que sobem o documento de uma versão para a seguinte. A chave é a
 * versão de origem: `upgrades[1]` leva da 1 para a 2. Vazio enquanto só existe
 * a versão 1.
 */
const upgrades: Partial<
  Record<number, (document: StoredDocument) => StoredDocument>
> = {};

const storedVersionSchema = z.looseObject({
  schemaVersion: z.number().int().min(1),
});

/**
 * Lê um documento gravado em qualquer versão conhecida do schema, sobe para a
 * versão atual e valida.
 *
 * Revisões antigas continuam abrindo: é o que mantém o histórico restaurável.
 *
 * @param stored - O JSON já interpretado, como veio do banco ou da importação.
 * @returns O documento na versão atual, validado.
 * @throws {NewerDocumentVersionError} Se o documento for de uma versão mais nova.
 * @throws {z.ZodError} Se não tiver versão ou não seguir o schema.
 */
export function migrateDocument(stored: unknown): PortfolioDocument {
  const versioned = storedVersionSchema.parse(stored);
  const version = versioned.schemaVersion;
  let document: StoredDocument = versioned;
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new NewerDocumentVersionError(version);
  }

  for (let from = version; from < CURRENT_SCHEMA_VERSION; from += 1) {
    const upgrade = upgrades[from];
    if (upgrade === undefined) {
      throw new Error(`Falta a função que sobe o documento da versão ${from}.`);
    }
    document = upgrade(document);
  }
  return portfolioDocumentSchema.parse(document);
}
