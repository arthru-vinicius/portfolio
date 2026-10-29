import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toPublicDocument } from "@/content/public-projection";

import { portfolioFixture } from "../../../tests/fixtures/portfolio-document";

import { parseResumeFileName, resumeFiles } from "./catalog";
import { RESUME_FORMAT_VERSION } from "./version";

const render = vi.hoisted(() => ({
  calls: 0,
  origins: [] as unknown[],
}));

/** O conteúdo falso de cada arquivo: o formato e o idioma. */
const fakeContent = (file: { format: string; locale: string }) =>
  `${file.format} ${file.locale}`;

vi.mock("./render", async () => {
  const catalog = await import("./catalog");
  return {
    renderPublicResumeFiles: async (
      _document: unknown,
      options?: { origin?: string | null },
    ) => {
      render.calls++;
      render.origins.push(options?.origin);
      return new Map(
        catalog.resumeFiles.map((file) => [
          file.name,
          Buffer.from(fakeContent(file)),
        ]),
      );
    },
  };
});

/** A pasta de uma revisão na versão atual do formato. */
const folderOf = (revisionId: number) =>
  `${revisionId}-v${RESUME_FORMAT_VERSION}`;

const {
  ensureResumeFiles,
  readResumeFile,
  resumeDirectoryFor,
  saveResumeFiles,
} = await import("./storage");

function fileNamed(name: string) {
  const file = parseResumeFileName(name);
  if (file === null) {
    throw new Error(`arquivo desconhecido: ${name}`);
  }
  return file;
}

const source = (revisionId: number) => ({
  revisionId,
  document: toPublicDocument(structuredClone(portfolioFixture)),
  origin: "https://portfolio.example.com",
});

let root = "";

beforeEach(async () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  render.calls = 0;
  render.origins = [];
  root = path.join(await mkdtemp(path.join(tmpdir(), "cv-")), "cv");
});

afterEach(async () => {
  await rm(path.dirname(root), { recursive: true, force: true });
});

describe("resumeDirectoryFor", () => {
  it("fica ao lado do banco", () => {
    expect(resumeDirectoryFor("/data/portfolio.db")).toBe(
      path.join("/data", "cv"),
    );
  });
});

describe("ensureResumeFiles", () => {
  it("gera os arquivos que faltam e devolve os tamanhos", async () => {
    const sizes = await ensureResumeFiles(root, source(3));

    expect(Object.fromEntries(sizes)).toEqual(
      Object.fromEntries(
        resumeFiles.map((file) => [file.name, fakeContent(file).length]),
      ),
    );
    expect((await readdir(path.join(root, folderOf(3)))).sort()).toEqual(
      resumeFiles.map((file) => file.name).sort(),
    );
    // A origem chega ao gerador, para os links do Markdown e do JSON.
    expect(render.origins).toEqual(["https://portfolio.example.com"]);
  });

  it("não gera de novo o que já existe", async () => {
    await ensureResumeFiles(root, source(3));
    await ensureResumeFiles(root, source(3));

    expect(render.calls).toBe(1);
  });

  it("gera uma vez só para pedidos ao mesmo tempo", async () => {
    await Promise.all([
      ensureResumeFiles(root, source(3)),
      ensureResumeFiles(root, source(3)),
      readResumeFile(root, source(3), fileNamed("resume.pdf")),
    ]);

    expect(render.calls).toBe(1);
  });
});

describe("saveResumeFiles", () => {
  it("apaga as pastas antigas e mantém a de uma revisão mais nova", async () => {
    const olderFormat = `2-v${RESUME_FORMAT_VERSION - 1}`;
    for (const folder of [folderOf(1), olderFormat, folderOf(9), "lixo"]) {
      await mkdir(path.join(root, folder), { recursive: true });
    }
    await writeFile(path.join(root, folderOf(1), "curriculo.pdf"), "velho");

    await saveResumeFiles(
      root,
      2,
      new Map([["curriculo.pdf", Buffer.from("novo")]]),
    );

    expect((await readdir(root)).sort()).toEqual([folderOf(2), folderOf(9)]);
  });
});

describe("readResumeFile", () => {
  it("lê o arquivo da revisão", async () => {
    const data = await readResumeFile(
      root,
      source(5),
      fileNamed("curriculo.docx"),
    );

    expect(data.toString()).toBe("docx pt-BR");
  });
});
