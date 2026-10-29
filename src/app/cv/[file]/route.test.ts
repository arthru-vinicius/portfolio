import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toPublicDocument } from "@/content/public-projection";
import type { PublishedContent } from "@/content/read-published";

import { RESUME_FORMAT_VERSION } from "@/lib/resume/version";

import { portfolioFixture } from "../../../../tests/fixtures/portfolio-document";
import { readPdf } from "../../../../tests/support/pdf";

/** A ETag de uma revisão na versão atual do formato. */
const etagOf = (revisionId: number) =>
  `"${revisionId}-v${RESUME_FORMAT_VERSION}"`;

const state = vi.hoisted(() => ({
  directory: "",
  content: null as PublishedContent | null,
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));
vi.mock("@/lib/env", () => ({
  getServerEnv: () => ({
    databasePath: path.join(state.directory, "portfolio.db"),
    publicOrigin: "https://portfolio.example.com",
  }),
}));
vi.mock("@/content/read-published", () => ({
  readPublishedContent: async () => state.content,
}));

const { GET } = await import("./route");

function get(file: string, headers: Record<string, string> = {}) {
  return GET(new NextRequest(`https://example.com/cv/${file}`, { headers }), {
    params: Promise.resolve({ file }),
  });
}

describe("GET /cv/[file]", () => {
  beforeEach(async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    state.directory = await mkdtemp(path.join(tmpdir(), "cv-rota-"));
    state.content = {
      revisionId: 7,
      publishedAt: "2026-10-28T12:00:00.000Z",
      document: toPublicDocument(structuredClone(portfolioFixture)),
    };
  });

  afterEach(async () => {
    await rm(state.directory, { recursive: true, force: true });
  });

  it("entrega o PDF publicado, com a ETag da revisão", async () => {
    const response = await get("curriculo.pdf");

    expect(response.status).toBe(200);
    expect(Object.fromEntries(response.headers)).toMatchObject({
      "content-type": "application/pdf",
      "content-disposition": 'inline; filename="ana-exemplo-curriculo.pdf"',
      "cache-control": "public, no-cache",
      etag: etagOf(7),
      "x-content-type-options": "nosniff",
    });
    const pdf = await readPdf(new Uint8Array(await response.arrayBuffer()));
    expect(pdf.text).toContain("Ana Exemplo da Silva");
  });

  it("entrega o DOCX como download", async () => {
    const response = await get("resume.docx");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="ana-exemplo-resume.docx"',
    );
  });

  it("entrega o Markdown e o JSON Resume para ler no navegador", async () => {
    const markdown = await get("curriculo.md");
    expect(markdown.status).toBe(200);
    expect(Object.fromEntries(markdown.headers)).toMatchObject({
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": 'inline; filename="ana-exemplo-curriculo.md"',
    });
    const text = await markdown.text();
    expect(text.startsWith("# Ana Exemplo da Silva")).toBe(true);
    expect(text).toContain(
      "[portfolio.example.com/pt](https://portfolio.example.com/pt/)",
    );

    const json = await get("resume.json");
    expect(json.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
    expect(await json.json()).toMatchObject({
      basics: {
        name: "Ana Exemplo da Silva",
        url: "https://portfolio.example.com/en/",
      },
      meta: { canonical: "https://portfolio.example.com/cv/resume.json" },
    });
  });

  it("responde 304 quando a cópia de quem pede ainda vale", async () => {
    const response = await get("resume.pdf", {
      "if-none-match": `W/${etagOf(7)}`,
    });

    expect(response.status).toBe(304);
    expect(response.headers.get("etag")).toBe(etagOf(7));
  });

  it("muda a ETag quando outra revisão é publicada", async () => {
    await get("curriculo.pdf");
    if (state.content !== null) {
      state.content = { ...state.content, revisionId: 8 };
    }

    const response = await get("curriculo.pdf", {
      "if-none-match": etagOf(7),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toBe(etagOf(8));
  });

  it("responde 404 a outro nome de arquivo e sem nada publicado", async () => {
    expect((await get("..%2Fportfolio.db")).status).toBe(404);
    expect((await get("curriculo.xlsx")).status).toBe(404);

    state.content = null;
    expect((await get("curriculo.pdf")).status).toBe(404);
  });
});
