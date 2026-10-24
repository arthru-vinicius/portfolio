import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { runMigrations, type Migration } from "./migrations";

/** Banco aberto e configurado, com as migrations que esta abertura aplicou. */
export type OpenedDatabase = {
  db: DatabaseSync;
  appliedMigrations: string[];
};

/**
 * Abre um banco SQLite, liga o WAL e aplica as migrations pendentes.
 *
 * @param filePath - Arquivo do banco, ou `":memory:"` nos testes. A pasta é
 *   criada se não existir.
 * @param migrations - Migrations conhecidas por esta versão, em ordem.
 * @returns A conexão pronta e os ids das migrations aplicadas agora.
 * @throws {Error} Se o arquivo não abrir, se o WAL não puder ser ligado ou se
 *   uma migration falhar. A conexão é fechada antes de o erro subir.
 */
export function openDatabase(
  filePath: string,
  migrations: readonly Migration[],
): OpenedDatabase {
  const inMemory = filePath === ":memory:";
  if (!inMemory) {
    mkdirSync(path.dirname(filePath), { recursive: true });
  }

  const db = new DatabaseSync(filePath);
  try {
    // WAL deixa o site ler enquanto o painel grava, sem um bloquear o outro.
    const mode = db.prepare("PRAGMA journal_mode = WAL").get()?.journal_mode;
    if (!inMemory && mode !== "wal") {
      throw new Error(
        `O SQLite não ligou o WAL em ${filePath} (journal_mode = ${String(mode)})`,
      );
    }
    db.exec("PRAGMA busy_timeout = 5000");
    db.exec("PRAGMA foreign_keys = ON");

    const appliedMigrations = runMigrations(db, migrations);
    return { db, appliedMigrations };
  } catch (error) {
    db.close();
    throw error;
  }
}
