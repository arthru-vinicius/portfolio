import type { Metadata } from "next";
import Link from "next/link";

import { describePublishProblem } from "@/components/admin/publish-problem";
import {
  cardClass,
  linkClass,
  secondaryButtonClass,
} from "@/components/admin/styles";
import { findPublishProblems } from "@/content/publish-check";
import { adminMessages } from "@/i18n/admin";
import { formatDateTime } from "@/i18n/format";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getDatabase } from "@/lib/db/database";
import { readLatestRevision } from "@/lib/db/revisions";

import { draftParts, versionOf } from "./draft-parts";
import { loadEditableDraft } from "./editable-draft";
import { ImportForm } from "./import-form";
import { PublishForm } from "./publish-form";

export const metadata: Metadata = { title: adminMessages.home.title };

const messages = adminMessages.home;

/** Quantos problemas da publicação a página lista; o resto vira uma contagem. */
const PROBLEMS_SHOWN = 10;

/**
 * Visão geral do conteúdo: o rascunho, a última publicação, o botão de
 * publicar e a cópia de segurança.
 */
export default async function AdminHomePage() {
  await requireAdmin();
  const latest = readLatestRevision(getDatabase());
  // `null` quando o rascunho é de uma versão mais nova do painel.
  const draft = loadEditableDraft();
  const hasDraft = draft === null || draft.updatedAt !== null;
  const hasContent = hasDraft || latest !== null;

  const version =
    draft === null ? null : versionOf(draftParts.document(draft.document));
  const unpublished =
    version !== null &&
    hasContent &&
    (latest === null || versionOf(latest.document) !== version);
  const problems =
    draft !== null && unpublished ? findPublishProblems(draft.document) : [];

  let draftText: string = messages.noDraft;
  if (draft === null) {
    draftText = messages.draftFromNewerVersion;
  } else if (draft.updatedAt !== null) {
    draftText = `${messages.draftSavedAt(formatDateTime(draft.updatedAt, "pt-BR"))} ${unpublished ? messages.draftUnpublished : messages.draftSameAsPublished}`;
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
            {latest === null
              ? messages.nothingPublished
              : messages.publishedAt(
                  latest.id,
                  formatDateTime(latest.publishedAt, "pt-BR"),
                )}
          </dd>
        </div>
      </dl>
      {!hasContent && <p>{messages.gettingStarted}</p>}

      {draft !== null && version !== null && (
        <section
          aria-labelledby="publish-heading"
          className={`${cardClass} flex flex-col gap-5`}
        >
          <div className="flex flex-col gap-1">
            <h2 id="publish-heading" className="text-lg font-semibold">
              {adminMessages.publish.heading}
            </h2>
            <p className="text-muted">{adminMessages.publish.description}</p>
          </div>
          {!unpublished && <p>{adminMessages.publish.nothingToPublish}</p>}
          {problems.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="font-medium">
                {adminMessages.publish.problemsIntro(problems.length)}
              </p>
              <ul className="list-disc space-y-1 pl-5">
                {problems.slice(0, PROBLEMS_SHOWN).map((problem) => {
                  const { where, message, href } = describePublishProblem(
                    draft.document,
                    problem,
                  );
                  return (
                    <li key={problem.path}>
                      <Link href={href} className={linkClass}>
                        {where}
                      </Link>
                      : {message}
                    </li>
                  );
                })}
              </ul>
              {problems.length > PROBLEMS_SHOWN && (
                <p className="text-muted">
                  {adminMessages.publish.moreProblems(
                    problems.length - PROBLEMS_SHOWN,
                  )}
                </p>
              )}
            </div>
          )}
          <PublishForm
            version={version}
            canPublish={unpublished && problems.length === 0}
          />
        </section>
      )}

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
        {draft !== null && version !== null && (
          <ImportForm version={version} replacesDraft={hasDraft} />
        )}
      </section>
    </div>
  );
}
