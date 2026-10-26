import type { LocalizedText } from "./schema";

/** Os idiomas de todo texto do conteúdo. */
const languages = [
  "pt-BR",
  "en",
] as const satisfies readonly (keyof LocalizedText)[];

/**
 * Diz se só um dos idiomas foi preenchido.
 *
 * @param value - O texto nos dois idiomas.
 * @returns `true` quando um idioma tem texto e o outro não.
 */
export function isMissingTranslation(value: LocalizedText): boolean {
  const filled = languages.filter((locale) => value[locale].trim() !== "");
  return filled.length === 1;
}

function isLocalizedText(value: object): value is LocalizedText {
  const keys = Object.keys(value);
  return (
    keys.length === languages.length &&
    languages.every(
      (locale) =>
        typeof (value as Record<string, unknown>)[locale] === "string",
    )
  );
}

/**
 * Procura, em qualquer profundidade, um texto com só um dos idiomas
 * preenchido. Serve para marcar um item inteiro com "Tradução faltando".
 *
 * @param value - Um item, um bloco ou qualquer parte do documento.
 * @returns `true` se algum texto dele tiver só um idioma.
 */
export function containsMissingTranslation(value: unknown): boolean {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (Array.isArray(value)) {
    return value.some(containsMissingTranslation);
  }
  if (isLocalizedText(value)) {
    return isMissingTranslation(value);
  }
  return Object.values(value).some(containsMissingTranslation);
}
