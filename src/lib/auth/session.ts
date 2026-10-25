import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

/** Validade da sessão do painel: 8 horas, sem renovação automática. */
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

const isProduction = process.env.NODE_ENV === "production";

/**
 * Nome do cookie da sessão. Em produção, o prefixo `__Host-` faz o navegador
 * exigir HTTPS, `Path=/` e nenhum `Domain`: um subdomínio de `arthru.com` não
 * consegue gravar nem sobrescrever o cookie. Em desenvolvimento
 * (`http://localhost`) o prefixo fica de fora, porque exige `Secure`.
 */
export const SESSION_COOKIE_NAME = isProduction
  ? "__Host-portfolio-admin"
  : "portfolio-admin";

/**
 * Atributos do cookie da sessão. O `Secure` é forçado em produção: o app
 * recebe HTTP do túnel, mas o navegador está em HTTPS.
 *
 * @param maxAgeSeconds - Validade em segundos; `0` apaga o cookie.
 * @returns As opções para `cookies().set()`.
 */
export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: "/",
    maxAge: maxAgeSeconds,
  } as const;
}

/** Sessão válida do painel. */
export type AdminSession = {
  issuedAt: Date;
  expiresAt: Date;
};

const payloadSchema = z.object({
  v: z.literal(1),
  iat: z.number().int(),
  exp: z.number().int(),
});

// Folga para relógio: um token emitido "no futuro" por poucos segundos ainda
// vale.
const CLOCK_SKEW_SECONDS = 60;
const MAX_TOKEN_LENGTH = 512;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

/**
 * Deriva a chave que assina as sessões. Ela depende do segredo da sessão, do
 * usuário e do hash da senha: trocar qualquer um dos três derruba todas as
 * sessões abertas.
 *
 * @param secrets - Os três segredos do painel, como vêm do ambiente.
 * @returns A chave HMAC-SHA256.
 */
export function deriveSessionKey(secrets: {
  sessionSecret: string;
  username: string;
  passwordHash: string;
}): Buffer {
  return createHmac("sha256", secrets.sessionSecret)
    .update("portfolio-admin-session\n")
    .update(`${secrets.username}\n`)
    .update(secrets.passwordHash)
    .digest();
}

function sign(key: Buffer, payload: string): Buffer {
  return createHmac("sha256", key).update(payload).digest();
}

/**
 * Cria o token de uma sessão nova: o conteúdo em JSON e a assinatura
 * HMAC-SHA256, ambos em base64url, separados por ponto.
 *
 * @param key - Chave de `deriveSessionKey`.
 * @param now - Hora de emissão; os testes fixam o valor.
 * @returns O token, para o cookie, e a sessão que ele representa.
 */
export function createSessionToken(
  key: Buffer,
  now: Date = new Date(),
): { token: string; session: AdminSession } {
  const iat = Math.floor(now.getTime() / 1000);
  const exp = iat + SESSION_TTL_SECONDS;
  const payload = Buffer.from(JSON.stringify({ v: 1, iat, exp })).toString(
    "base64url",
  );
  const signature = sign(key, payload).toString("base64url");
  return {
    token: `${payload}.${signature}`,
    session: {
      issuedAt: new Date(iat * 1000),
      expiresAt: new Date(exp * 1000),
    },
  };
}

/**
 * Confere a assinatura e a validade de um token de sessão.
 *
 * @param token - Valor do cookie, vindo do navegador (não confiável).
 * @param key - Chave de `deriveSessionKey`.
 * @param now - Hora da conferência; os testes fixam o valor.
 * @returns A sessão, ou `null` se o token estiver adulterado, vencido ou fora
 *   do formato.
 */
export function verifySessionToken(
  token: string,
  key: Buffer,
  now: Date = new Date(),
): AdminSession | null {
  if (token.length > MAX_TOKEN_LENGTH) {
    return null;
  }
  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }
  const [payload = "", signature = ""] = parts;
  if (!BASE64URL.test(payload) || !BASE64URL.test(signature)) {
    return null;
  }

  const expected = sign(key, payload);
  const received = Buffer.from(signature, "base64url");
  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    return null;
  }

  let claims: z.infer<typeof payloadSchema>;
  try {
    claims = payloadSchema.parse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    );
  } catch {
    return null;
  }

  const nowSeconds = Math.floor(now.getTime() / 1000);
  const lifetime = claims.exp - claims.iat;
  if (
    claims.exp <= nowSeconds ||
    claims.iat > nowSeconds + CLOCK_SKEW_SECONDS ||
    lifetime <= 0 ||
    lifetime > SESSION_TTL_SECONDS
  ) {
    return null;
  }
  return {
    issuedAt: new Date(claims.iat * 1000),
    expiresAt: new Date(claims.exp * 1000),
  };
}
