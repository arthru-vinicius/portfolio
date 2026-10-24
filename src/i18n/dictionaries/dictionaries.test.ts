import { describe, expect, it } from "vitest";

import { locales } from "../config";

import { getDictionary } from ".";

/** Lista as folhas de um dicionário como pares [caminho, texto]. */
function leaves(value: unknown, prefix = ""): [string, unknown][] {
  if (typeof value !== "object" || value === null) {
    return [[prefix, value]];
  }
  return Object.entries(value)
    .flatMap(([key, child]) => leaves(child, prefix ? `${prefix}.${key}` : key))
    .sort(([a], [b]) => a.localeCompare(b));
}

describe("dicionários da interface", () => {
  const referenceKeys = leaves(getDictionary("pt-BR")).map(([key]) => key);

  it.each(locales)("%s tem exatamente as chaves do pt-BR", (locale) => {
    expect(leaves(getDictionary(locale)).map(([key]) => key)).toEqual(
      referenceKeys,
    );
  });

  it.each(locales)("%s não tem texto vazio", (locale) => {
    for (const [key, text] of leaves(getDictionary(locale))) {
      expect(typeof text === "string" && text.trim() !== "", key).toBe(true);
    }
  });
});
