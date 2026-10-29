import type { DatabaseSync } from "node:sqlite";

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PortfolioDocument } from "@/content/schema";
import { SESSION_COOKIE_NAME, createSessionToken } from "@/lib/auth/session";
import { saveDraft } from "@/lib/db/draft";
import type { AdminEnv } from "@/lib/env";

import {
  FIXTURE_PHONE,
  portfolioFixture,
} from "../../../../../tests/fixtures/portfolio-document";
import {
  TEST_ADMIN_HOST,
  readyAdminEnv,
} from "../../../../../tests/support/admin-env";
import { createTestDatabase } from "../../../../../tests/support/database";
import {
  NotFoundSignal,
  resetFakeRequest,
} from "../../../../../tests/support/next-request";
import { readPdf } from "../../../../../tests/support/pdf";

const state = vi.hoisted(() => ({
  admin: undefined as unknown as AdminEnv,
  db: undefined as unknown as DatabaseSync,
}));

vi.mock(
  "next/headers",
  async () =>
    (await import("../../../../../tests/support/next-request")).nextHeadersMock,
);
vi.mock(
  "next/navigation",
  async () =>
    (await import("../../../../../tests/support/next-request"))
      .nextNavigationMock,
);
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));
vi.mock("@/lib/env", () => ({
  getAdminEnv: () => state.admin,
  getServerEnv: () => ({ publicOrigin: "https://portfolio.example.com" }),
}));
vi.mock("@/lib/db/database", () => ({ getDatabase: () => state.db }));

const { GET } = await import("./route");

function get(file: string, query = "") {
  return GET(
    new NextRequest(`https://${TEST_ADMIN_HOST}/admin/cv/${file}${query}`),
    { params: Promise.resolve({ file }) },
  );
}

function draftWith(change: (document: PortfolioDocument) => void) {
  const document = structuredClone(portfolioFixture);
  change(document);
  saveDraft(state.db, document, 0);
}

describe("GET /admin/cv/[file]", () => {
  beforeEach(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
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

  it("gera o currículo do rascunho, sem telefone", async () => {
    draftWith((document) => {
      document.profile.fullName = "Ana Rascunho";
    });

    const response = await get("curriculo.pdf");
    const pdf = await readPdf(new Uint8Array(await response.arrayBuffer()));

    expect(response.status).toBe(200);
    expect(Object.fromEntries(response.headers)).toMatchObject({
      "content-type": "application/pdf",
      "content-disposition":
        'inline; filename="ana-exemplo-curriculo-rascunho.pdf"',
      "cache-control": "no-store",
    });
    expect(pdf.text).toContain("Ana Rascunho");
    expect(pdf.text).not.toContain(FIXTURE_PHONE);
  });

  it("põe o telefone na versão completa", async () => {
    draftWith(() => {});

    const response = await get("resume.pdf", "?full=1");
    const pdf = await readPdf(new Uint8Array(await response.arrayBuffer()));

    expect(response.headers.get("content-disposition")).toBe(
      'inline; filename="ana-exemplo-resume-completo.pdf"',
    );
    expect(pdf.text).toContain(FIXTURE_PHONE);
  });

  it("responde 404 à versão completa sem telefone e a outro nome", async () => {
    draftWith((document) => {
      document.profile.private = {};
    });

    await expect(get("curriculo.pdf", "?full=1")).rejects.toBeInstanceOf(
      NotFoundSignal,
    );
    await expect(get("curriculo.xlsx")).rejects.toBeInstanceOf(NotFoundSignal);
  });
});
