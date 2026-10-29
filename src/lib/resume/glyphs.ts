/**
 * Os caracteres do subconjunto latino da Inter, a fonte embutida no PDF. É o
 * `latin` do `unicode.json` do `@fontsource/inter`; um teste confere que os
 * dois continuam iguais quando o pacote sobe de versão.
 */
export const INTER_LATIN_UNICODE_RANGE =
  "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";

const ranges = INTER_LATIN_UNICODE_RANGE.split(",").map((range) => {
  const [start = "0", end = start] = range.replace("U+", "").split("-");
  return [parseInt(start, 16), parseInt(end, 16)] as const;
});

function covered(codePoint: number): boolean {
  return ranges.some(([start, end]) => codePoint >= start && codePoint <= end);
}

/** Símbolos comuns fora da fonte e o que escrever no lugar deles. */
const SUBSTITUTES: Readonly<Record<string, string>> = {
  "→": "->",
  "←": "<-",
  "↔": "<->",
  "⇒": "=>",
  "≥": ">=",
  "≤": "<=",
  "≠": "!=",
  "≈": "~",
  "✓": "",
  "✔": "",
};

/**
 * Troca o que a fonte do PDF não tem por um equivalente que ela tem. Sem isso,
 * o caractere sai como um quadrado vazio, no papel e na extração do texto.
 *
 * - símbolos comuns viram texto, como `→` em `->`;
 * - letras com acento fora da fonte perdem o acento, como `ő` em `o`;
 * - o resto (como emoji) sai do texto.
 *
 * @param text - O texto do currículo.
 * @returns O texto só com caracteres da fonte.
 */
export function fitToFont(text: string): string {
  let result = "";
  for (const character of text.normalize("NFC")) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (covered(codePoint)) {
      result += character;
    } else if (character in SUBSTITUTES) {
      result += SUBSTITUTES[character];
    } else {
      const base = character.normalize("NFD").replace(/\p{M}/gu, "");
      if (
        base !== "" &&
        [...base].every((part) => covered(part.codePointAt(0) ?? 0))
      ) {
        result += base;
      }
    }
  }
  return result;
}
