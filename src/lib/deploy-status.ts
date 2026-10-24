import "server-only";

import { readFile } from "node:fs/promises";

import { z } from "zod";

const commitSha = z.string().regex(/^[0-9a-f]{40}$/);

/** Schema do arquivo que a VM grava a cada ciclo de deploy. */
const deployStatusSchema = z.object({
  status: z.enum([
    "waiting",
    "blocked",
    "running",
    "ok",
    "failed",
    "rolled-back",
  ]),
  step: z.enum([
    "ci",
    "ci-failed",
    "checkout",
    "build",
    "backup",
    "start",
    "done",
    "healthcheck",
    "rollback",
  ]),
  /** Commit da tentativa de deploy. */
  sha: commitSha,
  /** Commit no ar quando o status foi gravado; vazio antes do primeiro deploy. */
  liveSha: z.union([z.literal(""), commitSha]),
  /** Hora em UTC, no formato `AAAA-MM-DDTHH:MM:SSZ`. */
  at: z.iso.datetime(),
});

/** Situação do último ciclo de deploy da VM, como aparece no `/api/health`. */
export type DeployStatus = z.infer<typeof deployStatusSchema>;

/**
 * Lê o status do último ciclo de deploy gravado pela VM.
 *
 * A VM troca o arquivo de forma atômica a cada ciclo, por isso ele é lido a
 * cada chamada. Qualquer problema vira `null`: o healthcheck nunca pode
 * depender deste arquivo.
 *
 * @param filePath - Caminho de `DEPLOY_STATUS_FILE`, ou `null` fora da VM.
 * @returns O status validado, ou `null` se não houver caminho, se o arquivo
 *   ainda não existir (antes do primeiro ciclo) ou se o conteúdo não seguir o
 *   schema.
 */
export async function readDeployStatus(
  filePath: string | null,
): Promise<DeployStatus | null> {
  if (filePath === null) {
    return null;
  }

  try {
    const content: unknown = JSON.parse(await readFile(filePath, "utf8"));
    const result = deployStatusSchema.safeParse(content);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
