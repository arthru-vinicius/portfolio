import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  createSessionToken,
  deriveSessionKey,
  sessionCookieOptions,
  verifySessionToken,
} from "./session";

const SECRETS = {
  sessionSecret: "segredo-ficticio-de-sessao-com-32-caracteres",
  username: "admin-ficticio",
  passwordHash: "scrypt:16384:8:1:sal:hash",
};
const KEY = deriveSessionKey(SECRETS);
const NOW = new Date("2026-10-24T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;

function later(ms: number): Date {
  return new Date(NOW.getTime() + ms);
}

// Monta um token com o conteúdo escolhido, assinado com a chave certa: serve
// para testar as regras de validade, que não dependem da assinatura.
function signed(claims: unknown, key = KEY): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", key)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

describe("sessão do painel", () => {
  it("emite um token que vale por 8 horas", () => {
    const { token, session } = createSessionToken(KEY, NOW);

    expect(session).toEqual({ issuedAt: NOW, expiresAt: later(8 * HOUR) });
    expect(verifySessionToken(token, KEY, later(HOUR))).toEqual(session);
  });

  it("recusa o token vencido", () => {
    const { token } = createSessionToken(KEY, NOW);

    expect(verifySessionToken(token, KEY, later(8 * HOUR))).toBeNull();
  });

  it("recusa o token adulterado", () => {
    const { token } = createSessionToken(KEY, NOW);
    const [payload, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ v: 1, iat: 0, exp: 4102444800 }),
    ).toString("base64url");

    expect(verifySessionToken(`${forged}.${signature}`, KEY, NOW)).toBeNull();
    expect(verifySessionToken(`${payload}.${signature}x`, KEY, NOW)).toBeNull();
  });

  it("recusa o token de uma chave antiga: trocar qualquer segredo derruba as sessões", () => {
    const { token } = createSessionToken(KEY, NOW);

    for (const changed of [
      { ...SECRETS, sessionSecret: `${SECRETS.sessionSecret}!` },
      { ...SECRETS, username: "outro-admin" },
      { ...SECRETS, passwordHash: "scrypt:16384:8:1:sal:outro" },
    ]) {
      expect(
        verifySessionToken(token, deriveSessionKey(changed), NOW),
      ).toBeNull();
    }
  });

  it("recusa conteúdo assinado mas fora das regras", () => {
    const iat = NOW.getTime() / 1000;

    expect(
      verifySessionToken(signed({ v: 2, iat, exp: iat + 60 }), KEY, NOW),
    ).toBeNull();
    // Validade maior que a de uma sessão.
    expect(
      verifySessionToken(
        signed({ v: 1, iat, exp: iat + SESSION_TTL_SECONDS + 1 }),
        KEY,
        NOW,
      ),
    ).toBeNull();
    // Emitido no futuro, além da folga de relógio.
    expect(
      verifySessionToken(
        signed({ v: 1, iat: iat + 3600, exp: iat + 7200 }),
        KEY,
        NOW,
      ),
    ).toBeNull();
    expect(verifySessionToken(signed("texto"), KEY, NOW)).toBeNull();
  });

  it.each(["", ".", "abc", "a.b.c", "não.base64", "x".repeat(600)])(
    "recusa %j sem lançar erro",
    (token) => {
      expect(verifySessionToken(token, KEY, NOW)).toBeNull();
    },
  );

  it("usa cookie HttpOnly, SameSite=Strict e de caminho raiz", () => {
    expect(sessionCookieOptions(60)).toMatchObject({
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60,
    });
  });

  it("dispensa o prefixo __Host- e o Secure fora de produção", () => {
    // Os testes rodam com NODE_ENV=test; em produção, o nome tem o prefixo
    // __Host- e o cookie é Secure (conferido no e2e, contra o container).
    expect(SESSION_COOKIE_NAME).toBe("portfolio-admin");
    expect(sessionCookieOptions(60).secure).toBe(false);
  });
});
