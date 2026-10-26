import type { DatabaseSync } from "node:sqlite";

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { createEmptyDocument } from "@/content/editing";
import { NewerDocumentVersionError } from "@/content/migrations";
import type { PortfolioDocument } from "@/content/schema";

import { portfolioFixture } from "../../../tests/fixtures/portfolio-document";
import { createTestDatabase } from "../../../tests/support/database";

import {
  DraftConflictError,
  readDraft,
  readEditableDraft,
  saveDraft,
  updateDraft,
} from "./draft";
import { insertRevision } from "./revisions";

const NOW = new Date("2026-10-24T12:00:00.000Z");

describe("rascunho", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(() => {
    db.close();
  });

  it("não existe antes do primeiro salvamento", () => {
    expect(readDraft(db)).toBeNull();
  });

  it("salva o primeiro rascunho a partir da versão 0 e o lê de volta", () => {
    const saved = saveDraft(db, portfolioFixture, 0, NOW);

    expect(saved).toEqual({
      document: portfolioFixture,
      lockVersion: 1,
      updatedAt: "2026-10-24T12:00:00.000Z",
    });
    expect(readDraft(db)).toEqual(saved);
  });

  it("aceita salvar de novo com a versão lida", () => {
    const first = saveDraft(db, portfolioFixture, 0, NOW);
    const changed: PortfolioDocument = {
      ...portfolioFixture,
      profile: { ...portfolioFixture.profile, displayName: "Ana E." },
    };

    const second = saveDraft(db, changed, first.lockVersion, NOW);

    expect(second.lockVersion).toBe(2);
    expect(readDraft(db)?.document.profile.displayName).toBe("Ana E.");
  });

  it("recusa salvar por cima de uma alteração feita em outro lugar", () => {
    saveDraft(db, portfolioFixture, 0, NOW);
    saveDraft(db, portfolioFixture, 1, NOW);
    const stale: PortfolioDocument = {
      ...portfolioFixture,
      profile: { ...portfolioFixture.profile, displayName: "Versão velha" },
    };

    expect(() => saveDraft(db, stale, 1, NOW)).toThrow(DraftConflictError);
    expect(readDraft(db)?.document.profile.displayName).toBe("Ana Exemplo");
    expect(readDraft(db)?.lockVersion).toBe(2);
  });

  it("recusa um documento inválido sem gravar nada", () => {
    const invalid = {
      ...portfolioFixture,
      schemaVersion: 7,
    } as unknown as PortfolioDocument;

    expect(() => saveDraft(db, invalid, 0, NOW)).toThrow(ZodError);
    expect(readDraft(db)).toBeNull();
  });

  it("avisa quando o rascunho foi gravado por uma versão mais nova do schema", () => {
    db.prepare(
      "INSERT INTO draft (id, schema_version, document, lock_version, updated_at) VALUES (1, 2, ?, 1, ?)",
    ).run(
      JSON.stringify({ ...portfolioFixture, schemaVersion: 2 }),
      NOW.toISOString(),
    );

    expect(() => readDraft(db)).toThrow(NewerDocumentVersionError);
  });
});

describe("rascunho editável", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(() => {
    db.close();
  });

  it("começa vazio quando não há rascunho nem publicação", () => {
    expect(readEditableDraft(db)).toEqual({
      document: createEmptyDocument(),
      lockVersion: 0,
      updatedAt: null,
    });
  });

  it("começa da última publicação quando não há rascunho", () => {
    insertRevision(db, portfolioFixture, null, NOW);

    expect(readEditableDraft(db)).toEqual({
      document: portfolioFixture,
      lockVersion: 0,
      updatedAt: null,
    });
  });

  it("é o rascunho, quando ele existe", () => {
    const saved = saveDraft(db, portfolioFixture, 0, NOW);

    expect(readEditableDraft(db)).toEqual(saved);
  });

  it("muda o rascunho a partir do documento editável, e cria o primeiro", () => {
    insertRevision(db, portfolioFixture, null, NOW);

    const saved = updateDraft(
      db,
      0,
      (document) => ({
        ...document,
        profile: { ...document.profile, displayName: "Ana E." },
      }),
      NOW,
    );

    expect(saved.lockVersion).toBe(1);
    expect(readDraft(db)?.document.profile).toEqual({
      ...portfolioFixture.profile,
      displayName: "Ana E.",
    });
  });

  it("recusa a mudança feita sobre uma versão velha, sem gravar", () => {
    saveDraft(db, portfolioFixture, 0, NOW);
    let called = false;

    expect(() =>
      updateDraft(db, 0, (document) => {
        called = true;
        return document;
      }),
    ).toThrow(DraftConflictError);
    expect(called).toBe(false);
    expect(readDraft(db)?.lockVersion).toBe(1);
  });
});
