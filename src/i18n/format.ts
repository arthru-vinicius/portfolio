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

/**
 * Formata só a hora, no idioma pedido e no fuso do site.
 *
 * @param value - O instante, como `Date` ou texto ISO 8601.
 * @param locale - Idioma da formatação.
 * @returns Por exemplo, `09:00` em pt-BR.
 */
export function formatTime(value: Date | string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, {
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));
}

/**
 * Formata a data de hoje como `AAAA-MM-DD`, no fuso do site. Serve para nomear
 * arquivos exportados.
 *
 * @param value - O instante; o padrão é agora.
 * @returns Por exemplo, `2026-10-24`.
 */
export function formatIsoDate(value: Date = new Date()): string {
  // O sueco escreve a data no formato ISO, e o Intl aplica o fuso do site.
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(value);
}
