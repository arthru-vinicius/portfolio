import { describe, expect, it } from "vitest";

import { portfolioFixture } from "../../tests/fixtures/portfolio-document";

import { createBlock, createEmptyDocument, createListItem } from "./editing";
import { findPublishProblems } from "./publish-check";
import type { Block, PortfolioDocument } from "./schema";

function copy(): PortfolioDocument {
  return structuredClone(portfolioFixture);
}

function blockOfType<T extends Block["type"]>(
  document: PortfolioDocument,
  type: T,
): { block: Extract<Block, { type: T }>; index: number } {
  const index = document.blocks.findIndex((block) => block.type === type);
  const block = document.blocks[index] as
    Extract<Block, { type: T }> | undefined;
  if (block === undefined) {
    throw new Error(`o fixture não tem bloco ${type}`);
  }
  return { block, index };
}

describe("findPublishProblems", () => {
  it("aceita o documento completo nos dois idiomas", () => {
    expect(findPublishProblems(portfolioFixture)).toEqual([]);
  });

  it("aponta o texto com um idioma só, pelo idioma que falta", () => {
    const document = copy();
    document.profile.headline.en = "";
    const { block, index } = blockOfType(document, "experience");
    const [job] = block.items;
    if (job === undefined) throw new Error("o fixture não tem experiência");
    job.summary["pt-BR"] = "  ";

    expect(findPublishProblems(document)).toEqual([
      { path: "profile.headline.en", message: "falta a tradução" },
      {
        path: `blocks.${index}.items.0.summary.pt-BR`,
        message: "falta a tradução",
      },
    ]);
  });

  it("exige os campos sem os quais o item não faz sentido", () => {
    const document = copy();
    document.profile.fullName = "";
    const { block, index } = blockOfType(document, "experience");
    const [job] = block.items;
    if (job === undefined) throw new Error("o fixture não tem experiência");
    job.role = { "pt-BR": "", en: "" };
    const [highlight] = job.highlights;
    if (highlight === undefined) throw new Error("o fixture não tem destaque");
    highlight.text = { "pt-BR": "", en: "" };

    expect(findPublishProblems(document)).toEqual([
      { path: "profile.fullName", message: "preencha este campo" },
      {
        path: `blocks.${index}.items.0.role`,
        message: "preencha em português e em inglês",
      },
      {
        path: `blocks.${index}.items.0.highlights.0.text`,
        message: "preencha em português e em inglês",
      },
    ]);
  });

  it("aceita campo opcional vazio nos dois idiomas", () => {
    const document = copy();
    const { block } = blockOfType(document, "projects");
    const [project] = block.items;
    if (project === undefined) throw new Error("o fixture não tem projeto");
    project.description = { "pt-BR": "", en: "" };

    expect(findPublishProblems(document)).toEqual([]);
  });

  it("ignora o que fica oculto, menos o item marcado para o currículo", () => {
    const document = copy();
    const { block, index } = blockOfType(document, "projects");
    const hiddenOnly = { ...createListItem("projects"), visible: false };
    const inResume = {
      ...createListItem("projects"),
      visible: false,
      inResume: true,
    };
    block.items.push(hiddenOnly, inResume);
    const position = block.items.length - 1;

    expect(findPublishProblems(document)).toEqual([
      {
        path: `blocks.${index}.items.${position}.name`,
        message: "preencha este campo",
      },
      {
        path: `blocks.${index}.items.${position}.summary`,
        message: "preencha em português e em inglês",
      },
    ]);

    const about = blockOfType(document, "about");
    about.block.visible = false;
    about.block.body = { "pt-BR": "só em português", en: "" };
    expect(findPublishProblems(document)).toHaveLength(2);
  });

  it("pede ao menos uma habilidade no grupo e o texto do bloco livre", () => {
    const document = copy();
    const { block, index } = blockOfType(document, "skills");
    const [group] = block.groups;
    if (group === undefined) throw new Error("o fixture não tem grupo");
    group.skills = [];
    document.blocks.push(createBlock("text"));

    expect(findPublishProblems(document)).toEqual([
      {
        path: `blocks.${index}.groups.0.skills`,
        message: "adicione ao menos uma habilidade",
      },
      {
        path: `blocks.${document.blocks.length - 1}.title`,
        message: "preencha em português e em inglês",
      },
      {
        path: `blocks.${document.blocks.length - 1}.body`,
        message: "preencha em português e em inglês",
      },
    ]);
  });

  it("não publica um site sem bloco visível", () => {
    const document = {
      ...createEmptyDocument(),
      profile: copy().profile,
    };

    expect(findPublishProblems(document)).toEqual([
      { path: "blocks", message: "deixe ao menos um bloco visível" },
    ]);
  });
});
