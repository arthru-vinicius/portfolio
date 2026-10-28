import type { Metadata } from "next";

import {
  badgeClass,
  cardClass,
  secondaryButtonClass,
} from "@/components/admin/styles";
import { CURRENT_SCHEMA_VERSION } from "@/content/schema";
import { adminMessages } from "@/i18n/admin";
import { formatDateTime } from "@/i18n/format";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getDatabase } from "@/lib/db/database";
import { listRevisions } from "@/lib/db/revisions";

import { draftParts, versionOf } from "../draft-parts";
import { loadEditableDraft } from "../editable-draft";

import { RestoreButton } from "./restore-button";

export const metadata: Metadata = { title: adminMessages.history.title };

const messages = adminMessages.history;

/** Quantas publicações a página lista, das mais recentes. */
const HISTORY_LIMIT = 50;

/** Revisões publicadas, da mais recente para a mais antiga, com a restauração. */
export default async function HistoryPage() {
  await requireAdmin();
  const revisions = listRevisions(getDatabase(), HISTORY_LIMIT);
  // `null` quando o rascunho é de uma versão mais nova do painel: aí não há
  // como restaurar por cima dele.
  const draft = loadEditableDraft();
  const version =
    draft === null ? null : versionOf(draftParts.document(draft.document));
  const replacesDraft = draft === null || draft.updatedAt !== null;
  // O site mostra a revisão mais recente que esta versão do código sabe ler.
  const live = revisions.find(
    (revision) => revision.schemaVersion <= CURRENT_SCHEMA_VERSION,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {messages.heading}
        </h1>
        <p className="text-muted">{messages.intro}</p>
      </div>
      {revisions.length === 0 ? (
        <p>{messages.empty}</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {revisions.map((revision) => {
            const readable = revision.schemaVersion <= CURRENT_SCHEMA_VERSION;
            return (
              <li
                key={revision.id}
                className={`${cardClass} flex flex-col gap-3`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">
                    {messages.revision(revision.id)}
                  </h2>
                  {revision.id === live?.id && (
                    <span
                      className={`${badgeClass} border-success text-success`}
                    >
                      {messages.live}
                    </span>
                  )}
                </div>
                <p className="text-muted">
                  {messages.publishedAt(
                    formatDateTime(revision.publishedAt, "pt-BR"),
                  )}
                </p>
                {revision.note !== null && <p>{revision.note}</p>}
                {readable ? (
                  <div className="flex flex-wrap items-start gap-3">
                    {/* Download, e não navegação: um link comum, fora do roteador. */}
                    <a
                      href={`/admin/export?revision=${revision.id}`}
                      download
                      aria-label={messages.downloadLabel(revision.id)}
                      className={secondaryButtonClass}
                    >
                      {messages.download}
                    </a>
                    {version !== null && (
                      <RestoreButton
                        revisionId={revision.id}
                        version={version}
                        replacesDraft={replacesDraft}
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-muted">{messages.newerVersion}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
      {revisions.length === HISTORY_LIMIT && (
        <p className="text-muted">{messages.limit(HISTORY_LIMIT)}</p>
      )}
    </div>
  );
}
