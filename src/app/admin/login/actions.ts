"use server";

import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { adminMessages } from "@/i18n/admin";
import { attemptLogin, type LoginOutcome } from "@/lib/auth/login";
import { ADMIN_HOME_PATH, getClientIp } from "@/lib/auth/request";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/database";
import { getAdminEnv } from "@/lib/env";
import { isAllowedHost } from "@/lib/hosts";

import type { LoginFormState } from "./state";

function refusalMessage(outcome: Exclude<LoginOutcome, { ok: true }>): string {
  switch (outcome.reason) {
    case "rate-limited":
      return adminMessages.login.rateLimited(
        Math.max(1, Math.ceil(outcome.retryAfterMs / 60_000)),
      );
    case "invalid-input":
      return adminMessages.login.invalidInput;
    case "turnstile-rejected":
      return adminMessages.login.turnstileRejected;
    case "turnstile-unavailable":
      return adminMessages.login.turnstileUnavailable;
    case "invalid-credentials":
      return adminMessages.login.invalidCredentials;
  }
}

/**
 * Login do painel, a única Server Action dele que roda sem sessão. Confere o
 * host, faz a tentativa (`attemptLogin`) e, se der certo, grava o cookie da
 * sessão e vai para o painel.
 *
 * @param previous - Estado anterior do formulário (`useActionState`).
 * @param formData - Usuário, senha e token do Turnstile.
 * @returns O novo estado do formulário, com a mensagem de erro. No sucesso,
 *   não retorna: redireciona para o painel.
 */
export async function login(
  previous: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> {
  const requestHeaders = await headers();
  const adminEnv = getAdminEnv();
  if (!isAllowedHost(requestHeaders.get("host"), adminEnv.hosts)) {
    notFound();
  }

  const typed = formData.get("username");
  const refused = (error: string): LoginFormState => ({
    error,
    username: typeof typed === "string" ? typed : "",
    attempt: previous.attempt + 1,
  });
  if (adminEnv.status !== "ready") {
    return refused(adminMessages.unavailable);
  }

  const clientIp = getClientIp(requestHeaders);
  const outcome = await attemptLogin({
    config: adminEnv.config,
    db: getDatabase(),
    hosts: adminEnv.hosts,
    clientIp,
    form: {
      username: formData.get("username"),
      password: formData.get("password"),
      turnstileToken: formData.get("turnstileToken"),
    },
  });
  const ipForLog = clientIp ?? "desconhecido";
  if (!outcome.ok) {
    console.warn(`[admin] login recusado (${outcome.reason}), ip=${ipForLog}`);
    return refused(refusalMessage(outcome));
  }

  (await cookies()).set(
    SESSION_COOKIE_NAME,
    outcome.token,
    sessionCookieOptions(SESSION_TTL_SECONDS),
  );
  console.info(`[admin] login aceito, ip=${ipForLog}`);
  redirect(ADMIN_HOME_PATH);
}
