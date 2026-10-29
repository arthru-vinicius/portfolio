import { describe, expect, it } from "vitest";

import { displayUrl, markdownToLines } from "./plain-text";

describe("markdownToLines", () => {
  it("tira a marcação e deixa um parágrafo por linha", () => {
    expect(
      markdownToLines(
        "Uso **TypeScript** e *Rust*, com `cargo`.\ncontinua aqui\n\nOutro _parágrafo_.",
      ),
    ).toEqual([
      "Uso TypeScript e Rust, com cargo. continua aqui",
      "Outro parágrafo.",
    ]);
  });

  it("escreve o endereço do link, que o ATS costuma descartar", () => {
    expect(
      markdownToLines(
        "Veja a [live da premiação](https://www.youtube.com/watch?v=abc&t=10) e [example.com](https://example.com/).",
      ),
    ).toEqual([
      "Veja a live da premiação (www.youtube.com/watch?v=abc&t=10) e example.com.",
    ]);
  });

  it("deixa só o texto de um link com esquema recusado", () => {
    expect(markdownToLines("[clique](javascript:void)")).toEqual(["clique"]);
  });

  it("marca os itens de lista, numerando a lista numerada", () => {
    expect(
      markdownToLines("Antes:\n\n- **um**\n- dois\n\n1. primeiro\n2. segundo"),
    ).toEqual(["Antes:", "• um", "• dois", "1. primeiro", "2. segundo"]);
  });

  it("devolve nada para texto vazio", () => {
    expect(markdownToLines("  \n\n ")).toEqual([]);
  });
});

describe("displayUrl", () => {
  it("tira o esquema e a barra do fim", () => {
    expect(displayUrl("https://linkedin.com/in/ana/")).toBe(
      "linkedin.com/in/ana",
    );
    expect(displayUrl("mailto:ana@example.com")).toBe("ana@example.com");
  });
});
