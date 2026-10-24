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

import type { AdminConfig } from "@/lib/env";
import type { verifyTurnstileToken } from "@/lib/turnstile";

import { createTestDatabase } from "../../../tests/support/database";

import { LOGIN_RATE_LIMIT, attemptLogin } from "./login";
import { hashPassword, parsePasswordHash } from "./password";
import { deriveSessionKey, verifySessionToken } from "./session";

const USERNAME = "admin-ficticio";
const PASSWORD = "senha-ficticia-de-teste";
const NOW = new Date("2026-10-24T12:00:00.000Z");
const HOSTS = ["portfolio.example.com"];

let config: AdminConfig;

beforeAll(async () => {
  const rawHash = await hashPassword(PASSWORD, { N: 2 ** 14, r: 8, p: 1 });
  const passwordHash = parsePasswordHash(rawHash);
  if (passwordHash === null) {
    throw new Error("hash inválido");
  }
  config = {
    publicOrigin: "https://portfolio.example.com",
    username: USERNAME,
    passwordHash,
    sessionKey: deriveSessionKey({
      sessionSecret: "segredo-ficticio-de-sessao-com-32-caracteres",
      username: USERNAME,
      passwordHash: rawHash,
    }),
    turnstile: { siteKey: "site-key", secretKey: "secret-key" },
  };
});

describe("attemptLogin", () => {
  let db: DatabaseSync;
  let turnstile: ReturnType<typeof vi.fn<typeof verifyTurnstileToken>>;

  beforeEach(() => {
    db = createTestDatabase();
    turnstile = vi.fn<typeof verifyTurnstileToken>(async () => ({ ok: true }));
  });

  afterEach(() => {
    db.close();
  });

  function attempt(
    form: Partial<Record<"username" | "password" | "turnstileToken", unknown>>,
    clientIp: string | null = "203.0.113.7",
  ) {
    return attemptLogin(
      {
        config,
        db,
        hosts: HOSTS,
        clientIp,
        form: {
          username: USERNAME,
          password: PASSWORD,
          turnstileToken: "token-do-widget",
          ...form,
        },
        now: NOW,
      },
      turnstile,
    );
  }

  it("com as credenciais certas, emite uma sessão válida", async () => {
    const outcome = await attempt({});

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(verifySessionToken(outcome.token, config.sessionKey, NOW)).toEqual(
        outcome.session,
      );
    }
  });

  it("confere o token no Turnstile com a ação do login, o IP e os hosts do painel", async () => {
    await attempt({});

    expect(turnstile).toHaveBeenCalledWith({
      secretKey: "secret-key",
      token: "token-do-widget",
      remoteIp: "203.0.113.7",
      expectedAction: "admin-login",
      expectedHostnames: HOSTS,
    });
  });

  it("dá a mesma resposta para usuário errado e para senha errada", async () => {
    expect(await attempt({ username: "outro" })).toEqual({
      ok: false,
      reason: "invalid-credentials",
    });
    expect(await attempt({ password: "errada" })).toEqual({
      ok: false,
      reason: "invalid-credentials",
    });
  });

  it("recusa campos vazios, grandes demais ou que não são texto", async () => {
    for (const form of [
      { username: "" },
      { password: null },
      { turnstileToken: "" },
      { username: new File(["x"], "x.txt") },
      { password: "x".repeat(1025) },
    ]) {
      expect(await attempt(form)).toEqual({
        ok: false,
        reason: "invalid-input",
      });
    }
    expect(turnstile).not.toHaveBeenCalled();
  });

  it("não confere a senha quando o Turnstile recusa", async () => {
    turnstile.mockResolvedValue({
      ok: false,
      reason: "rejected",
      errorCodes: [],
    });

    expect(await attempt({ password: "errada" })).toEqual({
      ok: false,
      reason: "turnstile-rejected",
    });
  });

  it("separa o Turnstile fora do ar da recusa", async () => {
    turnstile.mockResolvedValue({
      ok: false,
      reason: "unavailable",
      errorCodes: [],
    });

    expect(await attempt({})).toEqual({
      ok: false,
      reason: "turnstile-unavailable",
    });
  });

  it("bloqueia o IP depois do limite de tentativas, antes de qualquer verificação", async () => {
    for (let index = 0; index < LOGIN_RATE_LIMIT.limit; index += 1) {
      await attempt({ password: "errada" });
    }
    turnstile.mockClear();

    const outcome = await attempt({});

    expect(outcome).toEqual({
      ok: false,
      reason: "rate-limited",
      retryAfterMs: LOGIN_RATE_LIMIT.windowMs,
    });
    expect(turnstile).not.toHaveBeenCalled();
    // Outro IP continua podendo entrar.
    expect((await attempt({}, "198.51.100.9")).ok).toBe(true);
  });

  it("zera a contagem do IP depois de um login certo", async () => {
    for (let index = 0; index < LOGIN_RATE_LIMIT.limit - 1; index += 1) {
      await attempt({ password: "errada" });
    }
    await attempt({});

    for (let index = 0; index < LOGIN_RATE_LIMIT.limit - 1; index += 1) {
      await attempt({ password: "errada" });
    }
    expect((await attempt({})).ok).toBe(true);
  });

  it("sem o IP, todos os pedidos dividem a mesma contagem", async () => {
    for (let index = 0; index < LOGIN_RATE_LIMIT.limit; index += 1) {
      await attempt({ password: "errada" }, null);
    }

    expect(await attempt({}, null)).toMatchObject({ reason: "rate-limited" });
  });
});
