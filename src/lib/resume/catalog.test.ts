import { describe, expect, it } from "vitest";

import {
  downloadFileName,
  parseResumeFileName,
  resumeDownloads,
} from "./catalog";

describe("resumeDownloads", () => {
  it("põe a revisão no link, para o navegador baixar a versão nova", () => {
    const links = resumeDownloads("Ana Exemplo", {
      basePath: "/cv",
      revisionId: 9,
      sizes: new Map([["curriculo.pdf", 52_000]]),
    });

    expect(links.map((link) => link.href)).toEqual([
      "/cv/curriculo.pdf?v=9",
      "/cv/curriculo.docx?v=9",
      "/cv/resume.pdf?v=9",
      "/cv/resume.docx?v=9",
    ]);
    expect(links[0]).toMatchObject({
      fileName: "ana-exemplo-curriculo.pdf",
      size: 52_000,
    });
    expect(links[1]?.size).toBeNull();
  });

  it("sem revisão, usa a URL fixa", () => {
    expect(
      resumeDownloads("Ana", { basePath: "/admin/cv", suffix: "rascunho" })[3],
    ).toMatchObject({
      href: "/admin/cv/resume.docx",
      fileName: "ana-resume-rascunho.docx",
    });
  });
});

describe("parseResumeFileName", () => {
  it("só aceita os quatro nomes", () => {
    expect(parseResumeFileName("resume.pdf")).toMatchObject({
      locale: "en",
      format: "pdf",
    });
    expect(parseResumeFileName("curriculo.xlsx")).toBeNull();
    expect(parseResumeFileName("../curriculo.pdf")).toBeNull();
  });
});

describe("downloadFileName", () => {
  it("tira acento e espaço do nome", () => {
    const file = parseResumeFileName("curriculo.docx");
    if (file === null) {
      throw new Error("arquivo desconhecido");
    }

    expect(downloadFileName("Ana Exemplo", file, "Completo")).toBe(
      "ana-exemplo-curriculo-completo.docx",
    );
  });
});
