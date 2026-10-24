import { connection } from "next/server";

import { getDatabase } from "@/lib/db/database";
import { readDeployStatus } from "@/lib/deploy-status";
import { getServerEnv } from "@/lib/env";
import { buildHealthResponse } from "@/lib/health";

/**
 * `GET /api/health`: contrato com o healthcheck e com o deploy da VM.
 *
 * Responde 200 com o banco aberto e as migrations aplicadas, e 503 caso
 * contrário. O corpo traz só a versão da imagem e o status do último deploy.
 */
export async function GET(): Promise<Response> {
  // Com o Cache Components, um GET sem acesso a dados de requisição seria
  // pré-renderizado no build. O health precisa refletir o processo vivo.
  await connection();

  const env = getServerEnv();
  return buildHealthResponse({
    version: env.gitSha,
    checkDatabase: () => {
      getDatabase();
    },
    readDeployStatus: () => readDeployStatus(env.deployStatusFile),
  });
}
