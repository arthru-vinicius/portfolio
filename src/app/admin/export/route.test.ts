import type { DatabaseSync } from "node:sqlite";

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { parseContentFile } from "@/content/content-file";
import { adminMessages } from "@/i18n/admin";
import { SESSION_COOKIE_NAME, createSessionToken } from "@/lib/auth/session";
import { saveDraft } from "@/lib/db/draft";
import { insertRevision } from "@/lib/db/revisions";
import type { AdminEnv } from "@/lib/env";

import {
  FIXTURE_PHONE,
  portfolioFixture,
} from "../../../../tests/fixtures/portfolio-document";
import {
  TEST_ADMIN_HOST,
  readyAdminEnv,
} from "../../../../tests/support/admin-env";
import { createTestDatabase } from "../../../../tests/support/database";
import {
  NotFoundSignal,
  resetFakeRequest,
} from "../../../../tests/support/next-request";

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
  connection: async () => {},
}));
vi.mock("@/lib/env", () => ({ getAdminEnv: () => state.admin }));
vi.mock("@/lib/db/database", () => ({ getDatabase: () => state.db }));

const { GET } = await import("./route");

function exportRequest(query = ""): NextRequest {
  return new NextRequest(`https://${TEST_ADMIN_HOST}/admin/export${query}`);
}

describe("exportar o arquivo de conteúdo", () => {
  beforeEach(() => {
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

  it("baixa o rascunho inteiro em YAML, com os campos privados, como anexo", async () => {
    saveDraft(state.db, portfolioFixture, 0);

    const response = await GET(exportRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe(
      "application/yaml; charset=utf-8",
    );
    expect(response.headers.get("content-disposition")).toMatch(
      /^attachment; filename="portfolio-rascunho-\d{4}-\d{2}-\d{2}\.yaml"$/,
    );
    const body = await response.text();
    expect(parseContentFile(body)).toEqual(portfolioFixture);
    expect(body).toContain(FIXTURE_PHONE);
    // O aviso de que o arquivo tem os campos privados vem no topo.
    expect(body.startsWith(`# ${adminMessages.backup.fileHeader[0]}\n`)).toBe(
      true,
    );
  });

  it("sem rascunho, baixa a última publicação", async () => {
    const revision = insertRevision(state.db, portfolioFixture);

    const response = await GET(exportRequest());

    expect(response.headers.get("content-disposition")).toBe(
      `attachment; filename="portfolio-revisao-${revision.id}.yaml"`,
    );
  });

  it("baixa uma revisão pelo número", async () => {
    insertRevision(state.db, portfolioFixture);
    const second = insertRevision(state.db, {
      ...portfolioFixture,
      blocks: [],
    });

    const response = await GET(exportRequest(`?revision=${second.id}`));

    expect(parseContentFile(await response.text())).toMatchObject({
      blocks: [],
    });
  });

  it("responde 404 sem conteúdo, ou com uma revisão que não existe", async () => {
    await expect(GET(exportRequest())).rejects.toBeInstanceOf(NotFoundSignal);
    for (const query of ["?revision=7", "?revision=abc", "?revision=0"]) {
      await expect(GET(exportRequest(query))).rejects.toBeInstanceOf(
        NotFoundSignal,
      );
    }
  });
});
