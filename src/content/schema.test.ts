import { describe, expect, it } from "vitest";

import { portfolioFixture } from "../../tests/fixtures/portfolio-document";

import {
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

function issuesOf(document: unknown) {
  const result = portfolioDocumentSchema.safeParse(document);
  return result.success ? [] : result.error.issues;
}

describe("portfolioDocumentSchema", () => {
  it("aceita o documento fictício", () => {
    expect(issuesOf(portfolioFixture)).toEqual([]);
  });

  it("aceita textos vazios no rascunho; a exigência dos dois idiomas é da publicação", () => {
    const document = copy();
    document.profile.headline = { "pt-BR": "", en: "" };

    expect(issuesOf(document)).toEqual([]);
  });

  it("exige as chaves dos dois idiomas em todo texto", () => {
    const document = copy();
    const headline: Record<string, string> = { ...document.profile.headline };
    delete headline.en;

    expect(
      issuesOf({ ...document, profile: { ...document.profile, headline } }),
    ).toEqual([
      expect.objectContaining({ path: ["profile", "headline", "en"] }),
    ]);
  });

  it("tira espaços das pontas dos textos", () => {
    const document = copy();
    document.profile.displayName = "  Ana Exemplo  ";

    expect(portfolioDocumentSchema.parse(document).profile.displayName).toBe(
      "Ana Exemplo",
    );
  });

  it.each(["2023-13", "2023/03", "23-03", "2023-3"])(
    "recusa o mês %s fora do formato AAAA-MM",
    (month) => {
      const document = copy();
      const [job] = blockOfType(document, "experience").items;
      if (job === undefined) throw new Error("o fixture não tem experiência");
      job.start = month;

      expect(issuesOf(document)).toEqual([
        expect.objectContaining({ path: ["blocks", 1, "items", 0, "start"] }),
      ]);
    },
  );

  it("recusa um fim anterior ao início", () => {
    const document = copy();
    const [job] = blockOfType(document, "experience").items;
    if (job === undefined) throw new Error("o fixture não tem experiência");
    job.end = "2020-01";

    expect(issuesOf(document)).toEqual([
      expect.objectContaining({
        path: ["blocks", 1, "items", 0, "end"],
        message: "o fim vem antes do início",
      }),
    ]);
  });

  it.each(["javascript:alert(1)", "ftp://example.com", "example.com"])(
    "recusa o link %s, que não é http nem https",
    (url) => {
      const document = copy();
      const [link] = document.profile.links;
      if (link === undefined) throw new Error("o fixture não tem links");
      link.url = url;

      expect(issuesOf(document)).toEqual([
        expect.objectContaining({ path: ["profile", "links", 0, "url"] }),
      ]);
    },
  );

  it("exige rótulo num link do tipo other", () => {
    const document = copy();
    document.profile.links.push({
      id: "8d7c6f2e-1b2a-4c3d-9e8f-0a1b2c3d4e5f",
      kind: "other",
      url: "https://example.com/blog",
    });

    expect(issuesOf(document)).toEqual([
      expect.objectContaining({ path: ["profile", "links", 3, "label"] }),
    ]);
  });

  it("recusa a mesma tecnologia duas vezes, sem diferenciar maiúsculas", () => {
    const document = copy();
    const [job] = blockOfType(document, "experience").items;
    if (job === undefined) throw new Error("o fixture não tem experiência");
    job.technologies = ["Java", "java"];

    expect(issuesOf(document)).toEqual([
      expect.objectContaining({
        path: ["blocks", 1, "items", 0, "technologies"],
      }),
    ]);
  });

  it("recusa dois blocos do mesmo tipo", () => {
    const document = copy();
    document.blocks.push({
      id: "5f4e3d2c-1b0a-4c9d-8e7f-6a5b4c3d2e1f",
      type: "about",
      visible: true,
      body: { "pt-BR": "", en: "" },
    });

    expect(issuesOf(document)).toEqual([
      expect.objectContaining({
        path: ["blocks", document.blocks.length - 1, "type"],
        message: "já existe um bloco about na posição 0",
      }),
    ]);
  });

  it("aceita vários blocos livres", () => {
    const document = copy();
    document.blocks.push({
      id: "2c3d4e5f-6a7b-4c8d-9e0f-1a2b3c4d5e6f",
      type: "text",
      visible: true,
      title: { "pt-BR": "Outro bloco", en: "Another block" },
      body: { "pt-BR": "", en: "" },
    });

    expect(issuesOf(document)).toEqual([]);
  });

  it("recusa um id repetido em qualquer lugar do documento", () => {
    const document = copy();
    const [job] = blockOfType(document, "experience").items;
    const [highlight] = job?.highlights ?? [];
    if (highlight === undefined) throw new Error("o fixture não tem destaques");
    highlight.id = document.profile.links[0]?.id ?? "";

    expect(issuesOf(document)).toEqual([
      expect.objectContaining({
        path: ["blocks", 1, "items", 0, "highlights", 0, "id"],
        message: `id repetido: ${highlight.id}`,
      }),
    ]);
  });

  it("descarta campos que não são do schema", () => {
    const parsed = portfolioDocumentSchema.parse({
      ...portfolioFixture,
      extra: "não faz parte do documento",
    });

    expect(parsed).not.toHaveProperty("extra");
  });
});
