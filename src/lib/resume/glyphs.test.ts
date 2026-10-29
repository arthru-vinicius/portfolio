import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { INTER_LATIN_UNICODE_RANGE, fitToFont } from "./glyphs";

describe("fitToFont", () => {
  it("usa a mesma faixa de caracteres do arquivo da fonte", () => {
    const unicode = JSON.parse(
      readFileSync("node_modules/@fontsource/inter/unicode.json", "utf8"),
    ) as Record<string, string>;

    expect(INTER_LATIN_UNICODE_RANGE).toBe(unicode.latin);
  });

  it("mantém o português, o travessão, as reticências e as aspas", () => {
    const text = "Ação, informação – coração… “aspas” • ç ã õ é ü";

    expect(fitToFont(text)).toBe(text);
  });

  it("troca os símbolos fora da fonte por texto", () => {
    expect(fitToFont("RTMP → HLS, nota ≥ 9")).toBe("RTMP -> HLS, nota >= 9");
  });

  it("tira o acento que a fonte não tem e o emoji", () => {
    expect(fitToFont("Erdős 🚀 ok")).toBe("Erdos  ok");
  });
});
