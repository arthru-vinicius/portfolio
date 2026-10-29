/** Origem do Turnstile: o script `api.js` e o iframe do desafio. */
export const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

/** Origem do script do Cloudflare Web Analytics. */
export const WEB_ANALYTICS_SCRIPT_ORIGIN =
  "https://static.cloudflareinsights.com";

/**
 * Para onde o script do Web Analytics manda as medições quando é instalado à
 * mão. Pela instalação automática, ele manda para o `/cdn-cgi/rum` do próprio
 * site, que o `'self'` já cobre.
 */
export const WEB_ANALYTICS_REPORT_ORIGIN = "https://cloudflareinsights.com";

/**
 * A área do site: as páginas públicas, que podem ter o Web Analytics, ou o
 * painel, que nunca tem.
 */
export type SecurityArea = "site" | "admin";

/** Opções dos cabeçalhos de segurança. */
export type SecurityHeaderOptions = {
  area: SecurityArea;
  /** No `next dev`, o React e a recarga ao vivo precisam de `eval` e WebSocket. */
  development: boolean;
};

/**
 * A Content Security Policy do site e do painel.
 *
 * Não usa nonce: o site é pré-renderizado em parte (a casca de cada idioma sai
 * pronta do build), e a documentação do Next diz que nonce e pré-renderização
 * parcial não convivem. Sem nonce, os scripts embutidos que o Next escreve na
 * página (os dados do React e o script do tema) pedem `'unsafe-inline'`. A
 * política ainda limita de onde vem cada script, para onde a página se conecta
 * e quem pode pô-la num iframe:
 *
 * - **scripts:** do próprio site, do Turnstile e, só no site público, do Web
 *   Analytics;
 * - **conexões:** com o próprio site e, só no site público, com o receptor do
 *   Web Analytics;
 * - **iframe:** só o do Turnstile, e nenhum site põe estas páginas num iframe;
 * - **o resto:** imagens, fontes e estilos do próprio site; formulários só
 *   para ele; nada de `<object>` nem de `<base>` de fora.
 *
 * @param options - A área e se é desenvolvimento.
 * @returns O valor do cabeçalho, numa linha.
 */
export function contentSecurityPolicy(options: SecurityHeaderOptions): string {
  const analytics = options.area === "site";
  const directives: Record<string, readonly string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      TURNSTILE_ORIGIN,
      ...(analytics ? [WEB_ANALYTICS_SCRIPT_ORIGIN] : []),
      ...(options.development ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": [
      "'self'",
      ...(analytics ? [WEB_ANALYTICS_REPORT_ORIGIN] : []),
      ...(options.development ? ["ws:"] : []),
    ],
    "frame-src": [TURNSTILE_ORIGIN],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; ");
}

/**
 * Os recursos do navegador que nenhuma página do site usa. Desligados, nem um
 * script de fora consegue pedi-los.
 */
const PERMISSIONS_POLICY = [
  "accelerometer",
  "browsing-topics",
  "camera",
  "geolocation",
  "gyroscope",
  "magnetometer",
  "microphone",
  "payment",
  "usb",
]
  .map((feature) => `${feature}=()`)
  .join(", ");

/**
 * Os cabeçalhos de segurança de toda resposta que passa pelo proxy. O HSTS
 * fica à parte, porque depende de o pedido ter chegado por HTTPS.
 *
 * @param options - A área e se é desenvolvimento.
 * @returns Os cabeçalhos, pelo nome.
 */
export function securityHeaders(
  options: SecurityHeaderOptions,
): Record<string, string> {
  return {
    "Content-Security-Policy": contentSecurityPolicy(options),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": PERMISSIONS_POLICY,
    // O `frame-ancestors` da CSP já impede; este vale para navegador antigo.
    "X-Frame-Options": "DENY",
    "Cross-Origin-Opener-Policy": "same-origin",
  };
}
