import {
  isListBlock,
  listItemsOf,
  type ListBlockType,
  type ListItem,
} from "./editing";
import type { FieldIssue } from "./save-result";
import type { Block, LocalizedText, PortfolioDocument } from "./schema";
import { isLocalizedText, languages } from "./translations";

type Path = readonly (string | number)[];

// As mensagens aparecem no painel, ao lado do lugar do problema.
const messages = {
  missingTranslation: "falta a tradução",
  emptyLocalized: "preencha em português e em inglês",
  empty: "preencha este campo",
  noSkills: "adicione ao menos uma habilidade",
  nothingVisible: "deixe ao menos um bloco visível",
} as const;

/** Os campos sem os quais um item não pode ir ao ar, por tipo de bloco. */
const requiredFields: Readonly<Record<ListBlockType, readonly string[]>> = {
  experience: ["company", "role"],
  projects: ["name", "summary"],
  skills: ["name"],
  education: ["degree", "institution"],
  awards: ["title", "issuer"],
  languages: ["name", "level"],
};

function isBlank(value: string): boolean {
  return value.trim() === "";
}

class Checker {
  readonly problems: FieldIssue[] = [];

  report(path: Path, message: string): void {
    this.problems.push({ path: path.join("."), message });
  }

  /** Todo texto da parte tem os dois idiomas, ou nenhum. */
  translations(value: unknown, path: Path): void {
    if (typeof value !== "object" || value === null) {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((child, index) =>
        this.translations(child, [...path, index]),
      );
      return;
    }
    if (isLocalizedText(value)) {
      const missing = languages.filter((locale) => isBlank(value[locale]));
      const [locale] = missing;
      if (missing.length === 1 && locale !== undefined) {
        this.report([...path, locale], messages.missingTranslation);
      }
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      this.translations(child, [...path, key]);
    }
  }

  /**
   * Um campo obrigatório preenchido. O texto com só um idioma já é apontado
   * por `translations`; aqui fica o que está vazio de todo.
   */
  required(value: string | LocalizedText, path: Path): void {
    if (typeof value === "string") {
      if (isBlank(value)) {
        this.report(path, messages.empty);
      }
    } else if (languages.every((locale) => isBlank(value[locale]))) {
      this.report(path, messages.emptyLocalized);
    }
  }

  item(type: ListBlockType, item: ListItem, path: Path): void {
    this.translations(item, path);
    const fields = item as unknown as Record<string, string | LocalizedText>;
    for (const field of requiredFields[type]) {
      const value = fields[field];
      if (value !== undefined) {
        this.required(value, [...path, field]);
      }
    }
    if ("skills" in item && item.skills.length === 0) {
      this.report([...path, "skills"], messages.noSkills);
    }
    if ("highlights" in item) {
      item.highlights.forEach((highlight, index) =>
        this.required(highlight.text, [...path, "highlights", index, "text"]),
      );
    }
  }

  block(block: Block, path: Path): void {
    if (block.title !== undefined) {
      this.translations(block.title, [...path, "title"]);
    }
    if (block.type === "about") {
      this.translations(block.body, [...path, "body"]);
      this.required(block.body, [...path, "body"]);
    }
    if (block.type === "text") {
      this.translations(block, path);
      this.required(block.title, [...path, "title"]);
      this.required(block.body, [...path, "body"]);
    }
  }
}

/**
 * Confere se o documento pode ir ao ar. O rascunho aceita campos vazios e
 * textos num idioma só; a publicação, não:
 *
 * - todo texto que aparece no site ou no currículo tem os dois idiomas, ou
 *   nenhum;
 * - perfil, blocos e itens têm os campos sem os quais não fazem sentido, como
 *   o cargo de uma experiência;
 * - ao menos um bloco está visível.
 *
 * Bloco oculto e item oculto ficam de fora, menos o item marcado para o
 * currículo, que entra nele mesmo oculto no site.
 *
 * @param document - O documento a publicar.
 * @returns Os problemas, com o caminho no documento; vazio se pode publicar.
 */
export function findPublishProblems(document: PortfolioDocument): FieldIssue[] {
  const check = new Checker();
  const { profile } = document;

  check.translations(
    { headline: profile.headline, location: profile.location },
    ["profile"],
  );
  check.required(profile.fullName, ["profile", "fullName"]);
  check.required(profile.displayName, ["profile", "displayName"]);
  check.required(profile.headline, ["profile", "headline"]);
  check.translations(document.resume, ["resume"]);

  document.blocks.forEach((block, blockIndex) => {
    const path = ["blocks", blockIndex];
    if (block.visible) {
      check.block(block, path);
    }
    if (!isListBlock(block)) {
      return;
    }
    const listKey = block.type === "skills" ? "groups" : "items";
    listItemsOf(block).forEach((item, index) => {
      if ((block.visible && item.visible) || item.inResume) {
        check.item(block.type, item, [...path, listKey, index]);
      }
    });
  });

  if (!document.blocks.some((block) => block.visible)) {
    check.report(["blocks"], messages.nothingVisible);
  }
  return check.problems;
}
