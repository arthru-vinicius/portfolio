/**
 * Ação do widget do Turnstile no login do painel. A Cloudflare devolve a ação
 * junto com o token, e o servidor confere: um token gerado em outro formulário
 * não serve para entrar no painel.
 *
 * Fica num módulo próprio porque o formulário (no navegador) e a verificação
 * (no servidor) usam o mesmo valor.
 */
export const ADMIN_LOGIN_TURNSTILE_ACTION = "admin-login";
