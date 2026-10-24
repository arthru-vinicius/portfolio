import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const globalForDatabase = globalThis as typeof globalThis & {
  portfolioDatabase?: DatabaseSync;
};

describe("getDatabase", () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "portfolio-db-"));
    // O módulo guarda a configuração validada; cada teste parte de um módulo novo.
    vi.resetModules();
  });

  afterEach(() => {
    globalForDatabase.portfolioDatabase?.close();
    delete globalForDatabase.portfolioDatabase;
    rmSync(directory, { recursive: true, force: true });
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

  it("abre uma vez, aplica as migrations do projeto e reaproveita a conexão", async () => {
    vi.stubEnv("DATABASE_PATH", path.join(directory, "portfolio.db"));
    const { getDatabase } = await import("./database");

    const first = getDatabase();
    const tables = first
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((row) => String(row.name));

    expect(tables).toEqual(
      expect.arrayContaining(["draft", "published_revisions"]),
    );
    expect(getDatabase()).toBe(first);
  });
});
