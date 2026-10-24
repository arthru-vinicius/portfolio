import { describe, expect, it } from "vitest";

import {
  DEFAULT_SCRYPT_PARAMS,
  hashPassword,
  parsePasswordHash,
  verifyPassword,
  type ScryptParams,
} from "./password";

// O menor custo aceito, para os testes rodarem rápido. O padrão dos hashes de
// verdade é quatro vezes mais pesado.
const FAST: ScryptParams = { N: 2 ** 14, r: 8, p: 1 };
const PASSWORD = "senha-ficticia-de-teste";

async function parsedHash(password: string) {
  const hash = parsePasswordHash(await hashPassword(password, FAST));
  if (hash === null) {
    throw new Error("o hash gerado deveria ser lido de volta");
  }
  return hash;
}

describe("hash da senha do painel", () => {
  it("gera o formato scrypt:N:r:p:sal:hash, sem cifrão nem aspas", async () => {
    const hash = await hashPassword(PASSWORD, FAST);

    expect(hash).toMatch(
      /^scrypt:16384:8:1:[A-Za-z0-9_-]{22}:[A-Za-z0-9_-]{43}$/,
    );
    expect(hash).not.toMatch(/[$'"\s]/);
  });

  it("usa um sal novo a cada hash", async () => {
    expect(await hashPassword(PASSWORD, FAST)).not.toBe(
      await hashPassword(PASSWORD, FAST),
    );
  });

  it("aceita a senha certa e recusa as outras", async () => {
    const hash = await parsedHash(PASSWORD);

    expect(await verifyPassword(PASSWORD, hash)).toBe(true);
    expect(await verifyPassword(`${PASSWORD} `, hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("trata do mesmo jeito os acentos compostos e decompostos", async () => {
    const hash = await parsedHash("coração");

    expect(await verifyPassword("coração", hash)).toBe(true);
  });

  it("recusa gerar hash de senha vazia", async () => {
    await expect(hashPassword("", FAST)).rejects.toThrow(/vazia/);
  });

  it("usa por padrão o custo recomendado pela OWASP", () => {
    expect(DEFAULT_SCRYPT_PARAMS).toEqual({ N: 65536, r: 8, p: 2 });
  });

  it("lê os parâmetros gravados no hash", async () => {
    const hash = await parsedHash(PASSWORD);

    expect(hash.params).toEqual(FAST);
    expect(hash.salt).toHaveLength(16);
    expect(hash.key).toHaveLength(32);
  });

  it.each([
    ["formato antigo com cifrão", "scrypt$16384$8$1$c2FsdA$aGFzaA"],
    ["outro algoritmo", "bcrypt:16384:8:1:AAAAAAAAAAAAAAAAAAAAAA:AAAA"],
    [
      "N que não é potência de 2",
      "scrypt:16385:8:1:AAAAAAAAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    ],
    [
      "custo abaixo do mínimo",
      "scrypt:1024:8:1:AAAAAAAAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    ],
    [
      "memória acima do limite",
      "scrypt:1048576:8:1:AAAAAAAAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    ],
    [
      "sal curto",
      "scrypt:16384:8:1:AAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    ],
    ["hash curto", "scrypt:16384:8:1:AAAAAAAAAAAAAAAAAAAAAA:AAAA"],
    [
      "caractere fora do base64url",
      "scrypt:16384:8:1:AAAAAAAAAAAAAAAAAAAAAA:AAAA+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    ],
    [
      "espaço no fim",
      "scrypt:16384:8:1:AAAAAAAAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA ",
    ],
  ])("recusa ler um hash com %s", (_case, value) => {
    expect(parsePasswordHash(value)).toBeNull();
  });
});
