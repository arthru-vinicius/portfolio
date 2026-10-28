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
    // A faixa da prévia vem depois do site, fixa embaixo: o site continua
    // começando pelo link de pular, como nas páginas públicas.
    <div
      lang={locale}
      className={`site ${jakarta.variable} ${jetbrains.variable} min-h-dvh bg-page pb-24 font-site text-ink`}
    >
      {draft === null ? (
        <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p>{adminMessages.home.draftFromNewerVersion}</p>
        </main>
      ) : (
        <SitePage
          document={toPublicDocument(draft.document)}
          locale={locale}
          ownHost={
            publicOrigin === null ? null : new URL(publicOrigin).hostname
          }
        />
      )}
      <aside
        aria-label={messages.title}
        lang="pt-BR"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-card-2 text-sm shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.4)]"
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
      </aside>
    </div>
  );
}
