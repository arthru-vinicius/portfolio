import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

/** Parâmetros de custo do scrypt: memória (`N` e `r`) e repetições (`p`). */
export type ScryptParams = { N: number; r: number; p: number };

/**
 * Parâmetros dos hashes novos, uma das combinações recomendadas pela OWASP:
 * 64 MiB de memória por tentativa e o dobro de tempo de uma passada só. Os
 * parâmetros ficam gravados no próprio hash, então subi-los não invalida os
 * hashes antigos.
 */
export const DEFAULT_SCRYPT_PARAMS: ScryptParams = { N: 2 ** 16, r: 8, p: 2 };

/** Hash de senha já decomposto, pronto para conferir uma senha. */
export type PasswordHash = {
  params: ScryptParams;
  salt: Buffer;
  key: Buffer;
};

const SALT_BYTES = 16;
const KEY_BYTES = 32;

// Faixa aceita na leitura de um hash. O limite de baixo impede que um hash
// fraco passe despercebido; o de cima, que um valor errado peça memória que o
// container não tem.
const MIN_N = 2 ** 14;
const MAX_MEMORY_BYTES = 256 * 1024 * 1024;

// Separado por dois-pontos, e não por `$` (o usual): o carregador de `.env` do
// Next expande `$`, e um hash num `.env.local` chegaria cortado.
const HASH_PATTERN =
  /^scrypt:(\d{1,8}):(\d{1,2}):(\d{1,2}):([A-Za-z0-9_-]+):([A-Za-z0-9_-]+)$/;

function scryptMemory({ N, r }: ScryptParams): number {
  return 128 * N * r;
}

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  params: ScryptParams,
): Promise<Buffer> {
  const options: ScryptOptions = {
    ...params,
    // O padrão do Node (32 MiB) não comporta N = 2^16; o dobro da memória do
    // cálculo deixa folga para o que o OpenSSL aloca além do bloco principal.
    maxmem: 2 * scryptMemory(params),
  };
  return new Promise((resolve, reject) => {
    // NFC: a mesma senha digitada em sistemas diferentes pode chegar com os
    // acentos compostos de jeitos diferentes.
    scrypt(password.normalize("NFC"), salt, keyLength, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

/**
 * Gera o hash de uma senha para o `ADMIN_PASSWORD_HASH`, no formato
 * `scrypt:N:r:p:<sal>:<hash>` (sal e hash em base64url).
 *
 * @param password - A senha, que não pode ser vazia.
 * @param params - Parâmetros de custo; o padrão é `DEFAULT_SCRYPT_PARAMS`. Os
 *   testes usam valores menores para rodar rápido.
 * @returns O hash, com sal aleatório e os parâmetros embutidos.
 * @throws {Error} Se a senha for vazia.
 */
export async function hashPassword(
  password: string,
  params: ScryptParams = DEFAULT_SCRYPT_PARAMS,
): Promise<string> {
  if (password === "") {
    throw new Error("A senha não pode ser vazia.");
  }
  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(password, salt, KEY_BYTES, params);
  return [
    "scrypt",
    params.N,
    params.r,
    params.p,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join(":");
}

/**
 * Lê um hash gerado por `hashPassword` e confere se os parâmetros estão na
 * faixa aceita.
 *
 * @param value - O valor do `ADMIN_PASSWORD_HASH`.
 * @returns O hash decomposto, ou `null` se o formato ou os parâmetros forem
 *   inválidos.
 */
export function parsePasswordHash(value: string): PasswordHash | null {
  const match = HASH_PATTERN.exec(value);
  if (match === null) {
    return null;
  }
  const [, n, r, p, salt, key] = match;
  const params: ScryptParams = { N: Number(n), r: Number(r), p: Number(p) };
  const isPowerOfTwo = (params.N & (params.N - 1)) === 0;
  if (
    !isPowerOfTwo ||
    params.N < MIN_N ||
    params.r < 1 ||
    params.p < 1 ||
    params.p > 16 ||
    scryptMemory(params) > MAX_MEMORY_BYTES
  ) {
    return null;
  }

  const saltBytes = Buffer.from(salt ?? "", "base64url");
  const keyBytes = Buffer.from(key ?? "", "base64url");
  if (
    saltBytes.length < SALT_BYTES ||
    keyBytes.length < KEY_BYTES ||
    keyBytes.length > 64
  ) {
    return null;
  }
  return { params, salt: saltBytes, key: keyBytes };
}

/**
 * Confere uma senha contra o hash, em tempo constante na comparação final.
 *
 * @param password - Senha digitada no login.
 * @param hash - Hash lido por `parsePasswordHash`.
 * @returns `true` se a senha confere.
 */
export async function verifyPassword(
  password: string,
  hash: PasswordHash,
): Promise<boolean> {
  const key = await deriveKey(
    password,
    hash.salt,
    hash.key.length,
    hash.params,
  );
  return timingSafeEqual(key, hash.key);
}
