import { timeZone, type Locale } from "./config";

/**
 * Formata data e hora no idioma pedido e no fuso do site.
 *
 * @param value - O instante, como `Date` ou texto ISO 8601.
 * @param locale - Idioma da formatação.
 * @returns Por exemplo, `24/10/2026, 09:00` em pt-BR.
 */
export function formatDateTime(value: Date | string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}
