import { describe, expect, it } from "vitest";

import { TURNSTILE_SITE_KEY, TURNSTILE_TEST_SITE_KEY } from "@/lib/turnstile";

import { getAdminEnv, getContactEnv, getServerEnv, type AdminEnv } from "./env";

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

// Valores fictícios, no formato que cada variável exige.
const ADMIN_SECRETS = {
  ADMIN_USERNAME: "admin-ficticio",
  ADMIN_PASSWORD_HASH: `scrypt:16384:8:1:${"A".repeat(22)}:${"B".repeat(43)}`,
  ADMIN_SESSION_SECRET: "segredo-ficticio-de-sessao-com-mais-de-32-caracteres",
  TURNSTILE_SECRET_KEY: "secret-ficticia-do-turnstile",
};
const PRODUCTION = {
  NODE_ENV: "production",
  PUBLIC_ORIGIN: "https://portfolio.example.com",
  ADMIN_HOSTS: "portfolio.example.com",
};

function ready(env: AdminEnv) {
  if (env.status !== "ready") {
    throw new Error(
      `o painel deveria estar pronto: ${env.problems.join("; ")}`,
    );
  }
  return env.config;
}

describe("getAdminEnv", () => {
  it("fica pronto com tudo definido", () => {
    const env = getAdminEnv({ ...PRODUCTION, ...ADMIN_SECRETS });

    expect(env.hosts).toEqual(["portfolio.example.com"]);
    expect(ready(env)).toMatchObject({
      publicOrigin: "https://portfolio.example.com",
      username: "admin-ficticio",
      turnstile: {
        siteKey: TURNSTILE_SITE_KEY,
        secretKey: "secret-ficticia-do-turnstile",
      },
    });
  });

  it("desliga o painel, sem lançar erro, quando falta segredo, e diz qual", () => {
    const env = getAdminEnv(PRODUCTION);

    expect(env).toMatchObject({
      status: "disabled",
      hosts: ["portfolio.example.com"],
    });
    expect(env.status === "disabled" && env.problems).toEqual([
      "ADMIN_USERNAME ausente",
      "ADMIN_PASSWORD_HASH ausente",
      "ADMIN_SESSION_SECRET ausente",
      "TURNSTILE_SECRET_KEY ausente",
    ]);
  });

  it("nunca cai num valor de teste em produção", () => {
    const env = getAdminEnv({ NODE_ENV: "production", ...ADMIN_SECRETS });

    expect(env.hosts).toEqual([]);
    expect(env.status === "disabled" && env.problems).toEqual([
      "ADMIN_HOSTS vazia: o painel não responde em nenhum host",
      "PUBLIC_ORIGIN ausente ou fora do formato https://host",
    ]);
  });

  it.each([
    [
      "hash fora do formato",
      { ADMIN_PASSWORD_HASH: "scrypt$16384$8$1$sal$hash" },
      "ADMIN_PASSWORD_HASH fora do formato: gere com npm run admin:hash-password",
    ],
    [
      "segredo de sessão curto",
      { ADMIN_SESSION_SECRET: "curto" },
      "ADMIN_SESSION_SECRET curto: o mínimo é 32 caracteres",
    ],
    [
      "segredo vazio",
      { TURNSTILE_SECRET_KEY: "" },
      "TURNSTILE_SECRET_KEY ausente",
    ],
  ])("desliga o painel com %s", (_case, override, problem) => {
    const env = getAdminEnv({ ...PRODUCTION, ...ADMIN_SECRETS, ...override });

    expect(env.status === "disabled" && env.problems).toEqual([problem]);
  });

  it("lê os segredos exatamente como vêm, sem aparar nada", () => {
    const secret = "  %!<}]-segredo-com-símbolos-e-espaços-nas-pontas  ";
    const config = ready(
      getAdminEnv({
        ...PRODUCTION,
        ...ADMIN_SECRETS,
        TURNSTILE_SECRET_KEY: secret,
        ADMIN_SESSION_SECRET: secret,
      }),
    );
    const trimmed = ready(
      getAdminEnv({
        ...PRODUCTION,
        ...ADMIN_SECRETS,
        ADMIN_SESSION_SECRET: secret.trim(),
      }),
    );

    expect(config.turnstile.secretKey).toBe(secret);
    expect(config.sessionKey.equals(trimmed.sessionKey)).toBe(false);
  });

  it("usa a site key de teste fora de produção, e a variável troca a chave", () => {
    expect(
      ready(getAdminEnv({ NODE_ENV: "development", ...ADMIN_SECRETS }))
        .turnstile.siteKey,
    ).toBe(TURNSTILE_TEST_SITE_KEY);
    expect(
      ready(
        getAdminEnv({
          ...PRODUCTION,
          ...ADMIN_SECRETS,
          TURNSTILE_SITE_KEY: TURNSTILE_TEST_SITE_KEY,
        }),
      ).turnstile.siteKey,
    ).toBe(TURNSTILE_TEST_SITE_KEY);
  });

  it("aceita localhost e 127.0.0.1 no desenvolvimento, sem ADMIN_HOSTS", () => {
    expect(getAdminEnv({ NODE_ENV: "development" }).hosts).toEqual([
      "localhost",
      "127.0.0.1",
    ]);
    expect(getAdminEnv({ NODE_ENV: "test" }).hosts).toEqual([]);
  });

  it("deriva uma chave de sessão nova quando um dos segredos muda", () => {
    const base = ready(getAdminEnv({ ...PRODUCTION, ...ADMIN_SECRETS }));
    const otherUser = ready(
      getAdminEnv({ ...PRODUCTION, ...ADMIN_SECRETS, ADMIN_USERNAME: "outro" }),
    );

    expect(base.sessionKey.equals(otherUser.sessionKey)).toBe(false);
  });

  it("desliga o painel, sem lançar erro, com variáveis do servidor inválidas", () => {
    expect(getAdminEnv({ ...ADMIN_SECRETS, NODE_ENV: "staging" })).toEqual({
      hosts: [],
      status: "disabled",
      problems: ["variáveis do servidor inválidas"],
    });
  });
});

describe("getContactEnv", () => {
  const relay = {
    MAIL_RELAY_URL: "https://relay.example.com/send",
    MAIL_RELAY_TOKEN: " token%com!símbolos ",
  };

  it("em produção, entrega pelo relay, com o token exatamente como veio", () => {
    expect(
      getContactEnv({
        ...PRODUCTION,
        TURNSTILE_SECRET_KEY: "secret-ficticia",
        ...relay,
      }),
    ).toEqual({
      status: "ready",
      turnstile: { siteKey: TURNSTILE_SITE_KEY, secretKey: "secret-ficticia" },
      hostnames: ["portfolio.example.com"],
      delivery: {
        mode: "relay",
        url: "https://relay.example.com/send",
        token: " token%com!símbolos ",
      },
    });
  });

  it("em produção sem o relay, desliga o formulário em vez de fingir que envia", () => {
    expect(
      getContactEnv({ ...PRODUCTION, TURNSTILE_SECRET_KEY: "secret-ficticia" }),
    ).toEqual({
      status: "disabled",
      problems: ["MAIL_RELAY_URL ou MAIL_RELAY_TOKEN ausente"],
    });
  });

  it("só registra no log fora de produção, ou com MAIL_RELAY_DRY_RUN=true", () => {
    const development = getContactEnv({ TURNSTILE_SECRET_KEY: "1x0AA" });
    const dryRun = getContactEnv({
      ...PRODUCTION,
      TURNSTILE_SECRET_KEY: "secret-ficticia",
      MAIL_RELAY_DRY_RUN: "true",
    });

    expect(development).toMatchObject({
      status: "ready",
      delivery: { mode: "log" },
      turnstile: { siteKey: TURNSTILE_TEST_SITE_KEY },
    });
    expect(dryRun).toMatchObject({
      status: "ready",
      delivery: { mode: "log" },
    });
  });

  it("desliga o formulário sem a secret do Turnstile ou com a URL do relay errada", () => {
    expect(getContactEnv({ ...PRODUCTION, ...relay })).toMatchObject({
      status: "disabled",
      problems: ["TURNSTILE_SECRET_KEY ausente"],
    });
    expect(
      getContactEnv({
        ...PRODUCTION,
        TURNSTILE_SECRET_KEY: "secret-ficticia",
        ...relay,
        MAIL_RELAY_URL: "relay sem esquema",
      }),
    ).toMatchObject({ status: "disabled" });
  });
});
