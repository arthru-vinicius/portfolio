import "server-only";

import { z } from "zod";

import { LOCAL_DATABASE_PATH } from "@/lib/db/paths";

/** Texto opcional em que string vazia conta como ausente, como no arquivo de segredos da VM. */
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional();

/** Origem local do `next dev`, usada quando `PUBLIC_ORIGIN` não está definida. */
const LOCAL_PUBLIC_ORIGIN = "http://localhost:3000";

/**
 * Lê uma origem (`https://host`, sem caminho). Valor fora do formato vira
 * `null`, e não erro: as variáveis que dependem dela desligam o recurso sem
 * derrubar o app.
 */
function parseOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    const isHttp = url.protocol === "https:" || url.protocol === "http:";
    return isHttp && url.origin === value.replace(/\/$/, "")
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    DATABASE_PATH: optionalText,
    GIT_SHA: optionalText,
    DEPLOY_STATUS_FILE: optionalText,
    PUBLIC_ORIGIN: optionalText,
    ALLOW_INDEXING: optionalText,
  })
  .transform((env) => ({
    nodeEnv: env.NODE_ENV,
    // Fora de produção há um caminho local padrão. Em produção, sem o caminho
    // do volume, o banco fica desligado: criar um banco vazio em outro lugar
    // esconderia o erro de configuração.
    databasePath:
      env.DATABASE_PATH ??
      (env.NODE_ENV === "production" ? null : LOCAL_DATABASE_PATH),
    gitSha: env.GIT_SHA ?? null,
    deployStatusFile: env.DEPLOY_STATUS_FILE ?? null,
    /**
     * Origem canônica do site, de onde saem as URLs absolutas e a regra de
     * indexação. Nenhum domínio fica no código: trocar o endereço canônico é
     * só mudar esta variável.
     */
    publicOrigin:
      env.PUBLIC_ORIGIN === undefined
        ? env.NODE_ENV === "development"
          ? LOCAL_PUBLIC_ORIGIN
          : null
        : parseOrigin(env.PUBLIC_ORIGIN),
    /** Só o valor exato `true` libera a indexação; o padrão é não indexar. */
    allowIndexing: env.ALLOW_INDEXING === "true",
  }));

/**
 * Configuração do servidor, já validada. Um valor `null` significa que o
 * recurso que depende dele fica desligado.
 */
export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

/**
 * Valida as variáveis de ambiente do servidor na primeira chamada e devolve a
 * configuração tipada.
 *
 * A validação é preguiçosa porque o `next build` roda sem as variáveis do
 * container: quem precisa delas só as lê em tempo de requisição.
 *
 * @param source - Variáveis a validar. Os testes passam um objeto próprio;
 *   fora deles, o padrão é `process.env`.
 * @returns A configuração validada. Sem `source`, o resultado fica guardado
 *   para as próximas chamadas.
 * @throws {Error} Quando alguma variável tem formato inválido. A mensagem
 *   lista cada problema.
 */
export function getServerEnv(
  source: Record<string, string | undefined> = process.env,
): ServerEnv {
  const useCache = source === process.env;
  if (useCache && cachedEnv) {
    return cachedEnv;
  }

  const result = serverEnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(
      `Variáveis de ambiente inválidas:\n${z.prettifyError(result.error)}`,
    );
  }

  if (useCache) {
    cachedEnv = result.data;
  }
  return result.data;
}
