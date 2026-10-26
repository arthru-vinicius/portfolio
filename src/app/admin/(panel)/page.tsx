import type { Metadata } from "next";
import type { DatabaseSync } from "node:sqlite";

import { NewerDocumentVersionError } from "@/content/migrations";
import { adminMessages } from "@/i18n/admin";
import { formatDateTime } from "@/i18n/format";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getDatabase } from "@/lib/db/database";
import { readDraft } from "@/lib/db/draft";
import { listRevisions } from "@/lib/db/revisions";

export const metadata: Metadata = { title: adminMessages.home.title };

const messages = adminMessages.home;

function describeDraft(db: DatabaseSync): string {
  try {
    const draft = readDraft(db);
    return draft === null
      ? messages.noDraft
      : messages.draftSavedAt(formatDateTime(draft.updatedAt, "pt-BR"));
  } catch (error) {
    // Depois de um rollback do deploy, o rascunho pode ser de uma versão do
    // schema que este código não conhece. Ele fica intacto no banco.
    if (error instanceof NewerDocumentVersionError) {
      return messages.draftFromNewerVersion;
    }
    throw error;
  }
}

/** Visão geral do conteúdo: o rascunho e a última publicação. */
export default async function AdminHomePage() {
  await requireAdmin();
  const db = getDatabase();
  const [latest] = listRevisions(db, 1);

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        {messages.heading}
      </h1>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-control p-4">
          <dt className="font-medium">{messages.draft}</dt>
          <dd className="mt-1 text-muted">{describeDraft(db)}</dd>
        </div>
        <div className="rounded-lg border border-control p-4">
          <dt className="font-medium">{messages.published}</dt>
          <dd className="mt-1 text-muted">
            {latest === undefined
              ? messages.nothingPublished
              : messages.publishedAt(
                  latest.id,
                  formatDateTime(latest.publishedAt, "pt-BR"),
                )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
