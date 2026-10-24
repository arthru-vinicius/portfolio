import type { DatabaseSync } from "node:sqlite";

import { cacheLife, cacheTag, updateTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDatabase } from "@/lib/db/database";
import { insertRevision } from "@/lib/db/revisions";

import {
  FIXTURE_PHONE,
  portfolioFixture,
} from "../../tests/fixtures/portfolio-document";
import { createTestDatabase } from "../../tests/support/database";

import {
  CONTENT_CACHE_TAG,
  expirePublishedContent,
  readPublishedContent,
} from "./read-published";

// Fora do Next, "use cache" é só uma string: o que se confere aqui é a leitura e
// as chamadas de cache. O comportamento do cache em si é testado no app rodando.
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  updateTag: vi.fn(),
}));
vi.mock("@/lib/db/database", () => ({ getDatabase: vi.fn() }));

describe("readPublishedContent", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createTestDatabase();
    vi.mocked(getDatabase).mockReturnValue(db);
  });

  afterEach(() => {
    db.close();
  });

  it("devolve null enquanto nada foi publicado", async () => {
    expect(await readPublishedContent()).toBeNull();
  });

  it("devolve a última revisão, sem os campos privados", async () => {
    const revision = insertRevision(
      db,
      portfolioFixture,
      null,
      new Date("2026-10-24T12:00:00.000Z"),
    );

    const content = await readPublishedContent();

    expect(content).toMatchObject({
      revisionId: revision.id,
      publishedAt: "2026-10-24T12:00:00.000Z",
    });
    expect(content?.document.profile).not.toHaveProperty("private");
    expect(JSON.stringify(content)).not.toContain(FIXTURE_PHONE);
  });

  it("fica em cache sem prazo, marcado com a tag do conteúdo", async () => {
    await readPublishedContent();

    expect(cacheLife).toHaveBeenCalledWith("max");
    expect(cacheTag).toHaveBeenCalledWith(CONTENT_CACHE_TAG);
  });
});

describe("expirePublishedContent", () => {
  it("expira a tag do conteúdo, para a próxima visita ler a revisão nova", () => {
    expirePublishedContent();

    expect(updateTag).toHaveBeenCalledWith("content");
  });
});
