import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { readPublishedContent } from "@/content/read-published";
import { localeHomePath, locales } from "@/i18n/config";
import { getServerEnv } from "@/lib/env";
import { localeAlternates } from "@/lib/seo/metadata";

/**
 * O `sitemap.xml`: a página de cada idioma, com os endereços dos outros
 * (`hreflang`) e a data da última publicação. Sem `PUBLIC_ORIGIN` ou sem nada
 * publicado, sai vazio.
 *
 * @returns As entradas do sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const { publicOrigin } = getServerEnv();
  const content = await readPublishedContent();
  if (publicOrigin === null || content === null) {
    return [];
  }
  const languages = localeAlternates(publicOrigin);
  return locales.map((locale) => ({
    url: new URL(localeHomePath(locale), publicOrigin).href,
    lastModified: content.publishedAt,
    alternates: { languages },
  }));
}
