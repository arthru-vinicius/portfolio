import { createHash, timingSafeEqual } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

import { z } from "zod";

import {
  consumeRateLimit,
  resetRateLimit,
  type RateLimitRule,
} from "@/lib/db/rate-limit";
import type { AdminConfig } from "@/lib/env";
import {
  MAX_TURNSTILE_TOKEN_LENGTH,
  verifyTurnstileToken,
} from "@/lib/turnstile";
import { ADMIN_LOGIN_TURNSTILE_ACTION } from "@/lib/turnstile-actions";

import { verifyPassword } from "./password";
import { createSessionToken, type AdminSession } from "./session";

/** Tentativas de login por IP: 5 a cada 15 minutos. */
export const LOGIN_RATE_LIMIT: RateLimitRule = {
  limit: 5,
  windowMs: 15 * 60 * 1000,
};

/** Campos do formulário de login, como chegam do navegador. */
const loginFormSchema = z.object({
  username: z.string().min(1).max(200),
  password: z.string().min(1).max(1024),
  turnstileToken: z.string().min(1).max(MAX_TURNSTILE_TOKEN_LENGTH),
});

/** Resultado de uma tentativa de login. */
export type LoginOutcome =
  | { ok: true; token: string; session: AdminSession }
  | { ok: false; reason: "rate-limited"; retryAfterMs: number }
  | {
      ok: false;
      reason:
        | "invalid-input"
        | "turnstile-rejected"
        | "turnstile-unavailable"
        | "invalid-credentials";
    };

/** O que uma tentativa de login precisa. */
export type LoginAttempt = {
  config: AdminConfig;
  db: DatabaseSync;
  /** Hosts do painel, onde o widget do Turnstile pode ter sido exibido. */
  hosts: readonly string[];
  clientIp: string | null;
  /** Os campos do formulário, ainda não validados. */
  form: Record<"username" | "password" | "turnstileToken", unknown>;
  now?: Date;
};

// Compara em tempo constante mesmo com tamanhos diferentes: o resumo SHA-256
// iguala os tamanhos sem revelar nada do valor certo.
function safeEqual(received: string, expected: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(received), digest(expected));
}

/**
 * Faz uma tentativa de login, na ordem que protege o servidor: limite de
 * tentativas, campos, Turnstile e, por último, a senha, que é a parte cara.
 *
 * Usuário e senha errados levam o mesmo tempo e dão o mesmo resultado, para
 * não revelar qual dos dois falhou. Um login certo zera o limite do IP.
 *
 * @param attempt - Configuração, banco, IP e campos do formulário.
 * @param verifyTurnstile - Verificação do token; os testes passam uma falsa.
 * @returns O token da sessão nova, ou o motivo da recusa.
 */
export async function attemptLogin(
  attempt: LoginAttempt,
  verifyTurnstile: typeof verifyTurnstileToken = verifyTurnstileToken,
): Promise<LoginOutcome> {
  const { config, db, clientIp, now = new Date() } = attempt;
  // Sem o IP (fora do túnel), todos os pedidos dividem a mesma contagem.
  const rateLimitKey = `admin-login:${clientIp ?? "desconhecido"}`;

  const limit = consumeRateLimit(db, rateLimitKey, LOGIN_RATE_LIMIT, now);
  if (!limit.allowed) {
    return {
      ok: false,
      reason: "rate-limited",
      retryAfterMs: limit.retryAfterMs,
    };
  }

  const form = loginFormSchema.safeParse(attempt.form);
  if (!form.success) {
    return { ok: false, reason: "invalid-input" };
  }

  const turnstile = await verifyTurnstile({
    secretKey: config.turnstile.secretKey,
    token: form.data.turnstileToken,
    remoteIp: clientIp,
    expectedAction: ADMIN_LOGIN_TURNSTILE_ACTION,
    expectedHostnames: attempt.hosts,
  });
  if (!turnstile.ok) {
    return {
      ok: false,
      reason:
        turnstile.reason === "unavailable"
          ? "turnstile-unavailable"
          : "turnstile-rejected",
    };
  }

  // A senha é conferida mesmo com o usuário errado, para as duas falhas
  // levarem o mesmo tempo.
  const usernameMatches = safeEqual(form.data.username, config.username);
  const passwordMatches = await verifyPassword(
    form.data.password,
    config.passwordHash,
  );
  if (!usernameMatches || !passwordMatches) {
    return { ok: false, reason: "invalid-credentials" };
  }

  resetRateLimit(db, rateLimitKey);
  const { token, session } = createSessionToken(config.sessionKey, now);
  return { ok: true, token, session };
}
