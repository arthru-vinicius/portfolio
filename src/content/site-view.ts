import { isListBlock, listItemsOf, type ListBlock } from "./editing";
import type { PublicDocument } from "./public-projection";
import type { Block, LocalizedText } from "./schema";

function withVisibleItems(block: ListBlock): ListBlock {
  if (block.type === "skills") {
    return { ...block, groups: block.groups.filter((group) => group.visible) };
  }
  // O TypeScript não acompanha o tipo do item pelo `type` num spread genérico.
  return {
    ...block,
    items: listItemsOf(block).filter((item) => item.visible),
  } as ListBlock;
}

/**
 * Os blocos que o site mostra, na ordem do painel: os visíveis, cada um só com
 * os itens visíveis. Um bloco de lista sem nenhum item visível sai também,
 * para o site não ter seção vazia.
 *
 * @param document - O documento publicado, sem os campos privados.
 * @returns Os blocos do site.
 */
export function siteBlocks(document: PublicDocument): Block[] {
  return document.blocks
    .filter((block) => block.visible)
    .map((block) => (isListBlock(block) ? withVisibleItems(block) : block))
    .filter((block) => !isListBlock(block) || listItemsOf(block).length > 0);
}

/**
 * Transforma um título em âncora de URL: minúsculas, sem acento, palavras
 * ligadas por hífen.
 *
 * @param text - O título, como `Outros projetos`.
 * @returns A âncora, como `outros-projetos`; vazia se não sobrar letra.
 */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * O título próprio de um bloco num idioma, se houver.
 *
 * @param title - O título do bloco, nos dois idiomas, ou nada.
 * @param locale - O idioma.
 * @returns O título, ou `null` se o bloco usa o título padrão.
 */
export function customTitle(
  title: LocalizedText | undefined,
  locale: keyof LocalizedText,
): string | null {
  const text = title?.[locale].trim() ?? "";
  return text === "" ? null : text;
}
