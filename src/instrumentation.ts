/**
 * Roda uma vez na subida do servidor: abre o banco e aplica as migrations
 * antes da primeira requisição.
 *
 * Uma falha aqui não derruba o processo. O `/api/health` passa a responder 503,
 * o healthcheck reprova o container, e o deploy volta sozinho para a versão
 * anterior, com o erro registrado no log.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  // O build também chama o register, mas não tem banco.
  const { PHASE_PRODUCTION_BUILD } = await import("next/constants");
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
    return;
  }

  const { getDatabase } = await import("@/lib/db/database");
  try {
    getDatabase();
    console.info("[db] banco pronto");
  } catch (error) {
    console.error("[db] o banco não abriu na subida:", error);
  }
}
