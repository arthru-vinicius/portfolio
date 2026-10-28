import type { Metadata } from "next";
import { io } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SitePage } from "@/components/site/site-page";
import { readPublishedContent } from "@/content/read-published";
import {
  localeFromPath,
  localePaths,
  locales,
  type Locale,
} from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { fillTemplate } from "@/i18n/template";
import { getServerEnv } from "@/lib/env";

async function localeOf(
  params: PageProps<"/[locale]">["params"],
): Promise<Locale> {
  const locale = localeFromPath((await params).locale);
  if (locale === null) {
    notFound();
  }
  return locale;
}

/**
 * Título e descrição da página, a partir do perfil publicado. Sem nada
 * publicado, os da página em construção.
 */
export async function generateMetadata({
  params,
}: PageProps<"/[locale]">): Promise<Metadata> {
  const locale = await localeOf(params);
  const dict = getDictionary(locale);
  await io();
  const content = await readPublishedContent();
  if (content === null) {
    return {
      title: dict.metadata.title,
      description: dict.metadata.description,
    };
  }
  const { displayName, headline, location } = content.document.profile;
  return {
    title: `${displayName} · ${headline[locale]}`,
    description: fillTemplate(dict.metadata.siteDescription, {
      name: displayName,
      headline: headline[locale],
      location: location[locale],
    }),
  };
}

function Placeholder({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const other = locales.find((candidate) => candidate !== locale) ?? locale;
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
        {dict.placeholder.title}
      </h1>
      <p className="text-lg text-ink-muted">{dict.placeholder.body}</p>
      <p>
        <a
          href={`/${localePaths[other]}`}
          hrefLang={other}
          lang={other}
          className="font-semibold text-accent underline-offset-4 hover:underline"
        >
          {dict.language.switchTo}
        </a>
      </p>
    </main>
  );
}

async function PublishedSite({ locale }: { locale: Locale }) {
  // O conteúdo vem do banco, que o build não tem: daqui para baixo, tudo é
  // do pedido. A leitura em si fica em cache até a próxima publicação.
  await io();
  const content = await readPublishedContent();
  if (content === null) {
    return <Placeholder locale={locale} />;
  }
  const { publicOrigin } = getServerEnv();
  return (
    <SitePage
      document={content.document}
      locale={locale}
      ownHost={publicOrigin === null ? null : new URL(publicOrigin).hostname}
    />
  );
}

/** A página do site num idioma: o perfil e os blocos visíveis, na ordem do painel. */
export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const locale = await localeOf(params);
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <PublishedSite locale={locale} />
    </Suspense>
  );
}
