import type { Locale } from "../config";

import { en } from "./en";
import { ptBR, type Dictionary } from "./pt-BR";

export type { Dictionary } from "./pt-BR";

const dictionaries: Record<Locale, Dictionary> = {
  "pt-BR": ptBR,
  en,
};

/**
 * Devolve os textos fixos da interface de um idioma.
 *
 * @param locale - Idioma desejado.
 * @returns O dicionário do idioma.
 */
export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
