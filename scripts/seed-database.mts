/**
 * Grava o documento fictício no banco local, como rascunho e como revisão
 * publicada, para o desenvolvimento ter conteúdo. O `npm run dev` roda este
 * script antes de subir o servidor.
 *
 * Lê o `DATABASE_PATH` como o `next dev` (inclusive do `.env.local`). Não roda
 * em produção e não mexe num banco que já tem conteúdo, a não ser com
 * `--force`.
 *
 * Uso: `npm run db:seed` ou `npm run db:seed -- --force`.
 */
import nextEnv from "@next/env";

import { readDraft, saveDraft } from "@/lib/db/draft";
import { loadMigrations } from "@/lib/db/migrations";
import { openDatabase } from "@/lib/db/open";
import { LOCAL_DATABASE_PATH, MIGRATIONS_DIRECTORY } from "@/lib/db/paths";
import { insertRevision, readLatestRevision } from "@/lib/db/revisions";

import { portfolioFixture } from "../tests/fixtures/portfolio-document";

nextEnv.loadEnvConfig(process.cwd(), true);

if (process.env.NODE_ENV === "production") {
  console.error(
    "[seed] não roda em produção: o conteúdo real entra pelo painel.",
  );
  process.exit(1);
}

const force = process.argv.includes("--force");
const databasePath = process.env.DATABASE_PATH?.trim() || LOCAL_DATABASE_PATH;

const { db } = openDatabase(databasePath, loadMigrations(MIGRATIONS_DIRECTORY));
try {
  const draft = readDraft(db);
  const hasContent = draft !== null || readLatestRevision(db) !== null;

  if (hasContent && !force) {
    console.info(
      `[seed] ${databasePath} já tem conteúdo; nada mudou (use --force para sobrescrever).`,
    );
  } else {
    saveDraft(db, portfolioFixture, draft?.lockVersion ?? 0);
    const revision = insertRevision(
      db,
      portfolioFixture,
      "Conteúdo fictício para desenvolvimento",
    );
    console.info(
      `[seed] documento fictício gravado em ${databasePath} (rascunho e revisão ${revision.id}).`,
    );
  }
} finally {
  db.close();
}
