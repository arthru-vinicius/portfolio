/**
 * A gramática do subconjunto de Markdown dos textos do painel: parágrafos
 * (separados por linha em branco), listas com `- ` ou `1. `, **negrito**,
 * *itálico*, `código` e [links](https://exemplo.com).
 *
 * Fica aqui, e não no componente, porque o site e o currículo leem os textos
 * do mesmo jeito: o site monta elementos React, e o currículo, texto puro.
 */

/**
 * Os trechos marcados dentro de uma linha. Os grupos, na ordem: código, texto
 * e endereço do link, negrito, itálico com `*` e itálico com `_`.
 *
 * A expressão tem estado (`lastIndex`): cada leitura usa uma cópia própria,
 * `new RegExp(INLINE_PATTERN.source, "g")`.
 */
export const INLINE_PATTERN =
  /(`[^`\n]+`)|\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+?)\*\*|\*([^*\n]+?)\*|(?<!\w)_([^_\n]+?)_(?!\w)/g;

const ALLOWED_PROTOCOLS = new Set(["https:", "http:", "mailto:"]);

/**
 * Confere o endereço de um link do texto. Só passam `https:`, `http:` e
 * `mailto:`; outro esquema, como `javascript:`, deixa só o texto do link.
 *
 * @param url - O endereço escrito no texto.
 * @returns O endereço, ou `null` se ele não for aceito.
 */
export function safeHref(url: string): string | null {
  try {
    return ALLOWED_PROTOCOLS.has(new URL(url).protocol) ? url : null;
  } catch {
    return null;
  }
}

/** Um trecho de um bloco: linhas de parágrafo ou itens de uma lista. */
export type MarkdownRun =
  | { kind: "paragraph"; lines: string[] }
  | { kind: "ul" | "ol"; items: string[] };

const BULLET = /^\s*[-*]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;

/**
 * Separa um texto nos blocos dele, pelas linhas em branco.
 *
 * @param text - O texto, com qualquer tipo de quebra de linha.
 * @returns Os blocos, sem os vazios.
 */
export function splitBlocks(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block !== "");
}

/**
 * Divide um bloco em parágrafos e listas: linhas seguidas do mesmo tipo ficam
 * juntas.
 *
 * @param block - Um bloco de `splitBlocks`.
 * @returns Os trechos, na ordem do texto.
 */
export function toRuns(block: string): MarkdownRun[] {
  const runs: MarkdownRun[] = [];
  for (const line of block.split("\n")) {
    const bullet = BULLET.exec(line);
    const numbered = bullet === null ? NUMBERED.exec(line) : null;
    const kind =
      bullet !== null ? "ul" : numbered !== null ? "ol" : "paragraph";
    const current = runs.at(-1);
    if (kind === "paragraph") {
      if (current?.kind === "paragraph") {
        current.lines.push(line.trim());
      } else {
        runs.push({ kind, lines: [line.trim()] });
      }
      continue;
    }
    const item = (bullet ?? numbered)?.[1] ?? "";
    if (current?.kind === kind) {
      current.items.push(item);
    } else {
      runs.push({ kind, items: [item] });
    }
  }
  return runs;
}
