"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ADMIN_LOGIN_PATH } from "@/lib/auth/request";
import { requireAdmin } from "@/lib/auth/require-admin";
import { SESSION_COOKIE_NAME, sessionCookieOptions } from "@/lib/auth/session";

/**
 * Encerra a sessão: apaga o cookie e volta para o login.
 *
 * A sessão não fica guardada no servidor, então quem tiver uma cópia do cookie
 * continua entrando até ele vencer. Para derrubar todas as sessões de uma vez,
 * troque o `ADMIN_SESSION_SECRET`.
 */
export async function logout(): Promise<void> {
  await requireAdmin();
  (await cookies()).set(SESSION_COOKIE_NAME, "", sessionCookieOptions(0));
  console.info("[admin] sessão encerrada");
  redirect(ADMIN_LOGIN_PATH);
}
