import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SitePage } from "@/components/site/site-page";
import { toPublicDocument } from "@/content/public-projection";
import { adminMessages } from "@/i18n/admin";
import { localeFromPath, localePaths } from "@/i18n/config";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getServerEnv } from "@/lib/env";

import { jakarta, jetbrains } from "../../../fonts";
import { loadEditableDraft } from "../../(panel)/editable-draft";

import "../../../site.css";

export const metadata: Metadata = { title: adminMessages.preview.title };

const messages = adminMessages.preview;

const bannerLink =
  "font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/**
 * O rascunho com o design do site, num idioma: os mesmos componentes das
 * páginas públicas, lendo o rascunho em vez da última publicação. Fica fora da
 * moldura do painel, para mostrar a página como o visitante a verá.
 */
export default async function PreviewPage({
  params,
}: PageProps<"/admin/preview/[locale]">) {
  await requireAdmin();
  const locale = localeFromPath((await params).locale);
  if (locale === null) {
    notFound();
  }
  // `null` quando o rascunho é de uma versão mais nova do painel.
  const draft = loadEditableDraft();
  const { publicOrigin } = getServerEnv();
  const other = locale === "en" ? "pt-BR" : "en";

  return (
    <div
      lang={locale}
      className={`site ${jakarta.variable} ${jetbrains.variable} min-h-dvh bg-page font-site text-ink`}
    >
      <div
        role="note"
        lang="pt-BR"
        className="border-b border-line bg-card-2 text-sm"
      >
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
          <p className="mr-auto">{messages.banner}</p>
          <Link
            href={`/admin/preview/${localePaths[other]}`}
            className={bannerLink}
          >
            {other === "en"
              ? messages.switchToEnglish
              : messages.switchToPortuguese}
          </Link>
          <Link href="/admin" className={bannerLink}>
            {messages.back}
          </Link>
        </div>
      </div>
      {draft === null ? (
        <p className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          {adminMessages.home.draftFromNewerVersion}
        </p>
      ) : (
        <SitePage
          document={toPublicDocument(draft.document)}
          locale={locale}
          ownHost={
            publicOrigin === null ? null : new URL(publicOrigin).hostname
          }
        />
      )}
    </div>
  );
}
