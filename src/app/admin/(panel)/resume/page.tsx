import type { Metadata } from "next";

import { cardClass, secondaryButtonClass } from "@/components/admin/styles";
import {
  toPublicDocument,
  type PublicDocument,
} from "@/content/public-projection";
import { adminMessages } from "@/i18n/admin";
import { locales, type Locale } from "@/i18n/config";
import { requireAdmin } from "@/lib/auth/require-admin";
import { resumeFiles } from "@/lib/resume/catalog";
import { RESUME_MAX_PAGES } from "@/lib/resume/pdf";
import { resumePdfPages } from "@/lib/resume/render";

import { draftParts, versionOf } from "../draft-parts";
import { loadEditableDraft } from "../editable-draft";

import { ResumeEditor } from "./resume-editor";

const messages = adminMessages.resume;

export const metadata: Metadata = { title: messages.title };

const languageNames = {
  "pt-BR": messages.portuguese,
  en: messages.english,
} as const;

/** Links dos arquivos de um idioma, gerados do rascunho em `/admin/cv`. */
function DraftFiles({
  locale,
  full,
}: {
  locale: (typeof locales)[number];
  full: boolean;
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {resumeFiles
        .filter((file) => file.locale === locale)
        .map((file) => (
          <li key={file.name}>
            <a
              href={`/admin/cv/${file.name}${full ? "?full=1" : ""}`}
              className={secondaryButtonClass}
            >
              {messages.formats[file.format]}
            </a>
          </li>
        ))}
    </ul>
  );
}

/**
 * Avisa quando nem o PDF mais compacto de um idioma cabe em duas páginas.
 * Para contar as páginas, gera o PDF: a tela leva uns décimos de segundo a
 * mais, só aqui.
 */
async function PageLimitWarning({
  document,
  locale,
}: {
  document: PublicDocument;
  locale: Locale;
}) {
  const pages = await resumePdfPages(document, locale);
  if (pages <= RESUME_MAX_PAGES) {
    return null;
  }
  return <p className="text-sm text-warning">{messages.tooLong(pages)}</p>;
}

/**
 * O que é próprio do currículo, como o resumo profissional, e os arquivos do
 * rascunho para conferir antes de publicar. Avisa quando o PDF de um idioma
 * passa de duas páginas.
 */
export default async function ResumePage() {
  await requireAdmin();
  const draft = loadEditableDraft();
  const hasPhone = draft?.document.profile.private.phone !== undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {messages.heading}
        </h1>
        <p className="text-muted">{messages.intro}</p>
      </div>
      {draft === null ? (
        <p role="alert">{adminMessages.home.draftFromNewerVersion}</p>
      ) : (
        <>
          <ResumeEditor
            resume={draft.document.resume}
            version={versionOf(draftParts.resume(draft.document))}
          />
          <section
            aria-labelledby="curriculo-arquivos"
            className={`${cardClass} flex flex-col gap-4`}
          >
            <div className="flex flex-col gap-1">
              <h2 id="curriculo-arquivos" className="text-lg font-semibold">
                {messages.downloadsHeading}
              </h2>
              <p className="text-muted">{messages.downloadsIntro}</p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              {locales.map((locale) => (
                <div key={locale} className="flex flex-col gap-3">
                  <h3 className="font-semibold">{languageNames[locale]}</h3>
                  <PageLimitWarning
                    document={toPublicDocument(draft.document)}
                    locale={locale}
                  />
                  <div className="flex flex-col gap-1.5">
                    <p className="text-sm text-muted">
                      {messages.publicVersion}
                    </p>
                    <DraftFiles locale={locale} full={false} />
                  </div>
                  {hasPhone && (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-sm text-muted">
                        {messages.fullVersion}
                      </p>
                      <DraftFiles locale={locale} full />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted">
              {hasPhone ? messages.fullVersionHint : messages.noPhone}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
