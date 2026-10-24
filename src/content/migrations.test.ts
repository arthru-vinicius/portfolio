import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { portfolioFixture } from "../../tests/fixtures/portfolio-document";

import { migrateDocument, NewerDocumentVersionError } from "./migrations";
import { CURRENT_SCHEMA_VERSION } from "./schema";

describe("migrateDocument", () => {
  it("lê um documento na versão atual e o devolve validado", () => {
    const stored: unknown = JSON.parse(JSON.stringify(portfolioFixture));

    expect(migrateDocument(stored)).toEqual(portfolioFixture);
  });

  it("recusa um documento de uma versão mais nova, apontando a versão", () => {
    const newer = {
      ...portfolioFixture,
      schemaVersion: CURRENT_SCHEMA_VERSION + 1,
    };

    expect(() => migrateDocument(newer)).toThrow(NewerDocumentVersionError);
    expect(() => migrateDocument(newer)).toThrow(
      `versão ${CURRENT_SCHEMA_VERSION + 1} do schema`,
    );
  });

  it.each([
    ["sem schemaVersion", { profile: {} }],
    ["com schemaVersion 0", { ...portfolioFixture, schemaVersion: 0 }],
    ["que não é objeto", "documento"],
  ])("recusa um documento %s", (_case, stored) => {
    expect(() => migrateDocument(stored)).toThrow(ZodError);
  });

  it("recusa um documento da versão atual que não segue o schema", () => {
    expect(() =>
      migrateDocument({ ...portfolioFixture, blocks: "nenhum" }),
    ).toThrow(ZodError);
  });
});
