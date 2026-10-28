import { describe, expect, it } from "vitest";

import { fillTemplate, pluralize } from "./template";

describe("fillTemplate", () => {
  it("troca cada nome pelo valor", () => {
    expect(
      fillTemplate("{start} — {end}", { start: "out. de 2024", end: "atual" }),
    ).toBe("out. de 2024 — atual");
    expect(fillTemplate("{n} projetos", { n: 13 })).toBe("13 projetos");
  });

  it("deixa à vista o nome sem valor, para o erro aparecer", () => {
    expect(fillTemplate("previsão: {date}", {})).toBe("previsão: {date}");
  });
});

describe("pluralize", () => {
  const forms = { one: "{n} projeto", other: "{n} projetos" };

  it("escolhe a forma pelas regras do idioma", () => {
    expect(pluralize(forms, 1, "pt-BR")).toBe("1 projeto");
    expect(pluralize(forms, 13, "pt-BR")).toBe("13 projetos");
    expect(
      pluralize({ one: "{n} project", other: "{n} projects" }, 0, "en"),
    ).toBe("0 projects");
  });
});
