import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { toPublicDocument } from "@/content/public-projection";
import type { PortfolioDocument } from "@/content/schema";

import {
  FIXTURE_PHONE,
  portfolioFixture,
} from "../../../tests/fixtures/portfolio-document";
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

async function workbookOf(data: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(new Uint8Array(data).buffer);
  return workbook;
}

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

describe("XLSX do currículo", () => {
  it("tem uma aba por seção, com o cabeçalho na primeira linha", async () => {
    const workbook = await workbookOf(
      await renderResumeFile(publicFixture(), file("curriculo.xlsx")),
    );

    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Perfil",
      "Experiência",
      "Habilidades",
      "Projetos",
      "Formação",
      "Prêmios",
      "Idiomas",
    ]);
    expect(workbook.getWorksheet("Experiência")?.getRow(1).values).toEqual([
      undefined,
      "Cargo",
      "Empresa",
      "Local",
      "Modalidade",
      "Início",
      "Fim",
      "Atual",
      "Destaques",
      "Tecnologias",
    ]);
    for (const sheet of workbook.worksheets) {
      expect(sheet.model.merges).toEqual([]);
      expect(sheet.views[0]).toMatchObject({ state: "frozen", ySplit: 1 });
      expect(sheet.autoFilter).toBeDefined();
    }
  });

  it("guarda as datas como datas, com o emprego atual sem fim", async () => {
    const workbook = await workbookOf(
      await renderResumeFile(publicFixture(), file("resume.xlsx")),
    );
    const sheet = workbook.getWorksheet("Experience");
    const current = sheet?.getRow(2);
    const previous = sheet?.getRow(3);

    expect(current?.getCell(5).value).toEqual(new Date(Date.UTC(2023, 2, 1)));
    expect(current?.getCell(5).numFmt).toBe("mm/yyyy");
    expect(current?.getCell(6).value).toBeNull();
    expect(current?.getCell(7).value).toBe("Yes");
    expect(previous?.getCell(6).value).toEqual(new Date(Date.UTC(2023, 1, 1)));
    expect(previous?.getCell(7).value).toBe("No");
    expect(current?.getCell(8).value).toBe(
      "Built REST APIs in Java and Spring Boot, tested with JUnit.\nTook a real-time messaging service from scratch to production.",
    );
  });

  it("usa Campo e Valor no perfil, sem telefone na versão pública", async () => {
    const data = await renderResumeFile(
      publicFixture(),
      file("curriculo.xlsx"),
    );
    const workbook = await workbookOf(data);
    const rows: unknown[][] = [];
    workbook.getWorksheet("Perfil")?.eachRow((row) => {
      rows.push((row.values as unknown[]).slice(1));
    });

    expect(rows.slice(0, 5)).toEqual([
      ["Campo", "Valor"],
      ["Nome completo", "Ana Exemplo da Silva"],
      ["Título", "Desenvolvedora Full Stack"],
      ["Local", "Recife, PE, Brasil"],
      ["E-mail", "ana@example.com"],
    ]);
    expect(JSON.stringify(rows)).not.toMatch(PHONE_PATTERN);
    expect(workbook.title).toBe("Ana Exemplo da Silva – Currículo");
    expect(workbook.creator).toBe("Ana Exemplo da Silva");
  });
});

describe("renderPublicResumeFiles", () => {
  it("gera os quatro arquivos", async () => {
    const files = await renderPublicResumeFiles(publicFixture());

    expect([...files.keys()]).toEqual([
      "curriculo.pdf",
      "curriculo.xlsx",
      "resume.pdf",
      "resume.xlsx",
    ]);
  });
});
