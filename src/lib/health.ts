import "server-only";

import type { DeployStatus } from "./deploy-status";

/** Corpo do `GET /api/health`: o contrato com o healthcheck e com o deploy da VM. */
export type HealthReport = {
  /** `ok` só com o banco aberto e as migrations aplicadas. */
  status: "ok" | "unavailable";
  /** Commit da imagem (`GIT_SHA`), para comparar com a `main`. */
  version: string | null;
  /** Último ciclo de deploy gravado pela VM, ou `null` se não houver. */
  deploy: DeployStatus | null;
};

/** As verificações do health, recebidas por parâmetro para os testes trocarem cada uma. */
export type HealthChecks = {
  version: string | null;
  /** Lança um erro se o banco não estiver pronto. */
  checkDatabase: () => void;
  readDeployStatus: () => Promise<DeployStatus | null>;
};

/**
 * Monta a resposta do health.
 *
 * Responde 200 só quando o banco está pronto, e 503 caso contrário. O status
 * do deploy é informativo e nunca muda o código da resposta. O erro do banco
 * vai para o log do container, e não para a resposta, que é pública. O log
 * leva só a mensagem: o healthcheck repete a cada 30 s, e o erro completo já
 * aparece uma vez na subida.
 *
 * @param checks - As verificações a executar.
 * @returns Uma resposta JSON com `Cache-Control: no-store`.
 */
export async function buildHealthResponse(
  checks: HealthChecks,
): Promise<Response> {
  let databaseReady = true;
  try {
    checks.checkDatabase();
  } catch (error) {
    databaseReady = false;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[health] banco indisponível: ${message}`);
  }

  const report: HealthReport = {
    status: databaseReady ? "ok" : "unavailable",
    version: checks.version,
    deploy: await checks.readDeployStatus(),
  };

  return Response.json(report, {
    status: databaseReady ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
