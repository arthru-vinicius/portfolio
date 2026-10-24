/** Idiomas do site, na ordem em que aparecem no seletor. */
export const locales = ["pt-BR", "en"] as const;

/** Um idioma suportado pelo site. */
export type Locale = (typeof locales)[number];

/** Idioma usado quando nenhum outro foi escolhido. */
export const defaultLocale: Locale = "pt-BR";
