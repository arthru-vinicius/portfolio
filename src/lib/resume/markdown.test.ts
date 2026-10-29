import { describe, expect, it } from "vitest";

import { toPublicDocument } from "@/content/public-projection";

import {
  FIXTURE_PHONE,
  portfolioFixture,
} from "../../../tests/fixtures/portfolio-document";

import { layoutResume, type ResumeLayout } from "./layout";
import { escapeMarkdown, renderResumeMarkdown } from "./markdown";
import { buildResumeModel } from "./model";

const layoutOf = (locale: "pt-BR" | "en", phone?: string) =>
  layoutResume(
    buildResumeModel(
      toPublicDocument(structuredClone(portfolioFixture)),
      locale,
      phone === undefined ? {} : { phone },
    ),
  );

describe("escapeMarkdown", () => {
  it("escapa a marcação e o começo de linha que viraria bloco", () => {
    expect(escapeMarkdown("node_modules e *.ts [x]")).toBe(
      "node\\_modules e \\*.ts \\[x\\]",
    );
    expect(escapeMarkdown("# título")).toBe("\\# título");
    expect(escapeMarkdown("- item")).toBe("\\- item");
    expect(escapeMarkdown("2024. Ano")).toBe("2024\\. Ano");
    expect(escapeMarkdown("C# e Node.js · 10/2024 – atual")).toBe(
      "C# e Node.js · 10/2024 – atual",
    );
  });
});

describe("renderResumeMarkdown", () => {
  it("tem as seções na mesma ordem do PDF, como títulos", () => {
    const layout = layoutOf("pt-BR");
    const markdown = renderResumeMarkdown(layout);
    const headings = markdown
      .split("\n")
      .filter((line) => line.startsWith("## "))
      .map((line) => line.slice(3));

    expect(headings).toEqual(layout.sections.map((section) => section.title));
    expect(markdown.startsWith("# Ana Exemplo da Silva\n\n")).toBe(true);
    expect(markdown).toContain("**Desenvolvedora Full Stack**");
    expect(markdown.endsWith("\n")).toBe(true);
  });

  it("escreve os links e o do portfólio, quando se sabe", () => {
    const markdown = renderResumeMarkdown(layoutOf("en"), {
      portfolio: {
        label: "Portfolio",
        url: "https://portfolio.example.com/en/",
        display: "portfolio.example.com/en",
      },
    });

    expect(markdown).toContain(
      "[example.com/linkedin/ana-exemplo](https://example.com/linkedin/ana-exemplo)",
    );
    expect(markdown).toContain(
      "Portfolio: [portfolio.example.com/en](https://portfolio.example.com/en/)",
    );
  });

  it("monta listas e itens a partir das linhas do layout", () => {
    const layout: ResumeLayout = {
      lang: "pt-BR",
      title: "Ana – Currículo",
      author: "Ana",
      subject: "Dev",
      keywords: [],
      name: "Ana",
      headline: "",
      contact: "",
      links: [],
      sections: [
        {
          title: "Experiência",
          lines: [
            { kind: "item", lead: "Dev", rest: "· Empresa" },
            { kind: "meta", text: "Recife · 10/2024 – atual" },
            { kind: "bullets", items: ["Fez *isto*", "Fez aquilo"] },
            {
              kind: "links",
              links: [
                {
                  label: "Código",
                  url: "https://example.com/a (b)",
                  display: "example.com/a (b)",
                },
              ],
            },
          ],
        },
        {
          title: "Habilidades",
          lines: [
            { kind: "pair", lead: "Backend:", rest: "PHP, Node.js" },
            { kind: "pair", lead: "Dados:", rest: "MySQL" },
            { kind: "text", text: "• solto" },
          ],
        },
      ],
    };

    expect(renderResumeMarkdown(layout)).toBe(
      [
        "# Ana",
        "",
        "## Experiência",
        "",
        "### Dev · Empresa",
        "",
        "Recife · 10/2024 – atual",
        "",
        "- Fez \\*isto\\*",
        "- Fez aquilo",
        "",
        "Código: [example.com/a (b)](https://example.com/a%20%28b%29)",
        "",
        "## Habilidades",
        "",
        "- **Backend:** PHP, Node.js",
        "- **Dados:** MySQL",
        "- solto",
        "",
      ].join("\n"),
    );
  });

  it("só tem o telefone na versão completa", () => {
    expect(renderResumeMarkdown(layoutOf("pt-BR"))).not.toContain(
      FIXTURE_PHONE,
    );
    expect(renderResumeMarkdown(layoutOf("pt-BR", FIXTURE_PHONE))).toContain(
      FIXTURE_PHONE,
    );
  });
});
