import "server-only";

import { z } from "zod";

import { parsePasswordHash, type PasswordHash } from "@/lib/auth/password";
import { deriveSessionKey } from "@/lib/auth/session";
import { LOCAL_DATABASE_PATH } from "@/lib/db/paths";
import { parseHostList } from "@/lib/hosts";
import { TURNSTILE_SITE_KEY, TURNSTILE_TEST_SITE_KEY } from "@/lib/turnstile";

/** Texto opcional em que string vazia conta como ausente, como no arquivo de segredos da VM. */
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional();

/**
 * Segredo opcional, lido exatamente como veio: aparar mudaria o valor (um token
 * pode ter espaço ou símbolo nas pontas). Vazio conta como ausente.
 */
const optionalSecret = z
  .string()
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

/** Configuração completa do painel, presente só quando nada falta. */
export type AdminConfig = {
  /** Origem canônica (`PUBLIC_ORIGIN`); dela sai o protocolo dos redirecionamentos. */
  publicOrigin: string;
  username: string;
  passwordHash: PasswordHash;
  /** Chave que assina as sessões, derivada dos três segredos do painel. */
  sessionKey: Buffer;
  turnstile: { siteKey: string; secretKey: string };
};

/**
 * Situação do painel. Os hosts valem mesmo com o painel desligado: fora deles,
 * a resposta é 404, e não 503.
 */
export type AdminEnv = { hosts: readonly string[] } & (
  | { status: "ready"; config: AdminConfig }
  | { status: "disabled"; problems: readonly string[] }
);

const adminEnvSchema = z.object({
  ADMIN_HOSTS: optionalText,
  ADMIN_USERNAME: optionalSecret,
  ADMIN_PASSWORD_HASH: optionalSecret,
  ADMIN_SESSION_SECRET: optionalSecret,
  TURNSTILE_SITE_KEY: optionalText,
  TURNSTILE_SECRET_KEY: optionalSecret,
});

/** Tamanho mínimo do `ADMIN_SESSION_SECRET`. */
export const MIN_SESSION_SECRET_LENGTH = 32;

/** Hosts do painel no `next dev`, quando `ADMIN_HOSTS` não está definida. */
const DEVELOPMENT_ADMIN_HOSTS = ["localhost", "127.0.0.1"];

// As secrets de teste do Turnstile, públicas na documentação da Cloudflare:
// com elas, a verificação sempre passa (ou sempre falha).
const TURNSTILE_TEST_SECRET = /^[123]x0+AA$/;

function readAdminEnv(source: Record<string, string | undefined>): AdminEnv {
  let serverEnv: ServerEnv;
  try {
    serverEnv = getServerEnv(source);
  } catch {
    return {
      hosts: [],
      status: "disabled",
      problems: ["variáveis do servidor inválidas"],
    };
  }
  const parsed = adminEnvSchema.safeParse(source);
  if (!parsed.success) {
    return {
      hosts: [],
      status: "disabled",
      problems: ["variáveis do painel inválidas"],
    };
  }

  const {
    ADMIN_HOSTS: rawHosts,
    ADMIN_USERNAME: username,
    ADMIN_PASSWORD_HASH: rawPasswordHash,
    ADMIN_SESSION_SECRET: sessionSecret,
    TURNSTILE_SITE_KEY: siteKeyOverride,
    TURNSTILE_SECRET_KEY: secretKey,
  } = parsed.data;
  const { nodeEnv, publicOrigin } = serverEnv;
  const hosts =
    rawHosts === undefined && nodeEnv === "development"
      ? DEVELOPMENT_ADMIN_HOSTS
      : parseHostList(rawHosts);
  const passwordHash =
    rawPasswordHash === undefined ? null : parsePasswordHash(rawPasswordHash);
  // A variável só existe para os testes trocarem pela chave de teste. Fora de
  // produção, o padrão é a de teste: a real nunca roda fora do servidor.
  const siteKey =
    siteKeyOverride ??
    (nodeEnv === "production" ? TURNSTILE_SITE_KEY : TURNSTILE_TEST_SITE_KEY);

  const problems: string[] = [];
  if (hosts.length === 0) {
    problems.push("ADMIN_HOSTS vazia: o painel não responde em nenhum host");
  }
  if (publicOrigin === null) {
    problems.push("PUBLIC_ORIGIN ausente ou fora do formato https://host");
  }
  if (username === undefined) {
    problems.push("ADMIN_USERNAME ausente");
  }
  if (rawPasswordHash === undefined) {
    problems.push("ADMIN_PASSWORD_HASH ausente");
  } else if (passwordHash === null) {
    problems.push(
      "ADMIN_PASSWORD_HASH fora do formato: gere com npm run admin:hash-password",
    );
  }
  if (sessionSecret === undefined) {
    problems.push("ADMIN_SESSION_SECRET ausente");
  } else if (sessionSecret.length < MIN_SESSION_SECRET_LENGTH) {
    problems.push(
      `ADMIN_SESSION_SECRET curto: o mínimo é ${MIN_SESSION_SECRET_LENGTH} caracteres`,
    );
  }
  if (secretKey === undefined) {
    problems.push("TURNSTILE_SECRET_KEY ausente");
  }

  // Cada problema acima corresponde a uma destas condições; repeti-las aqui é
  // o que deixa o TypeScript estreitar os tipos.
  if (
    problems.length > 0 ||
    publicOrigin === null ||
    username === undefined ||
    rawPasswordHash === undefined ||
    passwordHash === null ||
    sessionSecret === undefined ||
    secretKey === undefined
  ) {
    return { hosts, status: "disabled", problems };
  }
  return {
    hosts,
    status: "ready",
    config: {
      publicOrigin,
      username,
      passwordHash,
      sessionKey: deriveSessionKey({
        sessionSecret,
        username,
        passwordHash: rawPasswordHash,
      }),
      turnstile: { siteKey, secretKey },
    },
  };
}

let cachedAdminEnv: AdminEnv | undefined;

/**
 * Lê a configuração do painel. Nunca lança: segredo ausente ou inválido
 * desliga o painel (falha fechada), e o resto do site segue no ar.
 *
 * Em desenvolvimento, `ADMIN_HOSTS` tem padrão local. Os segredos não têm
 * padrão em nenhum ambiente.
 *
 * @param source - Variáveis a ler. Os testes passam um objeto próprio; fora
 *   deles, o padrão é `process.env`.
 * @returns A situação do painel. Sem `source`, o resultado fica guardado, e os
 *   problemas vão para o log uma vez.
 */
export function getAdminEnv(
  source: Record<string, string | undefined> = process.env,
): AdminEnv {
  const useCache = source === process.env;
  if (useCache && cachedAdminEnv) {
    return cachedAdminEnv;
  }

  const adminEnv = readAdminEnv(source);
  if (useCache) {
    cachedAdminEnv = adminEnv;
    if (adminEnv.status === "disabled") {
      console.warn(`[admin] painel desligado: ${adminEnv.problems.join("; ")}`);
    } else if (
      source.NODE_ENV === "production" &&
      TURNSTILE_TEST_SECRET.test(adminEnv.config.turnstile.secretKey)
    ) {
      console.warn(
        "[admin] TURNSTILE_SECRET_KEY é uma chave de teste da Cloudflare: o Turnstile não protege o login",
      );
    }
  }
  return adminEnv;
}
