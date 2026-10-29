import { describe, expect, it } from "vitest";

import { toPublicDocument } from "@/content/public-projection";
import type { PortfolioDocument } from "@/content/schema";

import {
  FIXTURE_PHONE,
  portfolioFixture,
} from "../../../tests/fixtures/portfolio-document";
import { readDocx } from "../../../tests/support/docx";
import { readPdf } from "../../../tests/support/pdf";

import { parseResumeFileName, type ResumeFile } from "./catalog";
import { renderPublicResumeFiles, renderResumeFile } from "./render";

const publicFixture = () => toPublicDocument(structuredClone(portfolioFixture));

function file(name: string): ResumeFile {
  const parsed = parseResumeFileName(name);
  if (parsed === null) {
    throw new Error(`arquivo desconhecido: ${name}`);
  }
  return parsed;
}

/** Algo com cara de telefone: oito dígitos ou mais, com ou sem separadores. */
const PHONE_PATTERN = /\+?\d[\d\s().-]{7,}\d/;

/** Um documento bem maior que o normal, para conferir o limite de páginas. */
function longDocument(): PortfolioDocument {
  const document = structuredClone(portfolioFixture);
  const experience = document.blocks.find(
    (block) => block.type === "experience",
  );
  if (experience?.type !== "experience") {
    throw new Error("sem experiência");
  }
  const [first] = experience.items;
  if (first === undefined) {
    throw new Error("sem item");
  }
  experience.items = Array.from({ length: 5 }, (_, index) => ({
    ...structuredClone(first),
    id: crypto.randomUUID(),
    start: `${2010 + index}-01`,
    end: `${2011 + index}-01`,
    highlights: Array.from({ length: 4 }, () => ({
      id: crypto.randomUUID(),
      inResume: true,
      text: {
        "pt-BR":
          "Conduziu a migração de um sistema legado para uma arquitetura de serviços, com testes automatizados, observabilidade e implantação contínua.",
        en: "Led the migration of a legacy system to a service architecture, with automated tests, observability and continuous deployment.",
      },
    })),
  }));
  return document;
}

describe("PDF do currículo", () => {
  it("tem as seções na ordem do mercado e o texto com acentos certos", async () => {
    const pdf = await readPdf(
      await renderResumeFile(publicFixture(), file("curriculo.pdf")),
    );
    const headings = [
      "Resumo",
      "Experiência profissional",
      "Habilidades",
      "Projetos",
      "Formação acadêmica",
      "Prêmios",
      "Idiomas",
    ];
    const lines = pdf.text.split("\n").map((line) => line.trim());

    expect(headings.map((heading) => lines.indexOf(heading))).toEqual(
      headings
        .map((heading) => lines.indexOf(heading))
        .toSorted((a, b) => a - b),
    );
    expect(headings.every((heading) => lines.includes(heading))).toBe(true);
    expect(lines[0]).toBe("Ana Exemplo da Silva");
    expect(pdf.text).toContain("Desenvolvedora Full Stack · Empresa Exemplo");
    expect(pdf.text).toContain("03/2023 – atual");
    expect(pdf.text).toContain(
      "Backend: Java, Spring Boot, Node.js, APIs REST",
    );
    expect(pdf.text).toContain("conclusão prevista em 12/2026");
    expect(pdf.text).toContain("Português: Nativo");
  });

  it("escreve o e-mail e os endereços por extenso", async () => {
    const pdf = await readPdf(
      await renderResumeFile(publicFixture(), file("resume.pdf")),
    );

    expect(pdf.text).toContain("ana@example.com");
    expect(pdf.text).toContain("example.com/linkedin/ana-exemplo");
    expect(pdf.text).toContain("example.com/github/ana-exemplo");
    expect(pdf.text).toContain("Code: example.com/github/aquario-conectado");
  });

  it("não tem telefone na versão pública, e tem na completa", async () => {
    const publicPdf = await readPdf(
      await renderResumeFile(publicFixture(), file("curriculo.pdf")),
    );
    const fullPdf = await readPdf(
      await renderResumeFile(publicFixture(), file("curriculo.pdf"), {
        phone: FIXTURE_PHONE,
      }),
    );

    expect(publicPdf.text).not.toMatch(PHONE_PATTERN);
    expect(fullPdf.text).toContain(FIXTURE_PHONE);
  });

  it("deixa de fora o que não está marcado para o currículo", async () => {
    const pdf = await readPdf(
      await renderResumeFile(publicFixture(), file("curriculo.pdf")),
    );

    expect(pdf.text).not.toContain("Agência Imaginária");
    expect(pdf.text).not.toContain("Agenda Simples");
    expect(pdf.text).not.toContain("orientou pessoas novas");
    expect(pdf.text).not.toContain("Bastidores");
  });

  it("é marcado, com idioma e metadados", async () => {
    const pdf = await readPdf(
      await renderResumeFile(publicFixture(), file("resume.pdf")),
    );

    expect(pdf.marked).toBe(true);
    expect(pdf.info).toMatchObject({
      Title: "Ana Exemplo da Silva – Résumé",
      Author: "Ana Exemplo da Silva",
      Subject: "Full Stack Developer",
      Language: "en",
    });
    expect(String(pdf.info.Keywords)).toContain("Spring Boot");
  });

  it("cabe em duas páginas mesmo com bastante conteúdo", async () => {
    const short = await readPdf(
      await renderResumeFile(publicFixture(), file("curriculo.pdf")),
    );
    const long = await readPdf(
      await renderResumeFile(
        toPublicDocument(longDocument()),
        file("curriculo.pdf"),
      ),
    );

    expect(short.pages).toBe(1);
    expect(long.pages).toBeLessThanOrEqual(2);
  });
});

describe("DOCX do currículo", () => {
  it("usa os estilos de título do Word, na mesma ordem do PDF", async () => {
    const docx = await readDocx(
      await renderResumeFile(publicFixture(), file("curriculo.docx")),
    );
    const pdf = await readPdf(
      await renderResumeFile(publicFixture(), file("curriculo.pdf")),
    );
    const headings = docx.paragraphs
      .filter((paragraph) => paragraph.style === "Heading2")
      .map((paragraph) => paragraph.text);

    expect(docx.paragraphs[0]).toEqual({
      style: "Heading1",
      bullet: false,
      text: "Ana Exemplo da Silva",
    });
    expect(headings).toEqual([
      "Resumo",
      "Experiência profissional",
      "Habilidades",
      "Projetos",
      "Formação acadêmica",
      "Prêmios",
      "Idiomas",
    ]);
    const pdfLines = pdf.text.split("\n").map((line) => line.trim());
    expect(headings.every((heading) => pdfLines.includes(heading))).toBe(true);
  });

  it("escreve o mesmo texto do PDF, com listas e links de verdade", async () => {
    const docx = await readDocx(
      await renderResumeFile(publicFixture(), file("resume.docx")),
    );

    expect(docx.text).toContain("Full Stack Developer · Empresa Exemplo");
    expect(docx.text).toContain("Recife, Brazil · Hybrid · 03/2023 – Present");
    expect(docx.text).toContain(
      "Backend: Java, Spring Boot, Node.js, APIs REST",
    );
    expect(docx.text).toContain("expected completion 12/2026");
    expect(
      docx.paragraphs
        .filter((paragraph) => paragraph.bullet)
        .map((paragraph) => paragraph.text),
    ).toEqual([
      "Built REST APIs in Java and Spring Boot, tested with JUnit.",
      "Took a real-time messaging service from scratch to production.",
      "Migrated the order dashboard to React without disrupting sales.",
      "Brought the main pages to AA accessibility level.",
    ]);
    expect(docx.text).toContain("example.com/linkedin/ana-exemplo");
    expect(docx.text).toContain("Code: example.com/github/aquario-conectado");
    expect(docx.links).toContain("https://example.com/linkedin/ana-exemplo");
  });

  it("não tem telefone na versão pública, e tem na completa", async () => {
    const publicDocx = await readDocx(
      await renderResumeFile(publicFixture(), file("curriculo.docx")),
    );
    const fullDocx = await readDocx(
      await renderResumeFile(publicFixture(), file("curriculo.docx"), {
        phone: FIXTURE_PHONE,
      }),
    );

    expect(publicDocx.text).not.toMatch(PHONE_PATTERN);
    expect(fullDocx.text).toContain(FIXTURE_PHONE);
  });

  it("tem o idioma e as propriedades do documento", async () => {
    const docx = await readDocx(
      await renderResumeFile(publicFixture(), file("curriculo.docx")),
    );

    expect(docx.styles).toContain('<w:lang w:val="pt-BR"/>');
    expect(docx.core).toContain(
      "<dc:title>Ana Exemplo da Silva – Currículo</dc:title>",
    );
    expect(docx.core).toContain(
      "<dc:creator>Ana Exemplo da Silva</dc:creator>",
    );
    expect(docx.core).toContain(
      "<dc:subject>Desenvolvedora Full Stack</dc:subject>",
    );
    expect(docx.core).toMatch(/<cp:keywords>[^<]*Spring Boot/);
  });
});

describe("renderPublicResumeFiles", () => {
  it("gera os quatro arquivos", async () => {
    const files = await renderPublicResumeFiles(publicFixture());

    expect([...files.keys()]).toEqual([
      "curriculo.pdf",
      "curriculo.docx",
      "resume.pdf",
      "resume.docx",
    ]);
  });
});
