import "server-only";

import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { getAdminEnv } from "@/lib/env";
import { isAllowedHost } from "@/lib/hosts";

import { ADMIN_LOGIN_PATH } from "./request";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  type AdminSession,
} from "./session";

/**
 * Confere se o pedido pode usar o painel. Toda página, Server Action e route
 * handler do painel chama esta função antes de qualquer outra coisa: o proxy e
 * os layouts não bastam, porque uma Server Action é um endpoint público e um
 * layout não roda de novo a cada navegação.
 *
 * - Host fora da `ADMIN_HOSTS` ou painel sem configuração: 404, sem dizer nada
 *   do painel.
 * - Sem sessão válida: redireciona para o login.
 *
 * @returns A sessão válida.
 */
export async function requireAdmin(): Promise<AdminSession> {
  // Ler cookies não basta para o Next adiar para a hora do pedido: o prefetch
  // de uma página também os lê. A validade da sessão depende da hora atual,
  // que só pode ser lida no pedido de verdade.
  await connection();
  const [requestHeaders, cookieStore] = await Promise.all([
    headers(),
    cookies(),
  ]);
  const adminEnv = getAdminEnv();
  if (
    adminEnv.status !== "ready" ||
    !isAllowedHost(requestHeaders.get("host"), adminEnv.hosts)
  ) {
    notFound();
  }

  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const session =
    token === undefined
      ? null
      : verifySessionToken(token, adminEnv.config.sessionKey);
  if (session === null) {
    redirect(ADMIN_LOGIN_PATH);
  }
  return session;
}
