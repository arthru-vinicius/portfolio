import { describe, expect, it } from "vitest";

import {
  localeFromPath,
  localePaths,
  locales,
  negotiateLocale,
} from "./config";

describe("caminhos dos idiomas", () => {
  it("leva cada idioma a um segmento curto e volta", () => {
    expect(localePaths).toEqual({ "pt-BR": "pt", en: "en" });
    for (const locale of locales) {
      expect(localeFromPath(localePaths[locale])).toBe(locale);
    }
  });

  it("não reconhece outro segmento, nem o nome completo do idioma", () => {
    for (const segment of ["pt-BR", "PT", "es", "", "admin"]) {
      expect(localeFromPath(segment)).toBeNull();
    }
  });
});

describe("negotiateLocale", () => {
  it("segue a ordem de preferência do navegador", () => {
    expect(negotiateLocale("en-US,en;q=0.9,pt-BR;q=0.8")).toBe("en");
    expect(negotiateLocale("pt-BR,pt;q=0.9,en;q=0.8")).toBe("pt-BR");
  });

  it("respeita o peso q, mesmo fora de ordem", () => {
    expect(negotiateLocale("pt;q=0.4, en;q=0.9")).toBe("en");
    expect(negotiateLocale("en;q=0, pt")).toBe("pt-BR");
  });

  it("aceita variantes regionais e pula idiomas que o site não tem", () => {
    expect(negotiateLocale("fr-FR, en-GB;q=0.7")).toBe("en");
    expect(negotiateLocale("pt-PT")).toBe("pt-BR");
  });

  it("usa o português sem cabeçalho ou sem idioma conhecido", () => {
    expect(negotiateLocale(null)).toBe("pt-BR");
    expect(negotiateLocale("")).toBe("pt-BR");
    expect(negotiateLocale("*")).toBe("pt-BR");
    expect(negotiateLocale("de, ja;q=0.5")).toBe("pt-BR");
  });
});
