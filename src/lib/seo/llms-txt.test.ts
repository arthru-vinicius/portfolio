import { describe, expect, it } from "vitest";

import { toPublicDocument } from "@/content/public-projection";

import {
  FIXTURE_PHONE,
  portfolioFixture,
} from "../../../tests/fixtures/portfolio-document";

import { llmsTxt } from "./llms-txt";

const ORIGIN = "https://portfolio.example.com";
const document = () => toPublicDocument(structuredClone(portfolioFixture));

describe("llmsTxt", () => {
  it("segue a convenção: nome, resumo numa linha e seções de links", () => {
    const text = llmsTxt(document(), ORIGIN);
    const lines = text.split("\n");

    expect(lines[0]).toBe("# Ana Exemplo da Silva");
    expect(lines[2]).toBe("> Full Stack Developer based in Recife, Brazil.");
    expect(lines.filter((line) => line.startsWith("## "))).toEqual([
      "## Résumé",
      "## Portfolio",
      "## Profiles",
      "## Contact",
      "## Optional",
    ]);
    expect(text.endsWith("\n")).toBe(true);
  });

  it("aponta o currículo em texto e em dados, nos dois idiomas", () => {
    const text = llmsTxt(document(), ORIGIN);

    expect(text).toContain(
      "- [Résumé in Markdown, in English](https://portfolio.example.com/cv/resume.md): the same text as the PDF, without the layout",
    );
    expect(text).toContain(
      "- [Currículo em JSON Resume, em português](https://portfolio.example.com/cv/curriculo.json): dados no padrão do jsonresume.org",
    );
    expect(text).toContain(
      "- [Portfólio em português](https://portfolio.example.com/pt/)",
    );
    expect(text).toContain(
      "- [Contact section of the portfolio](https://portfolio.example.com/en/#contact)",
    );
    expect(text).toContain("- [Email](mailto:ana@example.com)");
    // O PDF e o DOCX ficam na seção que a convenção deixa pular.
    expect(text.slice(text.indexOf("## Optional"))).toContain(
      "(https://portfolio.example.com/cv/curriculo.pdf)",
    );
  });

  it("não tem campo privado", () => {
    expect(llmsTxt(document(), ORIGIN)).not.toContain(FIXTURE_PHONE);
  });
});
