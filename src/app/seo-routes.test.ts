import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toPublicDocument } from "@/content/public-projection";
import type { PublishedContent } from "@/content/read-published";

import { portfolioFixture } from "../../tests/fixtures/portfolio-document";

const state = vi.hoisted(() => ({
  host: "portfolio.example.com",
  server: {
    databasePath: null as string | null,
    publicOrigin: "https://portfolio.example.com" as string | null,
    allowIndexing: true,
  },
  content: null as PublishedContent | null,
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: state.host }),
}));
vi.mock("next/cache", () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock("@/lib/env", () => ({ getServerEnv: () => state.server }));
vi.mock("@/content/read-published", () => ({
  CONTENT_CACHE_TAG: "content",
  readPublishedContent: async () => state.content,
}));

const { default: robots } = await import("./robots");
const { default: sitemap } = await import("./sitemap");
const { GET: shareImage } = await import("./(site)/[locale]/og.jpg/route");
const { GET: llms } = await import("./llms.txt/route");

beforeEach(() => {
  state.host = "portfolio.example.com";
  state.server = {
    databasePath: null,
    publicOrigin: "https://portfolio.example.com",
    allowIndexing: true,
  };
  state.content = {
    revisionId: 4,
    publishedAt: "2026-10-29T12:00:00.000Z",
    document: toPublicDocument(structuredClone(portfolioFixture)),
  };
});

describe("robots.txt", () => {
  it("deixa todos entrarem no host canônico, menos no painel, e indica o sitemap", async () => {
    expect(await robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: "/admin" },
      sitemap: "https://portfolio.example.com/sitemap.xml",
    });
  });

  it("fecha tudo antes do lançamento e em outro host", async () => {
    const closed = { rules: { userAgent: "*", disallow: "/" } };

    state.host = "127.0.0.1:3000";
    expect(await robots()).toEqual(closed);

    state.host = "portfolio.example.com";
    state.server.allowIndexing = false;
    expect(await robots()).toEqual(closed);
  });
});

describe("sitemap.xml", () => {
  it("lista a página de cada idioma, com os outros e a data da publicação", async () => {
    const languages = {
      "pt-BR": "https://portfolio.example.com/pt/",
      en: "https://portfolio.example.com/en/",
      "x-default": "https://portfolio.example.com/",
    };

    expect(await sitemap()).toEqual([
      {
        url: "https://portfolio.example.com/pt/",
        lastModified: "2026-10-29T12:00:00.000Z",
        alternates: { languages },
      },
      {
        url: "https://portfolio.example.com/en/",
        lastModified: "2026-10-29T12:00:00.000Z",
        alternates: { languages },
      },
    ]);
  });

  it("sai vazio sem nada publicado", async () => {
    state.content = null;

    expect(await sitemap()).toEqual([]);
  });
});

describe("GET /llms.txt", () => {
  const get = (url = "https://portfolio.example.com/llms.txt") =>
    llms(new NextRequest(url));

  it("entrega o resumo para assistentes de IA, com links absolutos", async () => {
    const response = await get();
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "text/plain; charset=utf-8",
    );
    expect(text.startsWith("# Ana Exemplo da Silva\n")).toBe(true);
    expect(text).toContain("(https://portfolio.example.com/cv/resume.md)");
  });

  it("sem PUBLIC_ORIGIN, usa a origem do pedido", async () => {
    state.server.publicOrigin = null;

    const text = await (
      await get("http://portfolio.local:3000/llms.txt")
    ).text();

    expect(text).toContain("(http://portfolio.local:3000/cv/resume.md)");
  });

  it("responde 404 sem nada publicado", async () => {
    state.content = null;

    expect((await get()).status).toBe(404);
  });
});

describe("GET /[locale]/og.jpg", () => {
  const get = (locale: string) =>
    shareImage(
      new NextRequest(`https://portfolio.example.com/${locale}/og.jpg`),
      {
        params: Promise.resolve({ locale }),
      },
    );

  it("gera a imagem de compartilhamento em JPEG, 1200 × 630", async () => {
    const response = await get("pt");
    const data = new Uint8Array(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect([data[0], data[1]]).toEqual([0xff, 0xd8]);
    const sharp = (await import("sharp")).default;
    expect(await sharp(data).metadata()).toMatchObject({
      width: 1200,
      height: 630,
    });
  });

  it("responde 404 a outro idioma e sem nada publicado", async () => {
    expect((await get("xx")).status).toBe(404);

    state.content = null;
    expect((await get("en")).status).toBe(404);
  });
});
