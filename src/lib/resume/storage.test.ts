import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toPublicDocument } from "@/content/public-projection";

import { portfolioFixture } from "../../../tests/fixtures/portfolio-document";

import { parseResumeFileName } from "./catalog";

const render = vi.hoisted(() => ({
  calls: 0,
}));

vi.mock("./render", () => ({
  RESUME_FORMAT_VERSION: 1,
  renderPublicResumeFiles: async () => {
    render.calls++;
    return new Map([
      ["curriculo.pdf", Buffer.from("pdf pt")],
      ["curriculo.xlsx", Buffer.from("xlsx pt")],
      ["resume.pdf", Buffer.from("pdf en!")],
      ["resume.xlsx", Buffer.from("xlsx en")],
    ]);
  },
}));

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
});

let root = "";

beforeEach(async () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  render.calls = 0;
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

    expect(Object.fromEntries(sizes)).toEqual({
      "curriculo.pdf": 6,
      "curriculo.xlsx": 7,
      "resume.pdf": 7,
      "resume.xlsx": 7,
    });
    expect((await readdir(path.join(root, "3-v1"))).sort()).toEqual([
      "curriculo.pdf",
      "curriculo.xlsx",
      "resume.pdf",
      "resume.xlsx",
    ]);
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
    for (const folder of ["1-v1", "2-v0", "2-v1", "9-v1", "lixo"]) {
      await mkdir(path.join(root, folder), { recursive: true });
    }
    await writeFile(path.join(root, "1-v1", "curriculo.pdf"), "velho");

    await saveResumeFiles(
      root,
      2,
      new Map([["curriculo.pdf", Buffer.from("novo")]]),
    );

    expect((await readdir(root)).sort()).toEqual(["2-v1", "9-v1"]);
  });
});

describe("readResumeFile", () => {
  it("lê o arquivo da revisão", async () => {
    const data = await readResumeFile(
      root,
      source(5),
      fileNamed("curriculo.xlsx"),
    );

    expect(data.toString()).toBe("xlsx pt");
  });
});
