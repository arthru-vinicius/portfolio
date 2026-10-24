import { isIP } from "node:net";

/** Caminho do painel. */
export const ADMIN_HOME_PATH = "/admin";

/** Caminho do login do painel, a única página dele aberta sem sessão. */
export const ADMIN_LOGIN_PATH = "/admin/login";

/** O pedaço dos cabeçalhos do pedido que estas funções leem. */
type RequestHeaders = { get(name: string): string | null };

/**
 * IP do visitante, para o limite de tentativas e para o Turnstile.
 *
 * O tráfego só chega pelo túnel da Cloudflare, que grava o IP original em
 * `CF-Connecting-IP`; o visitante não consegue forjar esse cabeçalho. Sem ele
 * (no desenvolvimento e nos testes), o resultado é `null`.
 *
 * @param headers - Cabeçalhos do pedido.
 * @returns O IP, ou `null` se o cabeçalho faltar ou não for um IP.
 */
export function getClientIp(headers: RequestHeaders): string | null {
  const value = headers.get("cf-connecting-ip")?.trim() ?? "";
  return isIP(value) === 0 ? null : value;
}

/**
 * Monta uma URL do painel no mesmo host do pedido.
 *
 * O site responde em mais de um endereço, e o cookie da sessão é de cada um:
 * redirecionar para outro host jogaria o visitante numa sessão diferente. O
 * protocolo vem do `PUBLIC_ORIGIN`, porque o app recebe HTTP do túnel enquanto
 * o navegador está em HTTPS.
 *
 * @param path - Caminho dentro do painel.
 * @param hostHeader - Cabeçalho `Host`, já conferido contra a `ADMIN_HOSTS`.
 * @param publicOrigin - Origem canônica, de onde sai o protocolo.
 * @returns A URL absoluta.
 */
export function adminUrl(
  path: string,
  hostHeader: string,
  publicOrigin: string,
): URL {
  const { protocol } = new URL(publicOrigin);
  return new URL(path, `${protocol}//${hostHeader}`);
}
