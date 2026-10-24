import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Migration } from "./migrations";
import { openDatabase } from "./open";

const createNotes: Migration = {
  id: "0001-create-notes",
  sql: "CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL) STRICT;",
};

describe("openDatabase", () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "portfolio-open-"));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it("cria a pasta, liga o WAL e aplica as migrations", () => {
    const file = path.join(directory, "nested", "portfolio.db");

    const { db, appliedMigrations } = openDatabase(file, [createNotes]);
    try {
      expect(appliedMigrations).toEqual(["0001-create-notes"]);
      expect(db.prepare("PRAGMA journal_mode").get()?.journal_mode).toBe("wal");
      expect(db.prepare("PRAGMA foreign_keys").get()?.foreign_keys).toBe(1);
      expect(db.prepare("PRAGMA busy_timeout").get()?.timeout).toBe(5000);
    } finally {
      db.close();
    }
  });

  it("fecha a conexão e repassa o erro quando uma migration falha", () => {
    const close = vi.spyOn(DatabaseSync.prototype, "close");
    const broken: Migration = { id: "0001-broken", sql: "ISTO NÃO É SQL" };

    expect(() =>
      openDatabase(path.join(directory, "portfolio.db"), [broken]),
    ).toThrow();
    expect(close).toHaveBeenCalledTimes(1);
  });
});
