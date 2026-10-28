import { describe, expect, it } from "vitest";

import { portfolioFixture } from "../../tests/fixtures/portfolio-document";

import { isListBlock, listItemsOf } from "./editing";
import { toPublicDocument } from "./public-projection";
import { customTitle, siteBlocks, slugify } from "./site-view";

function publicCopy() {
  return toPublicDocument(structuredClone(portfolioFixture));
}

describe("siteBlocks", () => {
  it("mostra só os blocos e os itens visíveis, na ordem do painel", () => {
    const document = publicCopy();
    const hiddenItems = document.blocks
      .filter(isListBlock)
      .flatMap((block) => listItemsOf(block))
      .filter((item) => !item.visible);
    expect(hiddenItems.length).toBeGreaterThan(0);

    const blocks = siteBlocks(document);

    expect(blocks.map((block) => block.id)).toEqual(
      document.blocks.filter((block) => block.visible).map((block) => block.id),
    );
    const shown = blocks
      .filter(isListBlock)
      .flatMap((block) => listItemsOf(block));
    expect(shown.every((item) => item.visible)).toBe(true);
    expect(shown.some((item) => hiddenItems.includes(item))).toBe(false);
  });

  it("tira o bloco oculto e o bloco de lista que ficou sem itens", () => {
    const document = publicCopy();
    const [first, second] = document.blocks.filter(isListBlock);
    if (first === undefined || second === undefined) {
      throw new Error("o fixture tem blocos de lista");
    }
    first.visible = false;
    for (const item of listItemsOf(second)) {
      item.visible = false;
    }

    const ids = siteBlocks(document).map((block) => block.id);

    expect(ids).not.toContain(first.id);
    expect(ids).not.toContain(second.id);
  });
});

describe("slugify", () => {
  it("faz âncoras sem acento, em minúsculas, com hífen", () => {
    expect(slugify("Outros projetos")).toBe("outros-projetos");
    expect(slugify("  Formação & Prêmios!  ")).toBe("formacao-premios");
    expect(slugify("¿?")).toBe("");
  });
});

describe("customTitle", () => {
  it("devolve o título próprio do idioma, ou nada", () => {
    expect(customTitle({ "pt-BR": "Trabalhos", en: "Work" }, "en")).toBe(
      "Work",
    );
    expect(customTitle({ "pt-BR": " ", en: "" }, "pt-BR")).toBeNull();
    expect(customTitle(undefined, "pt-BR")).toBeNull();
  });
});
