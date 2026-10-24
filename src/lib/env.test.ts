import { describe, expect, it } from "vitest";

import { getServerEnv } from "./env";

describe("getServerEnv", () => {
  it("usa o banco local fora de produção", () => {
    expect(getServerEnv({ NODE_ENV: "development" })).toEqual({
      nodeEnv: "development",
      databasePath: ".data/portfolio.db",
      gitSha: null,
      deployStatusFile: null,
    });
  });

  it("lê as variáveis que o container recebe", () => {
    expect(
      getServerEnv({
        NODE_ENV: "production",
        DATABASE_PATH: "/data/portfolio.db",
        GIT_SHA: "0123456789abcdef0123456789abcdef01234567",
        DEPLOY_STATUS_FILE: "/deploy/last-deploy.json",
      }),
    ).toEqual({
      nodeEnv: "production",
      databasePath: "/data/portfolio.db",
      gitSha: "0123456789abcdef0123456789abcdef01234567",
      deployStatusFile: "/deploy/last-deploy.json",
    });
  });

  it("desliga o banco em produção sem DATABASE_PATH, em vez de cair num caminho local", () => {
    expect(getServerEnv({ NODE_ENV: "production" }).databasePath).toBeNull();
  });

  it("trata valor vazio ou só com espaços como ausente", () => {
    expect(
      getServerEnv({
        NODE_ENV: "production",
        DATABASE_PATH: "  ",
        GIT_SHA: "",
      }),
    ).toMatchObject({ databasePath: null, gitSha: null });
  });

  it("assume desenvolvimento quando NODE_ENV não existe", () => {
    expect(getServerEnv({}).nodeEnv).toBe("development");
  });

  it("recusa um NODE_ENV desconhecido, com mensagem que aponta a variável", () => {
    expect(() => getServerEnv({ NODE_ENV: "staging" })).toThrow(
      /Variáveis de ambiente inválidas[\s\S]*NODE_ENV/,
    );
  });
});
