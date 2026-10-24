import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { loadMigrations, runMigrations, type Migration } from "./migrations";

const createNotes: Migration = {
  id: "0001-create-notes",
  sql: "CREATE TABLE notes (\n  id INTEGER PRIMARY KEY,\n  body TEXT NOT NULL\n) STRICT;\n",
};
const createTags: Migration = {
  id: "0002-create-tags",
  sql: "CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL) STRICT;",
};

function tableNames(db: DatabaseSync): string[] {
  return db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    )
    .all()
    .map((row) => String(row.name));
}

function appliedIds(db: DatabaseSync): string[] {
  return db
    .prepare("SELECT id FROM schema_migrations ORDER BY id")
    .all()
    .map((row) => String(row.id));
}

describe("loadMigrations", () => {
  let directory: string;

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "portfolio-migrations-"));
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it("lê os arquivos .sql em ordem e ignora os outros", () => {
    writeFileSync(path.join(directory, "0002-create-tags.sql"), createTags.sql);
    writeFileSync(
      path.join(directory, "0001-create-notes.sql"),
      createNotes.sql,
    );
    writeFileSync(path.join(directory, "README.md"), "# Migrations");

    expect(loadMigrations(directory)).toEqual([createNotes, createTags]);
  });

  it("recusa um nome fora do padrão", () => {
    writeFileSync(path.join(directory, "1-notes.sql"), createNotes.sql);

    expect(() => loadMigrations(directory)).toThrow(
      /fora do padrão: 1-notes\.sql/,
    );
  });

  it("recusa dois arquivos com o mesmo número", () => {
    writeFileSync(
      path.join(directory, "0001-create-notes.sql"),
      createNotes.sql,
    );
    writeFileSync(path.join(directory, "0001-create-tags.sql"), createTags.sql);

    expect(() => loadMigrations(directory)).toThrow(
      /Duas migrations com o número 0001/,
    );
  });

  it("aceita a pasta migrations/ do projeto", () => {
    expect(() =>
      loadMigrations(path.join(process.cwd(), "migrations")),
    ).not.toThrow();
  });
});

describe("runMigrations", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
  });

  afterEach(() => {
    db.close();
  });

  it("aplica as pendentes em ordem e registra cada uma", () => {
    expect(runMigrations(db, [createNotes, createTags])).toEqual([
      "0001-create-notes",
      "0002-create-tags",
    ]);
    expect(tableNames(db)).toEqual(["notes", "schema_migrations", "tags"]);
    expect(appliedIds(db)).toEqual(["0001-create-notes", "0002-create-tags"]);
  });

  it("não reaplica o que já está no banco", () => {
    runMigrations(db, [createNotes]);

    expect(runMigrations(db, [createNotes, createTags])).toEqual([
      "0002-create-tags",
    ]);
    expect(runMigrations(db, [createNotes, createTags])).toEqual([]);
  });

  it("aceita um banco migrado por uma versão mais nova, como num rollback do deploy", () => {
    runMigrations(db, [createNotes, createTags]);

    expect(runMigrations(db, [createNotes])).toEqual([]);
  });

  it("recusa uma migration editada depois de aplicada", () => {
    runMigrations(db, [createNotes]);
    const edited: Migration = {
      ...createNotes,
      sql: `${createNotes.sql}CREATE INDEX notes_body ON notes (body);\n`,
    };

    expect(() => runMigrations(db, [edited])).toThrow(
      /0001-create-notes mudou depois de aplicada/,
    );
  });

  it("considera iguais o mesmo arquivo com finais de linha CRLF e LF", () => {
    runMigrations(db, [createNotes]);
    const withCrlf: Migration = {
      ...createNotes,
      sql: createNotes.sql.replace(/\n/g, "\r\n"),
    };

    expect(runMigrations(db, [withCrlf])).toEqual([]);
  });

  it("desfaz a migration que falha e mantém as anteriores", () => {
    const broken: Migration = {
      id: "0002-broken",
      sql: "CREATE TABLE tags (id INTEGER PRIMARY KEY) STRICT; INSERT INTO missing VALUES (1);",
    };

    expect(() => runMigrations(db, [createNotes, broken])).toThrow(/missing/);
    expect(tableNames(db)).toEqual(["notes", "schema_migrations"]);
    expect(appliedIds(db)).toEqual(["0001-create-notes"]);
  });
});
