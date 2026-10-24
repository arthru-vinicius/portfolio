import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Migration } from "./migrations";

const createNotes: Migration = {
  id: "0001-create-notes",
  sql: "CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL) STRICT;",
};

const globalForDatabase = globalThis as typeof globalThis & {
  portfolioDatabase?: DatabaseSync;
};

let directory: string;

beforeEach(() => {
  directory = mkdtempSync(path.join(tmpdir(), "portfolio-db-"));
});

afterEach(() => {
  globalForDatabase.portfolioDatabase?.close();
  delete globalForDatabase.portfolioDatabase;
  rmSync(directory, { recursive: true, force: true });
});

describe("openDatabase", () => {
  it("cria a pasta, liga o WAL e aplica as migrations", async () => {
    const { openDatabase } = await import("./database");
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

  it("fecha a conexão e repassa o erro quando uma migration falha", async () => {
    const { openDatabase } = await import("./database");
    const close = vi.spyOn(DatabaseSync.prototype, "close");
    const broken: Migration = { id: "0001-broken", sql: "ISTO NÃO É SQL" };

    expect(() =>
      openDatabase(path.join(directory, "portfolio.db"), [broken]),
    ).toThrow();
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe("getDatabase", () => {
  beforeEach(() => {
    // O módulo guarda a configuração validada; cada teste parte de um módulo novo.
    vi.resetModules();
  });

  it("recusa abrir o banco durante o next build", async () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    const { getDatabase } = await import("./database");

    expect(() => getDatabase()).toThrow(/durante o next build/);
  });

  it("fica desligado em produção sem DATABASE_PATH", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_PATH", "");
    const { getDatabase } = await import("./database");

    expect(() => getDatabase()).toThrow(/DATABASE_PATH não definida/);
  });

  it("abre uma vez e reaproveita a conexão", async () => {
    vi.stubEnv("DATABASE_PATH", path.join(directory, "portfolio.db"));
    const { getDatabase } = await import("./database");

    const first = getDatabase();
    expect(getDatabase()).toBe(first);
  });
});
