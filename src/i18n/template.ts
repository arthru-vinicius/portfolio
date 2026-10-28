import type { Locale } from "./config";

/**
 * Preenche um texto do dicionário que traz `{nome}` no lugar de um valor.
 *
 * @param template - O texto, como `previsão: {date}`.
 * @param values - Os valores, pelo nome.
 * @returns O texto preenchido. Um nome sem valor fica como está, para o erro
 *   aparecer na tela e nos testes.
 */
export function fillTemplate(
  template: string,
  values: Readonly<Record<string, string | number>>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/**
 * Escolhe a forma do plural pelo número, com as regras do idioma, e coloca o
 * número no `{n}`.
 *
 * @param forms - As formas `one` (1) e `other` (o resto).
 * @param count - O número.
 * @param locale - O idioma.
 * @returns Por exemplo, `1 projeto` ou `13 projetos`.
 */
export function pluralize(
  forms: { one: string; other: string },
  count: number,
  locale: Locale,
): string {
  const form =
    new Intl.PluralRules(locale).select(count) === "one" ? "one" : "other";
  return fillTemplate(forms[form], { n: count });
}
