import type { ResumeLayout, ResumeLine, ResumeLinkRun } from "./layout";

/**
 * Escapa o que o Markdown leria como marcação num texto puro do currículo:
 * os caracteres de ênfase, link e código, e o começo de linha que viraria
 * título, citação ou lista.
 *
 * @param text - O texto puro.
 * @returns O texto, para entrar no Markdown como está.
 */
export function escapeMarkdown(text: string): string {
  return (
    text
      .replace(/[\\`*_[\]<>|]/g, "\\$&")
      .replace(/^(\s*)(#+|>|[-+])(?=\s|$)/, "$1\\$2")
      // Numa lista numerada, quem marca é o ponto: `2024\. Ano`.
      .replace(/^(\s*\d+)([.)])(?=\s|$)/, "$1\\$2")
  );
}

/** O endereço de um link, sem o que fecharia o `(…)` do Markdown. */
const markdownUrl = (url: string) =>
  url.replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29");

function linkRun(link: ResumeLinkRun): string {
  const anchor = `[${escapeMarkdown(link.display)}](${markdownUrl(link.url)})`;
  return link.label === null
    ? anchor
    : `${escapeMarkdown(link.label)}: ${anchor}`;
}

/**
 * Uma linha de texto que veio de uma lista do painel (`• item` ou `1. item`)
 * volta a ser item de lista; o resto é parágrafo.
 */
function textBlock(text: string): { list: boolean; markdown: string } {
  const bullet = /^• (.*)$/.exec(text);
  if (bullet !== null) {
    return { list: true, markdown: `- ${escapeMarkdown(bullet[1] ?? "")}` };
  }
  const numbered = /^(\d+)\. (.*)$/.exec(text);
  if (numbered !== null) {
    return {
      list: true,
      markdown: `${numbered[1]}. ${escapeMarkdown(numbered[2] ?? "")}`,
    };
  }
  return { list: false, markdown: escapeMarkdown(text) };
}

/** Os blocos de uma linha do layout. Itens de lista seguidos ficam juntos. */
function lineBlocks(line: ResumeLine): { list: boolean; markdown: string }[] {
  switch (line.kind) {
    case "item":
      return [
        {
          list: false,
          markdown: `### ${escapeMarkdown(
            line.rest === "" ? line.lead : `${line.lead} ${line.rest}`,
          )}`,
        },
      ];
    case "pair":
      return [
        {
          list: true,
          markdown: `- **${escapeMarkdown(line.lead)}** ${escapeMarkdown(line.rest)}`,
        },
      ];
    case "meta":
    case "text":
      return [textBlock(line.text)];
    case "bullets":
      return line.items.map((item) => ({
        list: true,
        markdown: `- ${escapeMarkdown(item)}`,
      }));
    case "links":
      return [{ list: false, markdown: line.links.map(linkRun).join(" · ") }];
  }
}

/** Junta os blocos: parágrafos com linha em branco, listas sem. */
function joinBlocks(
  blocks: readonly { list: boolean; markdown: string }[],
): string {
  return blocks
    .map((block, index) => {
      const previous = blocks[index - 1];
      const separator =
        previous === undefined
          ? ""
          : previous.list && block.list
            ? "\n"
            : "\n\n";
      return `${separator}${block.markdown}`;
    })
    .join("");
}

/**
 * Escreve o currículo em Markdown: o mesmo texto, na mesma ordem, do PDF e do
 * DOCX (`layoutResume`). Serve a quem lê texto, como um assistente de IA ou
 * uma ferramenta de triagem, sem adivinhar colunas nem fontes.
 *
 * @param layout - O currículo disposto, de `layoutResume`.
 * @param options.portfolio - O link do próprio portfólio, quando se sabe a
 *   origem; entra junto com os outros links.
 * @returns O Markdown, terminado em quebra de linha.
 */
export function renderResumeMarkdown(
  layout: ResumeLayout,
  options: { portfolio?: ResumeLinkRun | null } = {},
): string {
  const links = [
    ...layout.links,
    ...(options.portfolio ? [options.portfolio] : []),
  ];
  const header = [
    `# ${escapeMarkdown(layout.name)}`,
    ...(layout.headline === ""
      ? []
      : [`**${escapeMarkdown(layout.headline)}**`]),
    ...(layout.contact === "" ? [] : [escapeMarkdown(layout.contact)]),
    ...(links.length === 0 ? [] : [links.map(linkRun).join(" · ")]),
  ].join("\n\n");
  const sections = layout.sections.map(
    (section) =>
      `## ${escapeMarkdown(section.title)}\n\n${joinBlocks(section.lines.flatMap(lineBlocks))}`,
  );
  return `${[header, ...sections].join("\n\n")}\n`;
}
