import { describe, expect, it } from "vitest";

import { portfolioFixture } from "../../tests/fixtures/portfolio-document";

import {
  addableBlockTypes,
  applyBlockList,
  BlockListMismatchError,
  blockTypes,
  collectKeywords,
  createBlock,
  createEmptyDocument,
  createListItem,
  duplicateListItem,
  moveInList,
  replaceBlock,
  summarizeBlock,
} from "./editing";
import {
  blockSchema,
  portfolioDocumentSchema,
  type Block,
  type PortfolioDocument,
} from "./schema";

const copy = (): PortfolioDocument => structuredClone(portfolioFixture);

function blockOfType<T extends Block["type"]>(
  document: PortfolioDocument,
  type: T,
): Extract<Block, { type: T }> {
  const block = document.blocks.find(
    (candidate): candidate is Extract<Block, { type: T }> =>
      candidate.type === type,
  );
  if (block === undefined) {
    throw new Error(`o fixture não tem bloco ${type}`);
  }
  return block;
}

describe("documento e blocos novos", () => {
  it("o documento vazio é válido", () => {
    expect(
      portfolioDocumentSchema.safeParse(createEmptyDocument()).success,
    ).toBe(true);
  });

  it.each(blockTypes)("um bloco %s novo é válido e visível", (type) => {
    const block = createBlock(type);

    expect(blockSchema.safeParse(block).success).toBe(true);
    expect(block).toMatchObject({ type, visible: true });
  });

  it.each([
    "experience",
    "projects",
    "skills",
    "education",
    "awards",
    "languages",
  ] as const)("um item %s novo é válido e fica fora do currículo", (type) => {
    const block = createBlock(type);
    const item = createListItem(type);
    const withItem =
      block.type === "skills"
        ? { ...block, groups: [item] }
        : { ...block, items: [item] };

    expect(blockSchema.safeParse(withItem).success).toBe(true);
    expect(item).toMatchObject({ visible: true, inResume: false });
  });

  it("oferece só os tipos que faltam, e o texto livre sempre", () => {
    expect(addableBlockTypes(["about", "projects", "text"])).toEqual([
      "experience",
      "skills",
      "education",
      "awards",
      "languages",
      "text",
    ]);
  });
});

describe("listas", () => {
  it("move para cima e para baixo, sem sair da lista", () => {
    expect(moveInList(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveInList(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
    expect(moveInList(["a", "b", "c"], 0, -1)).toEqual(["a", "b", "c"]);
    expect(moveInList(["a", "b", "c"], 2, 1)).toEqual(["a", "b", "c"]);
  });

  it("não muda a lista recebida", () => {
    const list = ["a", "b"];
    moveInList(list, 0, 1);

    expect(list).toEqual(["a", "b"]);
  });

  it("a cópia de um item ganha ids novos, inclusive nos destaques", () => {
    const [job] = blockOfType(copy(), "experience").items;
    if (job === undefined) throw new Error("o fixture não tem experiência");

    const duplicate = duplicateListItem(job);

    expect(duplicate.id).not.toBe(job.id);
    expect(duplicate.highlights.map(({ id }) => id)).not.toContain(
      job.highlights[0]?.id,
    );
    expect({ ...duplicate, id: job.id, highlights: [] }).toEqual({
      ...job,
      highlights: [],
    });
  });
});

describe("collectKeywords", () => {
  it("junta tecnologias e habilidades sem repetir, com a primeira grafia", () => {
    const document = copy();
    const projects = blockOfType(document, "projects");
    const [project] = projects.items;
    if (project === undefined) throw new Error("o fixture não tem projeto");
    project.technologies = [...project.technologies, "typescript"];

    const keywords = collectKeywords(document);

    expect(keywords).toContain("TypeScript");
    expect(keywords).not.toContain("typescript");
    expect(keywords).toEqual([...keywords].sort((a, b) => a.localeCompare(b)));
  });
});

describe("applyBlockList", () => {
  it("aplica ordem, visibilidade, blocos novos e removidos", () => {
    const document = copy();
    const [first, second] = document.blocks;
    if (first === undefined || second === undefined) {
      throw new Error("o fixture tem poucos blocos");
    }
    const newId = "6f3c0f6e-8f61-4f0a-9a57-8d2f3c1b2a10";

    const result = applyBlockList(document, [
      { id: second.id, visible: false },
      { id: first.id, visible: true },
      { id: newId, visible: true, newType: "text" },
    ]);

    expect(result.blocks.map(({ id }) => id)).toEqual([
      second.id,
      first.id,
      newId,
    ]);
    expect(result.blocks[0]).toEqual({ ...second, visible: false });
    expect(result.blocks[2]).toMatchObject({ id: newId, type: "text" });
    expect(document.blocks).toHaveLength(portfolioFixture.blocks.length);
  });

  it("recusa id desconhecido, repetido ou bloco novo com id existente", () => {
    const document = copy();
    const [first] = document.blocks;
    if (first === undefined) throw new Error("o fixture não tem blocos");

    for (const entries of [
      [{ id: "6f3c0f6e-8f61-4f0a-9a57-8d2f3c1b2a10", visible: true }],
      [
        { id: first.id, visible: true },
        { id: first.id, visible: false },
      ],
      [{ id: first.id, visible: true, newType: "text" as const }],
    ]) {
      expect(() => applyBlockList(document, entries)).toThrow(
        BlockListMismatchError,
      );
    }
  });
});

describe("replaceBlock", () => {
  it("troca o bloco na mesma posição", () => {
    const document = copy();
    const about = blockOfType(document, "about");
    const index = document.blocks.indexOf(about);

    const result = replaceBlock(document, { ...about, visible: false });

    expect(result.blocks[index]).toEqual({ ...about, visible: false });
  });

  it("recusa um bloco que não existe, ou com outro tipo", () => {
    const document = copy();
    const about = blockOfType(document, "about");

    expect(() =>
      replaceBlock(document, { ...createBlock("about"), visible: true }),
    ).toThrow(BlockListMismatchError);
    expect(() =>
      replaceBlock(document, {
        id: about.id,
        type: "text",
        visible: true,
        title: { "pt-BR": "", en: "" },
        body: { "pt-BR": "", en: "" },
      }),
    ).toThrow(BlockListMismatchError);
  });
});

describe("summarizeBlock", () => {
  it("conta os itens e os visíveis, e ignora o título vazio", () => {
    const document = copy();
    const projects = blockOfType(document, "projects");

    expect(
      summarizeBlock({ ...projects, title: { "pt-BR": "", en: "" } }),
    ).toEqual({
      id: projects.id,
      type: "projects",
      visible: projects.visible,
      title: null,
      itemCount: projects.items.length,
      visibleItemCount: projects.items.filter((item) => item.visible).length,
    });
  });
});
