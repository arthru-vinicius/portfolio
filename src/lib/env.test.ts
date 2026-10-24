import { describe, expect, it } from "vitest";

import { getServerEnv } from "./env";

describe("getServerEnv", () => {
  it("usa o banco e a origem locais fora de produção", () => {
    expect(getServerEnv({ NODE_ENV: "development" })).toEqual({
      nodeEnv: "development",
      databasePath: ".data/portfolio.db",
      gitSha: null,
      deployStatusFile: null,
      publicOrigin: "http://localhost:3000",
      allowIndexing: false,
    });
  });

  it("lê as variáveis que o container recebe", () => {
    expect(
      getServerEnv({
        NODE_ENV: "production",
        DATABASE_PATH: "/data/portfolio.db",
        GIT_SHA: "0123456789abcdef0123456789abcdef01234567",
        DEPLOY_STATUS_FILE: "/deploy/last-deploy.json",
        PUBLIC_ORIGIN: "https://portfolio.example.com",
        ALLOW_INDEXING: "false",
      }),
    ).toEqual({
      nodeEnv: "production",
      databasePath: "/data/portfolio.db",
      gitSha: "0123456789abcdef0123456789abcdef01234567",
      deployStatusFile: "/deploy/last-deploy.json",
      publicOrigin: "https://portfolio.example.com",
      allowIndexing: false,
    });
  });

  it("desliga o banco em produção sem DATABASE_PATH, em vez de cair num caminho local", () => {
    expect(getServerEnv({ NODE_ENV: "production" }).databasePath).toBeNull();
  });

  it("não inventa origem em produção", () => {
    expect(getServerEnv({ NODE_ENV: "production" }).publicOrigin).toBeNull();
  });

  it("aceita a origem com barra no fim", () => {
    expect(
      getServerEnv({ PUBLIC_ORIGIN: "https://portfolio.example.com/" })
        .publicOrigin,
    ).toBe("https://portfolio.example.com");
  });

  it.each([
    "https://portfolio.example.com/pt",
    "ftp://portfolio.example.com",
    "portfolio.example.com",
    "https://user@portfolio.example.com",
  ])("trata a origem %j como ausente, sem derrubar o app", (value) => {
    expect(getServerEnv({ PUBLIC_ORIGIN: value }).publicOrigin).toBeNull();
  });

  it("só libera a indexação com o valor exato true", () => {
    expect(getServerEnv({ ALLOW_INDEXING: "true" }).allowIndexing).toBe(true);
    for (const value of ["TRUE", "1", "yes", "false", ""]) {
      expect(getServerEnv({ ALLOW_INDEXING: value }).allowIndexing).toBe(false);
    }
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
