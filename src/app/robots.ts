import type { MetadataRoute } from "next";
import { headers } from "next/headers";

import { getServerEnv } from "@/lib/env";
import { isIndexable } from "@/lib/indexing";

/**
 * O `robots.txt`, com a mesma regra do `X-Robots-Tag`:
 *
 * - no host canônico, com a indexação liberada, todos os robôs entram (os de
 *   busca e os de IA são bem-vindos), menos no painel, e o sitemap é indicado;
 * - em qualquer outro caso (antes do lançamento ou noutro host), nenhum entra.
 *
 * @returns As regras do `robots.txt`.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const serverEnv = getServerEnv();
  const host = (await headers()).get("host");
  if (!isIndexable(host, serverEnv) || serverEnv.publicOrigin === null) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/admin" },
    sitemap: new URL("/sitemap.xml", serverEnv.publicOrigin).href,
  };
}
