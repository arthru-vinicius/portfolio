import type { Metadata } from "next";

import type { PublicDocument } from "@/content/public-projection";
import {
  localeHomePath,
  localePaths,
  locales,
  type Locale,
} from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { fillTemplate } from "@/i18n/template";

/** Medidas da imagem de compartilhamento: o tamanho que as redes recomendam. */
export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/** Idioma de cada página no formato do Open Graph (`pt_BR`). */
const OPEN_GRAPH_LOCALES: Readonly<Record<Locale, string>> = {
  "pt-BR": "pt_BR",
  en: "en_US",
};

/**
 * Os endereços da página em cada idioma, para o `hreflang` e o sitemap. A
 * raiz, que leva ao idioma do navegador, é o `x-default`.
 *
 * @param origin - A origem canônica (`PUBLIC_ORIGIN`).
 * @returns O endereço absoluto de cada idioma, mais o `x-default`.
 */
export function localeAlternates(origin: string): Record<string, string> {
  return {
    ...Object.fromEntries(
      locales.map((locale) => [
        locale,
        new URL(localeHomePath(locale), origin).href,
      ]),
    ),
    "x-default": new URL("/", origin).href,
  };
}

/**
 * O caminho da imagem de compartilhamento de um idioma. A revisão vai na URL:
 * depois de publicar, as redes veem um endereço novo e buscam a imagem de novo.
 *
 * @param locale - O idioma.
 * @param revisionId - A revisão publicada.
 * @returns Como `/pt/og.jpg?v=3`.
 */
export function shareImagePath(locale: Locale, revisionId: number): string {
  return `/${localePaths[locale]}/og.jpg?v=${revisionId}`;
}

/**
 * Título, descrição, canônica, `hreflang` e cartão de compartilhamento da
 * página de um idioma, a partir do perfil publicado.
 *
 * Sem `PUBLIC_ORIGIN`, a página não declara canônica nem endereços absolutos:
 * ela não teria de onde tirá-los.
 *
 * @param document - O documento publicado, sem os campos privados.
 * @param locale - O idioma da página.
 * @param options.origin - A origem canônica, ou `null`.
 * @param options.revisionId - A revisão publicada, para a URL da imagem.
 * @returns Os metadados da página.
 */
export function publishedPageMetadata(
  document: PublicDocument,
  locale: Locale,
  options: { origin: string | null; revisionId: number },
): Metadata {
  const dict = getDictionary(locale).metadata;
  const { displayName, headline, location } = document.profile;
  const values = {
    name: displayName,
    headline: headline[locale],
    location: location[locale],
  };
  const title = `${displayName} · ${headline[locale]}`;
  const description = fillTemplate(dict.siteDescription, values);
  const image = {
    url: shareImagePath(locale, options.revisionId),
    ...SHARE_IMAGE_SIZE,
    alt: fillTemplate(dict.imageAlt, values),
  };
  const absolute =
    options.origin === null
      ? {}
      : {
          metadataBase: new URL(options.origin),
          alternates: {
            canonical: localeHomePath(locale),
            languages: localeAlternates(options.origin),
          },
        };

  return {
    title,
    description,
    ...absolute,
    openGraph: {
      type: "profile",
      title,
      description,
      url: localeHomePath(locale),
      siteName: displayName,
      locale: OPEN_GRAPH_LOCALES[locale],
      alternateLocale: locales
        .filter((other) => other !== locale)
        .map((other) => OPEN_GRAPH_LOCALES[other]),
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
