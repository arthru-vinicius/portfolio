import {
  isListBlock,
  listItemsOf,
  type ListBlock,
  type ListItem,
} from "@/content/editing";
import type { FieldIssue } from "@/content/save-result";
import type { Block, PortfolioDocument } from "@/content/schema";
import { adminMessages } from "@/i18n/admin";

import { describeIssuePath } from "./issue-path";

/** Um problema da publicação, descrito para o painel. */
export type DescribedProblem = {
  /** Onde está, como `Experiência › Empresa X › Cargo › em inglês`. */
  where: string;
  message: string;
  /** A tela que corrige o problema. */
  href: string;
};

function blockName(block: Block): string {
  const custom = block.title?.["pt-BR"].trim() ?? "";
  return custom === "" ? adminMessages.blockTypes[block.type] : custom;
}

function itemName(block: ListBlock, item: ListItem): string {
  let name = "";
  if ("company" in item) {
    name = item.company;
  } else if ("degree" in item) {
    name = item.degree["pt-BR"];
  } else if ("issuer" in item) {
    name = item.title["pt-BR"];
  } else if (typeof item.name === "string") {
    name = item.name;
  } else {
    name = item.name["pt-BR"];
  }
  return name.trim() || adminMessages.items[block.type].untitled;
}

function describeIn(
  section: string,
  path: readonly string[],
  href: string,
): Omit<DescribedProblem, "message"> {
  const field = describeIssuePath(path.join("."));
  return { where: field === "" ? section : `${section} › ${field}`, href };
}

/**
 * Descreve um problema da publicação com os nomes que o painel mostra (o
 * bloco, o item e o campo) e aponta a tela que o corrige.
 *
 * @param document - O documento conferido.
 * @param problem - O problema, com o caminho no documento.
 * @returns A descrição e o link.
 */
export function describePublishProblem(
  document: PortfolioDocument,
  problem: FieldIssue,
): DescribedProblem {
  const [section, ...rest] = problem.path.split(".");
  const { message } = problem;
  const { problems } = adminMessages;

  if (section === "profile") {
    return { ...describeIn(problems.profile, rest, "/admin/profile"), message };
  }
  if (section === "resume") {
    return { ...describeIn(problems.resume, rest, "/admin/resume"), message };
  }

  const [position, ...fieldPath] = rest;
  const block = document.blocks[Number(position)];
  if (section !== "blocks" || block === undefined) {
    return { where: problems.blocks, href: "/admin/blocks", message };
  }
  const href = `/admin/blocks/${block.id}`;
  const [listKey, itemPosition, ...itemFieldPath] = fieldPath;
  const item =
    isListBlock(block) && (listKey === "items" || listKey === "groups")
      ? listItemsOf(block)[Number(itemPosition)]
      : undefined;
  if (item === undefined || !isListBlock(block)) {
    return { ...describeIn(blockName(block), fieldPath, href), message };
  }
  return {
    ...describeIn(
      `${blockName(block)} › ${itemName(block, item)}`,
      itemFieldPath,
      href,
    ),
    message,
  };
}
