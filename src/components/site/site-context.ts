import type { LocalizedText } from "@/content/schema";
import type { Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import { formatYearMonth } from "@/i18n/format";
import { fillTemplate } from "@/i18n/template";

/** O que todas as seções do site precisam: o idioma e os textos dele. */
export type SiteContext = {
  locale: Locale;
  dictionary: Dictionary;
  /** O texto do conteúdo no idioma da página. */
  text: (value: LocalizedText) => string;
  /** Um período, como `out. de 2024 — atual`. `end: null` é "atual". */
  period: (start: string, end: string | null) => string;
  /** Um mês do conteúdo, como `out. de 2025`. */
  month: (yearMonth: string) => string;
};

/**
 * Monta o contexto das seções de um idioma.
 *
 * @param locale - O idioma da página.
 * @returns O contexto.
 */
export function createSiteContext(locale: Locale): SiteContext {
  const dictionary = getDictionary(locale);
  const month = (yearMonth: string) => formatYearMonth(yearMonth, locale);
  return {
    locale,
    dictionary,
    text: (value) => value[locale],
    month,
    period: (start, end) =>
      fillTemplate(dictionary.site.period, {
        start: month(start),
        end: end === null ? dictionary.site.present : month(end),
      }),
  };
}
