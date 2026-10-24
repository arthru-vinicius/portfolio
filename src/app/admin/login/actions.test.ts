import type { DatabaseSync } from "node:sqlite";

import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { adminMessages } from "@/i18n/admin";
import { hashPassword, parsePasswordHash } from "@/lib/auth/password";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  verifySessionToken,
} from "@/lib/auth/session";
import type { AdminEnv } from "@/lib/env";

import {
  TEST_ADMIN_HOST,
  readyAdminEnv,
} from "../../../../tests/support/admin-env";
import { createTestDatabase } from "../../../../tests/support/database";
import {
  NotFoundSignal,
  RedirectSignal,
  fakeRequest,
  resetFakeRequest,
} from "../../../../tests/support/next-request";

import { INITIAL_LOGIN_STATE } from "./state";

const PASSWORD = "senha-ficticia-de-teste";

const state = vi.hoisted(() => ({
  admin: undefined as unknown as AdminEnv,
  db: undefined as unknown as DatabaseSync,
  turnstileOk: true,
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
vi.mock("@/lib/env", () => ({ getAdminEnv: () => state.admin }));
vi.mock("@/lib/db/database", () => ({ getDatabase: () => state.db }));
vi.mock("@/lib/turnstile", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/turnstile")>()),
  verifyTurnstileToken: async () =>
    state.turnstileOk
      ? { ok: true }
      : { ok: false, reason: "rejected", errorCodes: [] },
}));

const { login } = await import("./actions");

let readyWithPassword: AdminEnv;

beforeAll(async () => {
  const passwordHash = parsePasswordHash(
    await hashPassword(PASSWORD, { N: 2 ** 14, r: 8, p: 1 }),
  );
  if (passwordHash === null) {
    throw new Error("hash inválido");
  }
  readyWithPassword = readyAdminEnv({ passwordHash });
});

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    data.set(name, value);
  }
  return data;
}

const VALID = {
  username: "admin-ficticio",
  password: PASSWORD,
  turnstileToken: "token-do-widget",
};

describe("login (Server Action)", () => {
  beforeEach(() => {
    state.admin = readyWithPassword;
    state.db = createTestDatabase();
    state.turnstileOk = true;
    resetFakeRequest({
      host: TEST_ADMIN_HOST,
      "cf-connecting-ip": "203.0.113.7",
    });
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    state.db.close();
  });

  it("grava a sessão num cookie HttpOnly e Strict e vai para o painel", async () => {
    await expect(login(INITIAL_LOGIN_STATE, form(VALID))).rejects.toEqual(
      new RedirectSignal("/admin"),
    );

    expect(fakeRequest.setCookies).toHaveLength(1);
    const [cookie] = fakeRequest.setCookies;
    expect(cookie?.name).toBe(SESSION_COOKIE_NAME);
    expect(cookie?.options).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    if (state.admin.status === "ready") {
      expect(
        verifySessionToken(cookie?.value ?? "", state.admin.config.sessionKey),
      ).not.toBeNull();
    }
  });

  it("devolve a mensagem genérica e o usuário digitado, sem gravar cookie", async () => {
    const next = await login(
      INITIAL_LOGIN_STATE,
      form({ ...VALID, password: "errada" }),
    );

    expect(next).toEqual({
      error: adminMessages.login.invalidCredentials,
      username: "admin-ficticio",
      attempt: 1,
    });
    expect(fakeRequest.setCookies).toEqual([]);
  });

  it("registra no log a recusa, com o motivo e o IP, mas sem a senha", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await login(INITIAL_LOGIN_STATE, form({ ...VALID, password: "errada" }));

    expect(warn).toHaveBeenCalledWith(
      "[admin] login recusado (invalid-credentials), ip=203.0.113.7",
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain("errada");
  });

  it("explica quando a verificação do Turnstile não passou", async () => {
    state.turnstileOk = false;

    const next = await login(INITIAL_LOGIN_STATE, form(VALID));

    expect(next.error).toBe(adminMessages.login.turnstileRejected);
  });

  it("avisa quanto esperar depois do limite de tentativas", async () => {
    let current = INITIAL_LOGIN_STATE;
    for (let index = 0; index < 5; index += 1) {
      current = await login(current, form({ ...VALID, password: "errada" }));
    }

    const next = await login(current, form(VALID));

    expect(next).toMatchObject({
      error: adminMessages.login.rateLimited(15),
      attempt: 6,
    });
  });

  it("responde 404 fora dos hosts do painel", async () => {
    resetFakeRequest({ host: "example.com" });

    await expect(
      login(INITIAL_LOGIN_STATE, form(VALID)),
    ).rejects.toBeInstanceOf(NotFoundSignal);
  });

  it("não tenta nada com o painel desligado", async () => {
    state.admin = {
      hosts: [TEST_ADMIN_HOST],
      status: "disabled",
      problems: [],
    };

    const next = await login(INITIAL_LOGIN_STATE, form(VALID));

    expect(next.error).toBe(adminMessages.unavailable);
    expect(fakeRequest.setCookies).toEqual([]);
  });
});
