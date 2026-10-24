import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";

import { withTransaction } from "./transaction";

/** Uma migration SQL. O `id` é o nome do arquivo sem a extensão e define a ordem. */
export type Migration = {
  id: string;
  sql: string;
};

/** Nome aceito: quatro dígitos, hífen e uma descrição em kebab-case. */
const MIGRATION_FILE_NAME = /^(\d{4})-[a-z0-9]+(?:-[a-z0-9]+)*\.sql$/;

/**
 * Lê as migrations de uma pasta, em ordem.
 *
 * @param directory - Pasta com os arquivos `0001-descricao.sql`. Outros
 *   arquivos (como um README) são ignorados.
 * @returns As migrations ordenadas pelo número.
 * @throws {Error} Se um `.sql` tiver nome fora do padrão ou se dois arquivos
 *   usarem o mesmo número, o que acontece quando duas branches criam
 *   migrations em paralelo.
 */
export function loadMigrations(directory: string): Migration[] {
  const files = readdirSync(directory)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  const seenNumbers = new Map<string, string>();
  return files.map((file) => {
    const number = MIGRATION_FILE_NAME.exec(file)?.[1];
    if (number === undefined) {
      throw new Error(
        `Nome de migration fora do padrão: ${file} (use 0001-descricao.sql)`,
      );
    }
    const previous = seenNumbers.get(number);
    if (previous !== undefined) {
      throw new Error(
        `Duas migrations com o número ${number}: ${previous} e ${file}`,
      );
    }
    seenNumbers.set(number, file);

    return {
      id: file.slice(0, -".sql".length),
      sql: readFileSync(path.join(directory, file), "utf8"),
    };
  });
}

/**
 * Aplica, em ordem, as migrations que ainda não estão no banco. Cada uma roda
 * numa transação própria, junto com o registro em `schema_migrations`.
 *
 * Migrations já aplicadas que esta versão não conhece são ignoradas. É o caso
 * de um rollback do deploy: a imagem anterior sobe contra um banco já migrado
 * pela versão nova. Por isso as migrations só acrescentam.
 *
 * @param db - Conexão aberta.
 * @param migrations - Migrations conhecidas por esta versão, em ordem.
 * @returns Os ids das migrations aplicadas agora, vazio se nada mudou.
 * @throws {Error} Se uma migration já aplicada tiver sido alterada depois
 *   (checksum diferente), ou se o SQL de alguma falhar. Nesse caso a
 *   migration com erro é desfeita, e as anteriores continuam aplicadas.
 */
export function runMigrations(
  db: DatabaseSync,
  migrations: readonly Migration[],
): string[] {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL
    ) STRICT
  `);

  const applied = new Map<string, string>();
  for (const row of db
    .prepare("SELECT id, checksum FROM schema_migrations")
    .all()) {
    applied.set(String(row.id), String(row.checksum));
  }

  const appliedNow: string[] = [];
  for (const migration of migrations) {
    const checksum = checksumOf(migration.sql);
    const appliedChecksum = applied.get(migration.id);

    if (appliedChecksum !== undefined) {
      if (appliedChecksum !== checksum) {
        throw new Error(
          `A migration ${migration.id} mudou depois de aplicada. ` +
            "Migrations aplicadas não se editam: crie uma nova.",
        );
      }
      continue;
    }

    withTransaction(db, () => {
      db.exec(migration.sql);
      db.prepare(
        "INSERT INTO schema_migrations (id, checksum, applied_at) VALUES (?, ?, ?)",
      ).run(migration.id, checksum, new Date().toISOString());
    });
    appliedNow.push(migration.id);
  }
  return appliedNow;
}

/** SHA-256 do SQL, com finais de linha normalizados (o checkout no Windows usa CRLF). */
function checksumOf(sql: string): string {
  return createHash("sha256").update(sql.replace(/\r\n/g, "\n")).digest("hex");
}
