import {
  INLINE_PATTERN,
  safeHref,
  splitBlocks,
  toRuns,
} from "@/content/markdown-syntax";

/**
 * O endereço como ele aparece escrito no currículo: sem `https://`, sem
 * `mailto:` e sem a barra do fim, como `linkedin.com/in/ana`.
 *
 * @param url - O endereço completo.
 * @returns O endereço para ler.
 */
export function displayUrl(url: string): string {
  return url
    .replace(/^https?:\/\//i, "")
    .replace(/^mailto:/i, "")
    .replace(/\/$/, "");
}

function inlineToText(text: string): string {
  const pattern = new RegExp(INLINE_PATTERN.source, "g");
  return text.replace(
    pattern,
    (
      whole: string,
      code: string | undefined,
      linkText: string | undefined,
      linkUrl: string | undefined,
      bold: string | undefined,
      italic: string | undefined,
      underscored: string | undefined,
    ) => {
      if (code !== undefined) {
        return code.slice(1, -1);
      }
      if (linkText !== undefined && linkUrl !== undefined) {
        const label = inlineToText(linkText);
        const href = safeHref(linkUrl);
        if (href === null) {
          return label;
        }
        // O ATS costuma descartar o link: o endereço fica escrito no texto.
        const shown = displayUrl(href);
        return label === shown || label === href
          ? shown
          : `${label} (${shown})`;
      }
      return inlineToText(bold ?? italic ?? underscored ?? whole);
    },
  );
}

/**
 * Converte um texto do painel, no subconjunto de Markdown do site, em linhas de
 * texto puro para o currículo:
 *
 * - cada parágrafo vira uma linha;
 * - cada item de lista vira uma linha começando por `• `, ou pelo número
 *   numa lista numerada;
 * - a marcação some, e o link vira `texto (endereço)`, com o endereço visível.
 *
 * @param text - O texto em Markdown.
 * @returns As linhas, sem as vazias.
 */
export function markdownToLines(text: string): string[] {
  return splitBlocks(text).flatMap((block) =>
    toRuns(block).flatMap((run) =>
      run.kind === "paragraph"
        ? [inlineToText(run.lines.join(" "))]
        : run.items.map(
            (item, index) =>
              `${run.kind === "ol" ? `${index + 1}.` : "•"} ${inlineToText(item)}`,
          ),
    ),
  );
}
