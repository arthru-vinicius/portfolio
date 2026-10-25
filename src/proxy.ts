import { NextResponse, type NextRequest } from "next/server";

import {
  ADMIN_HOME_PATH,
  ADMIN_LOGIN_PATH,
  adminUrl,
} from "@/lib/auth/request";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getAdminEnv, getServerEnv } from "@/lib/env";
import { isAllowedHost } from "@/lib/hosts";
import { isIndexable } from "@/lib/indexing";

/** Cabeçalhos de toda resposta do painel: nada dele vai para cache ou busca. */
const ADMIN_HEADERS = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

/**
 * Um ano de HSTS, sem `includeSubDomains`: os outros subdomínios do domínio
 * são de outros projetos e não podem herdar a regra.
 */
const HSTS_HEADER = "max-age=31536000";

function isAdminPath(pathname: string): boolean {
  return (
    pathname === ADMIN_HOME_PATH || pathname.startsWith(`${ADMIN_HOME_PATH}/`)
  );
}

/**
 * Protocolo com que o visitante chegou à Cloudflare. O túnel entrega o pedido
 * em HTTP e informa o original em `X-Forwarded-Proto`; pedidos de dentro do
 * container (o healthcheck) não trazem o cabeçalho.
 */
function forwardedProtocol(request: NextRequest): string | null {
  const value = request.headers.get("x-forwarded-proto");
  return value?.split(",")[0]?.trim().toLowerCase() || null;
}

function adminResponse(
  request: NextRequest,
  host: string | null,
): NextResponse {
  const adminEnv = getAdminEnv();
  if (host === null || !isAllowedHost(host, adminEnv.hosts)) {
    return new NextResponse("Not Found", { status: 404 });
  }
  if (adminEnv.status !== "ready") {
    return new NextResponse("Painel indisponível.", { status: 503 });
  }

  // Só as navegações vão para o login. Os POSTs são Server Actions, que
  // conferem a sessão por conta própria e respondem do jeito delas.
  if (request.method === "GET" || request.method === "HEAD") {
    const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    const hasSession =
      token !== undefined &&
      verifySessionToken(token, adminEnv.config.sessionKey) !== null;
    const onLoginPage = request.nextUrl.pathname === ADMIN_LOGIN_PATH;
    if (!hasSession && !onLoginPage) {
      return NextResponse.redirect(
        adminUrl(ADMIN_LOGIN_PATH, host, adminEnv.config.publicOrigin),
      );
    }
    if (hasSession && onLoginPage) {
      return NextResponse.redirect(
        adminUrl(ADMIN_HOME_PATH, host, adminEnv.config.publicOrigin),
      );
    }
  }
  return NextResponse.next();
}

/**
 * Roda antes de cada página. A configuração vem do ambiente do container na
 * hora do pedido, e não do build, que não recebe as variáveis do servidor.
 *
 * - **HTTPS:** com o site em HTTPS (`PUBLIC_ORIGIN`), um pedido que chegou por
 *   HTTP é redirecionado para o mesmo caminho em HTTPS, e as respostas em HTTPS
 *   levam HSTS. Sem isso, o login do painel poderia trafegar em texto aberto.
 * - **Indexação:** fora do host canônico, ou com a indexação desligada, a
 *   resposta leva `X-Robots-Tag: noindex`.
 * - **Painel** (`/admin`): fora da `ADMIN_HOSTS`, 404; sem configuração, 503;
 *   navegação sem sessão vai para o login. É só a primeira barreira: cada
 *   página e cada Server Action do painel confere a sessão de novo.
 *
 * @param request - O pedido recebido.
 * @returns A resposta: a rota seguindo com os cabeçalhos acrescentados, um
 *   redirecionamento ou uma recusa.
 */
export function proxy(request: NextRequest): NextResponse {
  const serverEnv = getServerEnv();
  const { publicOrigin } = serverEnv;
  const httpsSite = publicOrigin?.startsWith("https:") ?? false;
  const protocol = forwardedProtocol(request);
  const { pathname, search } = request.nextUrl;

  if (httpsSite && protocol === "http" && publicOrigin !== null) {
    return NextResponse.redirect(
      new URL(`${pathname}${search}`, publicOrigin),
      308,
    );
  }

  const host = request.headers.get("host");
  let response: NextResponse;
  if (isAdminPath(pathname)) {
    response = adminResponse(request, host);
    for (const [name, value] of Object.entries(ADMIN_HEADERS)) {
      response.headers.set(name, value);
    }
  } else {
    response = NextResponse.next();
    if (!isIndexable(host, serverEnv)) {
      response.headers.set("X-Robots-Tag", "noindex");
    }
  }

  if (httpsSite && protocol === "https") {
    response.headers.set("Strict-Transport-Security", HSTS_HEADER);
  }
  return response;
}

export const config = {
  matcher: [
    // Tudo, menos os arquivos do build e o /api/health: o healthcheck do
    // servidor não pode depender do proxy, nem ser redirecionado por ele.
    "/((?!_next/static|_next/image|api/health).*)",
  ],
};
