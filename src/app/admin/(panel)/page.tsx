import type { Metadata } from "next";

import { cardClass, secondaryButtonClass } from "@/components/admin/styles";
import { adminMessages } from "@/i18n/admin";
import { formatDateTime } from "@/i18n/format";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getDatabase } from "@/lib/db/database";
import { listRevisions } from "@/lib/db/revisions";

import { draftParts, versionOf } from "./draft-parts";
import { loadEditableDraft } from "./editable-draft";
import { ImportForm } from "./import-form";

export const metadata: Metadata = { title: adminMessages.home.title };

const messages = adminMessages.home;

/** Visão geral do conteúdo: o rascunho, a última publicação e a cópia de segurança. */
export default async function AdminHomePage() {
  await requireAdmin();
  const [latest] = listRevisions(getDatabase(), 1);
  // `null` quando o rascunho é de uma versão mais nova do painel.
  const draft = loadEditableDraft();
  const hasDraft = draft === null || draft.updatedAt !== null;
  const hasContent = hasDraft || latest !== undefined;

  let draftText: string = messages.noDraft;
  if (draft === null) {
    draftText = messages.draftFromNewerVersion;
  } else if (draft.updatedAt !== null) {
    draftText = messages.draftSavedAt(formatDateTime(draft.updatedAt, "pt-BR"));
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">
        {messages.heading}
      </h1>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-control p-4">
          <dt className="font-medium">{messages.draft}</dt>
          <dd className="mt-1 text-muted">{draftText}</dd>
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
      {!hasContent && <p>{messages.gettingStarted}</p>}

      <section
        aria-labelledby="backup-heading"
        className={`${cardClass} flex flex-col gap-5`}
      >
        <div className="flex flex-col gap-1">
          <h2 id="backup-heading" className="text-lg font-semibold">
            {adminMessages.backup.heading}
          </h2>
          <p className="text-muted">{adminMessages.backup.description}</p>
        </div>
        {hasContent && (
          <div>
            {/* Download, e não navegação: um link comum, fora do roteador. */}
            <a href="/admin/export" download className={secondaryButtonClass}>
              {adminMessages.backup.export}
            </a>
          </div>
        )}
        {draft !== null && (
          <ImportForm
            version={versionOf(draftParts.document(draft.document))}
            replacesDraft={hasDraft}
          />
        )}
      </section>
    </div>
  );
}
