import type { DatabaseSync } from "node:sqlite";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CONTENT_CACHE_TAG } from "@/content/read-published";
import type { PortfolioDocument } from "@/content/schema";
import { SESSION_COOKIE_NAME, createSessionToken } from "@/lib/auth/session";
import { saveDraft } from "@/lib/db/draft";
import { insertRevision, listRevisions } from "@/lib/db/revisions";
import type { AdminEnv } from "@/lib/env";

import { portfolioFixture } from "../../../../tests/fixtures/portfolio-document";
import {
  TEST_ADMIN_HOST,
  readyAdminEnv,
} from "../../../../tests/support/admin-env";
import { createTestDatabase } from "../../../../tests/support/database";
import { resetFakeRequest } from "../../../../tests/support/next-request";

import { versionOf } from "./draft-parts";

const state = vi.hoisted(() => ({
  admin: undefined as unknown as AdminEnv,
  db: undefined as unknown as DatabaseSync,
}));

vi.mock(
  "next/headers",
  async () =>
    (await import("../../../../tests/support/next-request")).nextHeadersMock,
);
vi.mock(
  "next/navigation",
  async () =>
    (await import("../../../../tests/support/next-request")).nextNavigationMock,
);
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  // Fora do Next não há pedido; aqui todo pedido é "de verdade".
  connection: async () => {},
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
}));
vi.mock("@/lib/env", () => ({ getAdminEnv: () => state.admin }));
vi.mock("@/lib/db/database", () => ({ getDatabase: () => state.db }));

const { revalidatePath, updateTag } = await import("next/cache");
const { publishDraft } = await import("./publish-actions");

const copy = (): PortfolioDocument => structuredClone(portfolioFixture);

beforeEach(() => {
  vi.clearAllMocks();
  state.admin = readyAdminEnv();
  state.db = createTestDatabase();
  if (state.admin.status !== "ready") {
    throw new Error("painel desligado");
  }
  resetFakeRequest(
    { host: TEST_ADMIN_HOST },
    {
      [SESSION_COOKIE_NAME]: createSessionToken(state.admin.config.sessionKey)
        .token,
    },
  );
});

afterEach(() => {
  state.db.close();
});

describe("publishDraft", () => {
  it("grava uma revisão nova, com a nota, e expira o cache do site", async () => {
    const document = copy();
    saveDraft(state.db, document, 0);

    const result = await publishDraft({
      version: versionOf(document),
      note: "  Primeira versão  ",
    });

    expect(result).toEqual({
      ok: true,
      revisionId: 1,
      publishedAt: expect.any(String),
    });
    expect(listRevisions(state.db)).toMatchObject([
      { id: 1, note: "Primeira versão" },
    ]);
    expect(updateTag).toHaveBeenCalledWith(CONTENT_CACHE_TAG);
    expect(revalidatePath).toHaveBeenCalledWith("/admin", "layout");
  });

  it("não publica de novo o que já está no ar", async () => {
    const document = copy();
    saveDraft(state.db, document, 0);
    insertRevision(state.db, document);

    await expect(
      publishDraft({ version: versionOf(document), note: "" }),
    ).resolves.toEqual({ ok: false, reason: "unchanged" });
    expect(listRevisions(state.db)).toHaveLength(1);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("recusa publicar um rascunho que mudou desde que a página abriu", async () => {
    const opened = copy();
    const changed = { ...copy(), resume: { summary: { "pt-BR": "", en: "" } } };
    saveDraft(state.db, changed, 0);

    await expect(
      publishDraft({ version: versionOf(opened), note: "" }),
    ).resolves.toEqual({ ok: false, reason: "conflict" });
    expect(listRevisions(state.db)).toEqual([]);
  });

  it("recusa o rascunho incompleto e diz onde, sem gravar nada", async () => {
    const document = copy();
    document.profile.headline.en = "";
    saveDraft(state.db, document, 0);

    await expect(
      publishDraft({ version: versionOf(document), note: "" }),
    ).resolves.toEqual({
      ok: false,
      reason: "incomplete",
      problems: [{ path: "profile.headline.en", message: "falta a tradução" }],
    });
    expect(listRevisions(state.db)).toEqual([]);
    expect(updateTag).not.toHaveBeenCalled();
  });

  it("recusa uma nota longa demais", async () => {
    const document = copy();
    saveDraft(state.db, document, 0);

    await expect(
      publishDraft({ version: versionOf(document), note: "x".repeat(201) }),
    ).resolves.toEqual({
      ok: false,
      reason: "incomplete",
      problems: [{ path: "note", message: "use até 200 caracteres" }],
    });
  });

  it("recusa o rascunho salvo por uma versão mais nova do painel", async () => {
    state.db
      .prepare(
        `INSERT INTO draft (id, schema_version, document, lock_version, updated_at)
         VALUES (1, 99, ?, 1, ?)`,
      )
      .run(
        JSON.stringify({ ...portfolioFixture, schemaVersion: 99 }),
        new Date().toISOString(),
      );

    await expect(publishDraft({ version: "", note: "" })).resolves.toEqual({
      ok: false,
      reason: "newer-version",
    });
  });
});
