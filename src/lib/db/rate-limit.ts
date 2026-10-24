import type { DatabaseSync } from "node:sqlite";

import { z } from "zod";

import { withTransaction } from "./transaction";

/** Quantas tentativas cabem numa janela de tempo. */
export type RateLimitRule = {
  limit: number;
  windowMs: number;
};

/** Resultado de uma tentativa. */
export type RateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      /** Quanto falta para a janela acabar. */
      retryAfterMs: number;
    };

const bucketRowSchema = z.object({
  hits: z.number().int(),
  expires_at: z.number().int(),
});

/**
 * Registra uma tentativa e diz se ela cabe no limite. A janela é fixa: começa
 * na primeira tentativa e, quando acaba, a contagem recomeça do zero.
 *
 * @param db - Conexão aberta e migrada.
 * @param key - Identifica quem tenta e o quê (por exemplo, o IP e o login).
 * @param rule - Limite e tamanho da janela.
 * @param now - Hora da tentativa; os testes fixam o valor.
 * @returns Se a tentativa pode seguir e, se não puder, quanto esperar.
 */
export function consumeRateLimit(
  db: DatabaseSync,
  key: string,
  rule: RateLimitRule,
  now: Date = new Date(),
): RateLimitResult {
  const nowMs = now.getTime();
  return withTransaction(db, () => {
    // Limpeza oportunista: sem tarefa agendada, cada tentativa apaga as
    // janelas vencidas, e a tabela fica sempre pequena.
    db.prepare("DELETE FROM rate_limits WHERE expires_at <= ?").run(nowMs);

    const row = db
      .prepare("SELECT hits, expires_at FROM rate_limits WHERE key = ?")
      .get(key);
    if (row === undefined) {
      db.prepare(
        "INSERT INTO rate_limits (key, hits, expires_at) VALUES (?, 1, ?)",
      ).run(key, nowMs + rule.windowMs);
      return { allowed: true };
    }

    const bucket = bucketRowSchema.parse(row);
    if (bucket.hits >= rule.limit) {
      return { allowed: false, retryAfterMs: bucket.expires_at - nowMs };
    }
    db.prepare("UPDATE rate_limits SET hits = hits + 1 WHERE key = ?").run(key);
    return { allowed: true };
  });
}

/**
 * Zera a contagem de uma chave, por exemplo depois de um login certo.
 *
 * @param db - Conexão aberta e migrada.
 * @param key - A mesma chave usada em `consumeRateLimit`.
 */
export function resetRateLimit(db: DatabaseSync, key: string): void {
  db.prepare("DELETE FROM rate_limits WHERE key = ?").run(key);
}
