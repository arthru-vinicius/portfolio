import { connection, type NextRequest } from "next/server";

import { readPublishedContent } from "@/content/read-published";
import { getServerEnv } from "@/lib/env";
import { llmsTxt } from "@/lib/seo/llms-txt";

/**
 * Entrega o `/llms.txt`: o resumo do site e os links do currículo em Markdown
 * e JSON, para assistentes de IA. Sai do conteúdo publicado e muda junto com
 * ele; sem nada publicado, responde 404.
 *
 * Os links são absolutos, na origem canônica (`PUBLIC_ORIGIN`); sem ela, na
 * origem do pedido.
 *
 * @param request - O pedido.
 * @returns O texto, ou 404.
 */
export async function GET(request: NextRequest): Promise<Response> {
  await connection();
  const content = await readPublishedContent();
  if (content === null) {
    return new Response("Not Found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const origin = getServerEnv().publicOrigin ?? request.nextUrl.origin;
  return new Response(llmsTxt(content.document, origin), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
