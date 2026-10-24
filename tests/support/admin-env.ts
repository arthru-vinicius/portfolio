import { deriveSessionKey } from "@/lib/auth/session";
import type { AdminConfig, AdminEnv } from "@/lib/env";

/** Host do painel nos testes. */
export const TEST_ADMIN_HOST = "portfolio.example.com";

/**
 * Configuração fictícia e pronta do painel. O hash não confere com nenhuma
 * senha: quem precisa de login de verdade monta a própria configuração.
 *
 * @param overrides - Campos a trocar.
 * @returns A situação do painel, como a de `getAdminEnv()`.
 */
export function readyAdminEnv(overrides: Partial<AdminConfig> = {}): AdminEnv {
  return {
    hosts: [TEST_ADMIN_HOST],
    status: "ready",
    config: {
      publicOrigin: `https://${TEST_ADMIN_HOST}`,
      username: "admin-ficticio",
      passwordHash: {
        params: { N: 16384, r: 8, p: 1 },
        salt: Buffer.alloc(16),
        key: Buffer.alloc(32),
      },
      sessionKey: deriveSessionKey({
        sessionSecret: "segredo-ficticio-de-sessao-com-32-caracteres",
        username: "admin-ficticio",
        passwordHash: "hash-ficticio",
      }),
      turnstile: { siteKey: "site-key", secretKey: "secret-key" },
      ...overrides,
    },
  };
}
