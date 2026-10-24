import type { DatabaseSync } from "node:sqlite";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { PortfolioDocument } from "@/content/schema";

import { portfolioFixture } from "../../../tests/fixtures/portfolio-document";
import { createTestDatabase } from "../../../tests/support/database";

import {
  insertRevision,
  listRevisions,
  readLatestRevision,
  readRevision,
} from "./revisions";

const renamed = (displayName: string): PortfolioDocument => ({
  ...portfolioFixture,
  profile: { ...portfolioFixture.profile, displayName },
});

describe("revisões publicadas", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(() => {
    db.close();
  });

  it("não existem antes da primeira publicação", () => {
    expect(readLatestRevision(db)).toBeNull();
    expect(listRevisions(db)).toEqual([]);
  });

  it("grava uma revisão e a lê como a mais recente", () => {
    const revision = insertRevision(
      db,
      portfolioFixture,
      "primeira versão",
      new Date("2026-10-24T12:00:00.000Z"),
    );

    expect(revision).toEqual({
      id: 1,
      publishedAt: "2026-10-24T12:00:00.000Z",
      note: "primeira versão",
      document: portfolioFixture,
    });
    expect(readLatestRevision(db)).toEqual(revision);
  });

  it("lê como mais recente a última publicada", () => {
    insertRevision(db, renamed("Primeira"));
    insertRevision(db, renamed("Segunda"));

    expect(readLatestRevision(db)?.document.profile.displayName).toBe(
      "Segunda",
    );
  });

  it("lista da mais recente para a mais antiga, sem os documentos", () => {
    insertRevision(
      db,
      portfolioFixture,
      null,
      new Date("2026-10-24T12:00:00.000Z"),
    );
    insertRevision(
      db,
      portfolioFixture,
      "ajuste",
      new Date("2026-10-25T09:30:00.000Z"),
    );

    expect(listRevisions(db)).toEqual([
      {
        id: 2,
        schemaVersion: 1,
        publishedAt: "2026-10-25T09:30:00.000Z",
        note: "ajuste",
      },
      {
        id: 1,
        schemaVersion: 1,
        publishedAt: "2026-10-24T12:00:00.000Z",
        note: null,
      },
    ]);
    expect(listRevisions(db, 1)).toHaveLength(1);
  });

  it("lê uma revisão pelo id, para restaurar", () => {
    insertRevision(db, renamed("Antiga"));
    insertRevision(db, renamed("Atual"));

    expect(readRevision(db, 1)?.document.profile.displayName).toBe("Antiga");
    expect(readRevision(db, 99)).toBeNull();
  });

  it("não deixa alterar nem apagar uma revisão publicada", () => {
    insertRevision(db, portfolioFixture);

    expect(() =>
      db
        .prepare("UPDATE published_revisions SET note = 'outra' WHERE id = 1")
        .run(),
    ).toThrow(/imutáveis/);
    expect(() =>
      db.prepare("DELETE FROM published_revisions WHERE id = 1").run(),
    ).toThrow(/imutáveis/);
  });

  it("recusa gravar um documento que não é JSON", () => {
    expect(() =>
      db
        .prepare(
          "INSERT INTO published_revisions (schema_version, document, published_at) VALUES (1, 'não é json', '2026-10-24T12:00:00.000Z')",
        )
        .run(),
    ).toThrow(/CHECK constraint failed/);
  });

  it("depois de um rollback, o site lê a última revisão que esta versão entende", () => {
    insertRevision(db, renamed("Compatível"));
    db.prepare(
      "INSERT INTO published_revisions (schema_version, document, published_at) VALUES (2, ?, '2026-10-26T00:00:00.000Z')",
    ).run(JSON.stringify({ ...portfolioFixture, schemaVersion: 2 }));

    expect(readLatestRevision(db)?.document.profile.displayName).toBe(
      "Compatível",
    );
  });
});
