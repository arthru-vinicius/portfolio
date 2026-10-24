import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

import { getServerEnv } from "@/lib/env";

import { loadMigrations, runMigrations, type Migration } from "./migrations";

/** Pasta das migrations SQL. Na imagem, fica em `/app/migrations`, ao lado do `server.js`. */
const MIGRATIONS_DIRECTORY = path.join(process.cwd(), "migrations");

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

// Uma conexão por processo, guardada em globalThis para sobreviver ao
// recarregamento de módulos do `next dev`.
const globalForDatabase = globalThis as typeof globalThis & {
  portfolioDatabase?: DatabaseSync;
};

/**
 * Devolve a conexão do processo. Na primeira chamada, abre o banco de
 * `DATABASE_PATH` e aplica as migrations de `migrations/`.
 *
 * Uma falha não fica guardada: a chamada seguinte tenta abrir de novo. É o que
 * permite ao `/api/health` voltar a responder 200 depois de um problema
 * passageiro.
 *
 * @returns A conexão aberta e migrada.
 * @throws {Error} Durante o `next build`, que não tem banco: uma página que lê
 *   o conteúdo sem `await io()` antes faz o build falhar aqui, em vez de
 *   publicar uma página vazia.
 * @throws {Error} Se `DATABASE_PATH` faltar em produção, ou se o banco não
 *   abrir.
 */
export function getDatabase(): DatabaseSync {
  const existing = globalForDatabase.portfolioDatabase;
  if (existing) {
    return existing;
  }

  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
    throw new Error(
      "O banco foi lido durante o next build, que não tem banco. " +
        "Leia o conteúdo em tempo de requisição: `await io()` antes da " +
        "leitura, dentro de um <Suspense>.",
    );
  }

  const { databasePath } = getServerEnv();
  if (databasePath === null) {
    throw new Error(
      "DATABASE_PATH não definida: em produção, o banco fica desligado sem ela.",
    );
  }

  const { db, appliedMigrations } = openDatabase(
    databasePath,
    loadMigrations(MIGRATIONS_DIRECTORY),
  );
  if (appliedMigrations.length > 0) {
    console.info(`[db] migrations aplicadas: ${appliedMigrations.join(", ")}`);
  }

  globalForDatabase.portfolioDatabase = db;
  return db;
}
