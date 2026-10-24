import "server-only";

import type { DatabaseSync } from "node:sqlite";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

import { getServerEnv } from "@/lib/env";

import { loadMigrations } from "./migrations";
import { openDatabase } from "./open";
import { MIGRATIONS_DIRECTORY } from "./paths";

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
