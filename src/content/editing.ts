import {
  CURRENT_SCHEMA_VERSION,
  type AwardItem,
  type Block,
  type BlockType,
  type EducationItem,
  type ExperienceItem,
  type LanguageItem,
  type LocalizedText,
  type PortfolioDocument,
  type ProjectItem,
  type SkillGroup,
  type SocialLink,
} from "./schema";

/**
 * Funções puras para editar o documento, usadas pelos editores do painel (no
 * navegador) e pelas Server Actions (no servidor). Nenhuma delas muda o que
 * recebe: todas devolvem cópias.
 */

/** Tipos de bloco, na ordem em que o painel os oferece. */
export const blockTypes = [
  "about",
  "experience",
  "projects",
  "skills",
  "education",
  "awards",
  "languages",
  "text",
] as const satisfies readonly BlockType[];

/** Blocos com uma lista de itens. */
export type ListBlock = Extract<
  Block,
  { items: unknown } | { groups: unknown }
>;

/** Tipo de um bloco com lista de itens. */
export type ListBlockType = ListBlock["type"];

/** Um item de qualquer lista de bloco. */
export type ListItem = ListItemOf<ListBlockType>;

/** O item da lista de um tipo de bloco. */
export type ListItemOf<T extends ListBlockType> = {
  experience: ExperienceItem;
  projects: ProjectItem;
  skills: SkillGroup;
  education: EducationItem;
  awards: AwardItem;
  languages: LanguageItem;
}[T];

const listBlockTypes: readonly BlockType[] = [
  "experience",
  "projects",
  "skills",
  "education",
  "awards",
  "languages",
];

/**
 * Diz se o bloco tem uma lista de itens.
 *
 * @param block - Bloco a examinar.
 * @returns `true` para experiência, projetos, habilidades, formação, prêmios e
 *   idiomas.
 */
export function isListBlock(block: Block): block is ListBlock {
  return listBlockTypes.includes(block.type);
}

/**
 * Devolve os itens de um bloco de lista. Habilidades guardam grupos; os outros,
 * itens.
 *
 * @param block - Bloco de lista.
 * @returns A lista, na ordem do site.
 */
export function listItemsOf(block: ListBlock): readonly ListItem[] {
  return block.type === "skills" ? block.groups : block.items;
}

/**
 * Diz se um tipo de bloco pode aparecer mais de uma vez. Só o bloco livre pode.
 *
 * @param type - Tipo de bloco.
 * @returns `true` só para `text`.
 */
export function isRepeatableBlockType(type: BlockType): boolean {
  return type === "text";
}

/**
 * Lista os tipos de bloco que ainda cabem no documento: os que não estão nele,
 * mais o bloco livre, que pode se repetir.
 *
 * @param existing - Tipos dos blocos que o documento já tem.
 * @returns Os tipos, na ordem de `blockTypes`.
 */
export function addableBlockTypes(existing: readonly BlockType[]): BlockType[] {
  return blockTypes.filter(
    (type) => isRepeatableBlockType(type) || !existing.includes(type),
  );
}

/** Texto vazio nos dois idiomas. */
export function emptyText(): LocalizedText {
  return { "pt-BR": "", en: "" };
}

function newId(): string {
  // Disponível no Node 22 e nos navegadores, em contexto seguro (HTTPS ou
  // localhost), que é onde o painel roda.
  return crypto.randomUUID();
}

/**
 * Documento vazio e válido: o ponto de partida do painel quando ainda não há
 * rascunho nem nada publicado.
 */
export function createEmptyDocument(): PortfolioDocument {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    profile: {
      fullName: "",
      displayName: "",
      headline: emptyText(),
      location: emptyText(),
      links: [],
      private: {},
    },
    blocks: [],
    resume: { summary: emptyText() },
  };
}

/**
 * Cria um bloco vazio, visível, com id novo.
 *
 * @param type - Tipo do bloco.
 * @returns O bloco, pronto para entrar no documento.
 */
export function createBlock(type: BlockType): Block {
  const base = { id: newId(), visible: true };
  switch (type) {
    case "about":
      return { ...base, type, body: emptyText() };
    case "text":
      return { ...base, type, title: emptyText(), body: emptyText() };
    case "skills":
      return { ...base, type, groups: [] };
    case "experience":
    case "projects":
    case "education":
    case "awards":
    case "languages":
      return { ...base, type, items: [] };
  }
}

/**
 * Mês atual em `AAAA-MM`, no fuso de quem chama. Serve de valor inicial dos
 * campos de mês.
 */
function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Cria um item vazio para a lista de um tipo de bloco, visível e fora do
 * currículo, com id novo.
 *
 * @param type - Tipo do bloco que recebe o item.
 * @returns O item.
 */
export function createListItem<T extends ListBlockType>(
  type: T,
): ListItemOf<T> {
  const base = { id: newId(), visible: true, inResume: false };
  const items: { [K in ListBlockType]: () => ListItemOf<K> } = {
    experience: () => ({
      ...base,
      company: "",
      role: emptyText(),
      location: emptyText(),
      start: currentMonth(),
      end: null,
      summary: emptyText(),
      highlights: [],
      technologies: [],
    }),
    projects: () => ({
      ...base,
      name: "",
      summary: emptyText(),
      description: emptyText(),
      technologies: [],
    }),
    skills: () => ({ ...base, name: emptyText(), skills: [] }),
    education: () => ({
      ...base,
      degree: emptyText(),
      institution: "",
      location: emptyText(),
      start: currentMonth(),
      end: null,
      expectedEnd: null,
      notes: emptyText(),
    }),
    awards: () => ({
      ...base,
      title: emptyText(),
      issuer: "",
      date: currentMonth(),
      description: emptyText(),
    }),
    languages: () => ({ ...base, name: emptyText(), level: emptyText() }),
  };
  return items[type]();
}

/** Cria um destaque vazio de experiência, fora do currículo. */
export function createHighlight(): ExperienceItem["highlights"][number] {
  return { id: newId(), text: emptyText(), inResume: false };
}

/** Cria um link vazio do perfil. */
export function createSocialLink(): SocialLink {
  return { id: newId(), kind: "linkedin", url: "" };
}

/**
 * Copia um item com ids novos, inclusive os dos destaques, para os ids
 * continuarem únicos no documento.
 *
 * @param item - Item a copiar.
 * @returns A cópia.
 */
export function duplicateListItem<T extends ListItem>(item: T): T {
  const copy = structuredClone(item);
  copy.id = newId();
  // Só as experiências têm destaques, e cada destaque tem id próprio.
  for (const highlight of (copy as Partial<ExperienceItem>).highlights ?? []) {
    highlight.id = newId();
  }
  return copy;
}

/**
 * Move um elemento de uma lista para cima ou para baixo.
 *
 * @param list - Lista original.
 * @param index - Posição do elemento.
 * @param offset - `-1` sobe, `1` desce.
 * @returns Uma cópia com o elemento movido, ou uma cópia igual se o
 *   movimento sairia da lista.
 */
export function moveInList<T>(
  list: readonly T[],
  index: number,
  offset: -1 | 1,
): T[] {
  const copy = [...list];
  const target = index + offset;
  if (
    index < 0 ||
    index >= list.length ||
    target < 0 ||
    target >= list.length
  ) {
    return copy;
  }
  const [moved] = copy.splice(index, 1);
  copy.splice(target, 0, ...(moved === undefined ? [] : [moved]));
  return copy;
}

/**
 * Junta as tecnologias e habilidades já usadas no documento, para sugerir a
 * mesma grafia nos campos de etiqueta (o ATS lê `TypeScript`, e não `TS`).
 *
 * @param document - Documento de onde tirar as etiquetas.
 * @returns As etiquetas sem repetição (sem diferenciar maiúsculas), em ordem
 *   alfabética.
 */
export function collectKeywords(document: PortfolioDocument): string[] {
  const byKey = new Map<string, string>();
  for (const block of document.blocks) {
    if (!isListBlock(block)) {
      continue;
    }
    for (const item of listItemsOf(block)) {
      const keywords =
        "skills" in item
          ? item.skills
          : "technologies" in item
            ? item.technologies
            : [];
      for (const keyword of keywords) {
        const key = keyword.toLowerCase();
        if (!byKey.has(key)) {
          byKey.set(key, keyword);
        }
      }
    }
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

/**
 * O painel pediu para mudar um bloco que não está no documento, ou do jeito
 * errado. Quase sempre é uma página aberta antes de outra aba mudar a lista.
 */
export class BlockListMismatchError extends Error {
  /** @param message - O que não confere. */
  constructor(message: string) {
    super(message);
    this.name = "BlockListMismatchError";
  }
}

/** Resumo de um bloco, para a lista de blocos do painel. */
export type BlockSummary = {
  id: string;
  type: BlockType;
  visible: boolean;
  /** Título próprio do bloco, se houver um preenchido. */
  title: LocalizedText | null;
  itemCount: number;
  visibleItemCount: number;
};

/**
 * Resume um bloco para a lista de blocos do painel.
 *
 * @param block - O bloco.
 * @returns O resumo, sem o conteúdo.
 */
export function summarizeBlock(block: Block): BlockSummary {
  const items = isListBlock(block) ? listItemsOf(block) : [];
  const title =
    block.title !== undefined &&
    (block.title["pt-BR"] !== "" || block.title.en !== "")
      ? block.title
      : null;
  return {
    id: block.id,
    type: block.type,
    visible: block.visible,
    title,
    itemCount: items.length,
    visibleItemCount: items.filter((item) => item.visible).length,
  };
}

/** Uma linha da lista de blocos, como o painel a envia ao salvar. */
export type BlockListEntry =
  | { id: string; visible: boolean }
  | { id: string; visible: boolean; newType: BlockType };

/**
 * Aplica a lista de blocos editada no painel: a ordem, a visibilidade, os
 * blocos novos e os removidos (os que não estão na lista).
 *
 * Os blocos existentes saem do próprio documento, e não do pedido: o painel
 * manda só o id e a mudança.
 *
 * @param document - Documento atual.
 * @param entries - A lista nova, na ordem do site.
 * @returns O documento com a lista nova.
 * @throws {BlockListMismatchError} Se um id não existir no documento, se
 *   aparecer duas vezes ou se um bloco novo usar o id de um existente.
 */
export function applyBlockList(
  document: PortfolioDocument,
  entries: readonly BlockListEntry[],
): PortfolioDocument {
  const current = new Map(document.blocks.map((block) => [block.id, block]));
  const seen = new Set<string>();
  const blocks = entries.map((entry): Block => {
    if (seen.has(entry.id)) {
      throw new BlockListMismatchError(`bloco repetido na lista: ${entry.id}`);
    }
    seen.add(entry.id);
    if ("newType" in entry) {
      if (current.has(entry.id)) {
        throw new BlockListMismatchError(
          `o bloco novo usa o id de um existente: ${entry.id}`,
        );
      }
      return {
        ...createBlock(entry.newType),
        id: entry.id,
        visible: entry.visible,
      };
    }
    const existing = current.get(entry.id);
    if (existing === undefined) {
      throw new BlockListMismatchError(`bloco desconhecido: ${entry.id}`);
    }
    return { ...existing, visible: entry.visible };
  });
  return { ...document, blocks };
}

/**
 * Troca um bloco do documento por outra versão dele, na mesma posição.
 *
 * @param document - Documento atual.
 * @param block - Bloco editado; o id e o tipo precisam ser os de um bloco
 *   existente.
 * @returns O documento com o bloco trocado.
 * @throws {BlockListMismatchError} Se não houver bloco com esse id e esse
 *   tipo.
 */
export function replaceBlock(
  document: PortfolioDocument,
  block: Block,
): PortfolioDocument {
  const index = document.blocks.findIndex(
    (candidate) => candidate.id === block.id && candidate.type === block.type,
  );
  if (index === -1) {
    throw new BlockListMismatchError(`bloco desconhecido: ${block.id}`);
  }
  const blocks = [...document.blocks];
  blocks[index] = block;
  return { ...document, blocks };
}
