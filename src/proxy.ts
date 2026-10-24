import { NextResponse, type NextRequest } from "next/server";

import { getServerEnv } from "@/lib/env";
import { isIndexable } from "@/lib/indexing";

/**
 * Roda antes de cada página. A configuração vem do ambiente do container na
 * hora do pedido, e não do build, que não recebe as variáveis do servidor.
 *
 * Fora do host canônico, ou com a indexação desligada, a resposta leva
 * `X-Robots-Tag: noindex`.
 *
 * @param request - O pedido recebido.
 * @returns A resposta seguindo para a rota, com os cabeçalhos acrescentados.
 */
export function proxy(request: NextRequest): NextResponse {
  const response = NextResponse.next();
  if (!isIndexable(request.headers.get("host"), getServerEnv())) {
    response.headers.set("X-Robots-Tag", "noindex");
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
