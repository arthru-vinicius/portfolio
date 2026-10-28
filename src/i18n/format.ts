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
 * Formata um mês do conteúdo (`AAAA-MM`), como o início de uma experiência.
 *
 * @param yearMonth - O mês, no formato `AAAA-MM`.
 * @param locale - Idioma da formatação.
 * @returns Por exemplo, `out. de 2025` em pt-BR e `Oct 2025` em inglês.
 */
export function formatYearMonth(yearMonth: string, locale: Locale): string {
  const [year = 0, month = 1] = yearMonth.split("-").map(Number);
  // Meio do mês e em UTC: nenhum fuso leva a data para o mês vizinho.
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 15)));
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
