import { describe, expect, it } from "vitest";

import {
  containsMissingTranslation,
  isMissingTranslation,
} from "./translations";

describe("tradução faltando", () => {
  it("é quando só um idioma tem texto", () => {
    expect(isMissingTranslation({ "pt-BR": "Olá", en: "" })).toBe(true);
    expect(isMissingTranslation({ "pt-BR": "", en: " Hi " })).toBe(true);
    expect(isMissingTranslation({ "pt-BR": "Olá", en: "Hi" })).toBe(false);
    expect(isMissingTranslation({ "pt-BR": " ", en: "" })).toBe(false);
  });

  it("procura em qualquer profundidade de um item", () => {
    const item = {
      id: "1",
      name: "Projeto",
      summary: { "pt-BR": "Resumo", en: "Summary" },
      highlights: [{ text: { "pt-BR": "Só em português", en: "" } }],
    };

    expect(containsMissingTranslation(item)).toBe(true);
    expect(
      containsMissingTranslation({
        ...item,
        highlights: [{ text: { "pt-BR": "", en: "" } }],
      }),
    ).toBe(false);
  });
});
