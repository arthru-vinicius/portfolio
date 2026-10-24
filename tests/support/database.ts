import type { DatabaseSync } from "node:sqlite";

import { loadMigrations } from "@/lib/db/migrations";
import { openDatabase } from "@/lib/db/open";
import { MIGRATIONS_DIRECTORY } from "@/lib/db/paths";

/**
 * Abre um banco em memória com as migrations reais do projeto, para os testes
 * da camada de dados. Quem chama fecha a conexão.
 */
export function createTestDatabase(): DatabaseSync {
  return openDatabase(":memory:", loadMigrations(MIGRATIONS_DIRECTORY)).db;
}
