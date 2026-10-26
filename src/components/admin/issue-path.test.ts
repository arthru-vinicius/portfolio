import { describe, expect, it } from "vitest";

import { describeIssuePath } from "./issue-path";

describe("describeIssuePath", () => {
  it("descreve o caminho com os nomes do painel, contando a partir de 1", () => {
    expect(describeIssuePath("blocks.2.items.0.start")).toBe(
      "Bloco 3 › Item 1 › Início",
    );
    expect(describeIssuePath("profile.headline.en")).toBe(
      "Perfil › Título profissional › em inglês",
    );
    expect(describeIssuePath("profile.links.1.url")).toBe(
      "Perfil › Link 2 › Endereço",
    );
  });

  it("mantém o segmento que não conhece", () => {
    expect(describeIssuePath("schemaVersion")).toBe("schemaVersion");
  });
});
