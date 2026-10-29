/** Idiomas do site, na ordem em que aparecem no seletor. */
export const locales = ["pt-BR", "en"] as const;

/** Um idioma suportado pelo site. */
export type Locale = (typeof locales)[number];

/** Idioma usado quando nenhum outro foi escolhido. */
export const defaultLocale: Locale = "pt-BR";

/**
 * Fuso das datas exibidas. O container roda em UTC, então toda formatação de
 * data passa este fuso explicitamente.
 */
export const timeZone = "America/Recife";

/**
 * O primeiro segmento da URL de cada idioma: `/pt` e `/en`. É curto, não
 * depende de maiúsculas e é a URL canônica de cada idioma.
 */
export const localePaths: Readonly<Record<Locale, string>> = {
  "pt-BR": "pt",
  en: "en",
};

/**
 * O endereço da página de um idioma, com a barra no fim: `/pt/`. Assim o link
 * de uma seção fica `/pt/#experiencia`, e não `/pt#experiencia`.
 *
 * @param locale - O idioma.
 * @returns O caminho da página.
 */
export function localeHomePath(locale: Locale): string {
  return `/${localePaths[locale]}/`;
}

/**
 * Diz qual idioma um segmento de URL representa.
 *
 * @param segment - O primeiro segmento do caminho, como `pt`.
 * @returns O idioma, ou `null` se o segmento não for de um idioma do site.
 */
export function localeFromPath(segment: string): Locale | null {
  return locales.find((locale) => localePaths[locale] === segment) ?? null;
}

/**
 * Escolhe o idioma pelo cabeçalho `Accept-Language`, na ordem de preferência
 * do navegador. Só o idioma principal conta: `pt-PT` e `pt` levam ao
 * português, `en-GB`, ao inglês.
 *
 * @param header - O cabeçalho, ou `null` se não veio.
 * @returns O idioma mais preferido que o site tem, ou o padrão.
 */
export function negotiateLocale(header: string | null): Locale {
  const preferences = (header ?? "")
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const quality = params
        .map((param) => /^\s*q=([\d.]+)\s*$/.exec(param)?.[1])
        .find((value) => value !== undefined);
      return {
        language: tag.trim().toLowerCase().split("-")[0] ?? "",
        quality: quality === undefined ? 1 : Number(quality),
        index,
      };
    })
    .filter(({ language, quality }) => language !== "" && quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const { language } of preferences) {
    const match = locales.find(
      (locale) => locale.toLowerCase().split("-")[0] === language,
    );
    if (match !== undefined) {
      return match;
    }
  }
  return defaultLocale;
}
