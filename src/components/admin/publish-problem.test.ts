import { describe, expect, it } from "vitest";

import type { Block } from "@/content/schema";

import { portfolioFixture } from "../../../tests/fixtures/portfolio-document";

import { describePublishProblem } from "./publish-problem";

function blockOfType<T extends Block["type"]>(type: T) {
  const index = portfolioFixture.blocks.findIndex(
    (block) => block.type === type,
  );
  const block = portfolioFixture.blocks[index] as
    Extract<Block, { type: T }> | undefined;
  if (block === undefined) {
    throw new Error(`o fixture não tem bloco ${type}`);
  }
  return { block, index };
}

describe("describePublishProblem", () => {
  it("aponta o campo do perfil e a tela do perfil", () => {
    expect(
      describePublishProblem(portfolioFixture, {
        path: "profile.headline.en",
        message: "falta a tradução",
      }),
    ).toEqual({
      where: "Perfil › Título profissional › em inglês",
      message: "falta a tradução",
      href: "/admin/profile",
    });
  });

  it("chama o item pelo nome e leva à tela do bloco", () => {
    const { block, index } = blockOfType("experience");
    const [job] = block.items;
    if (job === undefined) throw new Error("o fixture não tem experiência");

    expect(
      describePublishProblem(portfolioFixture, {
        path: `blocks.${index}.items.0.highlights.1.text`,
        message: "preencha em português e em inglês",
      }),
    ).toEqual({
      where: `Experiência › ${job.company} › Destaque 2 › Texto`,
      message: "preencha em português e em inglês",
      href: `/admin/blocks/${block.id}`,
    });
  });

  it("descreve o campo do próprio bloco e a lista de blocos", () => {
    const { block, index } = blockOfType("about");

    expect(
      describePublishProblem(portfolioFixture, {
        path: `blocks.${index}.body`,
        message: "preencha em português e em inglês",
      }),
    ).toMatchObject({
      where: "Sobre › Texto",
      href: `/admin/blocks/${block.id}`,
    });
    expect(
      describePublishProblem(portfolioFixture, {
        path: "blocks",
        message: "deixe ao menos um bloco visível",
      }),
    ).toMatchObject({ where: "Blocos", href: "/admin/blocks" });
  });
});
