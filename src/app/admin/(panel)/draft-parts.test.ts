import { describe, expect, it } from "vitest";

import { portfolioFixture } from "../../../../tests/fixtures/portfolio-document";

import { draftParts, versionOf } from "./draft-parts";

describe("versão de uma parte do rascunho", () => {
  it("não depende da ordem das chaves", () => {
    expect(versionOf({ a: 1, b: { c: [1, { d: 2, e: 3 }] } })).toBe(
      versionOf({ b: { c: [1, { e: 3, d: 2 }] }, a: 1 }),
    );
  });

  it("muda com o conteúdo, inclusive com a ordem de uma lista", () => {
    expect(versionOf({ items: [1, 2] })).not.toBe(versionOf({ items: [2, 1] }));
    expect(versionOf({ name: "a" })).not.toBe(versionOf({ name: "b" }));
  });

  it("trata campo ausente e campo indefinido como iguais", () => {
    expect(versionOf({ a: 1 })).toBe(versionOf({ a: 1, b: undefined }));
  });

  it("a lista de blocos não muda com o conteúdo de um bloco", () => {
    const changed = structuredClone(portfolioFixture);
    const [first] = changed.blocks;
    if (first === undefined) throw new Error("o fixture não tem blocos");
    first.title = { "pt-BR": "Outro título", en: "Another title" };

    expect(versionOf(draftParts.blockList(changed))).toBe(
      versionOf(draftParts.blockList(portfolioFixture)),
    );
  });

  it("um bloco que saiu do documento tem versão própria", () => {
    expect(versionOf(draftParts.block("nenhum")(portfolioFixture))).toBe(
      versionOf(null),
    );
  });
});
