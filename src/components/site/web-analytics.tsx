import Script from "next/script";

import { WEB_ANALYTICS_SCRIPT_ORIGIN } from "@/lib/security-headers";

/** O script do Cloudflare Web Analytics. */
export const WEB_ANALYTICS_SCRIPT = `${WEB_ANALYTICS_SCRIPT_ORIGIN}/beacon.min.js`;

/**
 * O Cloudflare Web Analytics das páginas públicas: sem cookie e sem banner. O
 * painel nunca o carrega.
 *
 * O script entra com `lazyOnload`, depois que a página termina de carregar:
 * ele mede a visita pelos tempos que o navegador já guardou, e não disputa a
 * banda com a foto e o texto.
 *
 * @param props.token - O token do site no Web Analytics.
 */
export function WebAnalytics({ token }: { token: string }) {
  return (
    <Script
      src={WEB_ANALYTICS_SCRIPT}
      strategy="lazyOnload"
      data-cf-beacon={JSON.stringify({ token })}
    />
  );
}
