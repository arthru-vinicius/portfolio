/**
 * Roda os testes de ponta a ponta (Playwright) contra o container local, nas
 * condições do servidor de produção: limites de recursos, sem capabilities,
 * `/data` gravável só pelo uid 1001 e o status de deploy montado como somente
 * leitura.
 *
 * Uso: `npm run docker:build && npm run test:e2e`. Argumentos depois de `--`
 * vão para o Playwright (ex.: `npm run test:e2e -- --grep health`).
 */
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const image = process.env.E2E_IMAGE ?? "portfolio-web:local";
const container = "portfolio-e2e";
const port = process.env.E2E_PORT ?? "3100";
const baseURL = `http://127.0.0.1:${port}`;

/** O mesmo comando do healthcheck do compose, rodado de dentro do container. */
const healthcheck =
  "fetch('http://127.0.0.1:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))";

/** Status de deploy fictício, no formato que o servidor grava em /deploy. */
const deployStatus = {
  status: "ok",
  step: "done",
  sha: "0123456789abcdef0123456789abcdef01234567",
  liveSha: "0123456789abcdef0123456789abcdef01234567",
  at: "2026-01-01T00:00:00Z",
};

/** Falha esperada do roteiro, com mensagem para quem roda. */
class E2eSetupError extends Error {}

function docker(args: string[], quiet = false): SpawnSyncReturns<string> {
  return spawnSync("docker", args, {
    encoding: "utf8",
    stdio: quiet ? "pipe" : "inherit",
  });
}

function readImageVersion(): string {
  const result = docker(
    ["image", "inspect", "--format", "{{json .Config.Env}}", image],
    true,
  );
  if (result.status !== 0) {
    throw new E2eSetupError(
      `imagem ${image} não encontrada. Rode antes: npm run docker:build`,
    );
  }
  const env: unknown = JSON.parse(result.stdout);
  const entry = Array.isArray(env)
    ? env.find(
        (item): item is string =>
          typeof item === "string" && item.startsWith("GIT_SHA="),
      )
    : undefined;
  return entry?.slice("GIT_SHA=".length) ?? "";
}

function startContainer(deployDir: string): void {
  const result = docker(
    [
      "run",
      "--detach",
      "--name",
      container,
      "--init",
      "--memory",
      "1g",
      "--cpus",
      "1.5",
      "--pids-limit",
      "512",
      "--cap-drop",
      "ALL",
      "--security-opt",
      "no-new-privileges",
      "--tmpfs",
      "/data:uid=1001,gid=1001,mode=0750",
      "--volume",
      `${deployDir}:/deploy:ro`,
      "--env",
      "DATABASE_PATH=/data/portfolio.db",
      "--env",
      `PUBLIC_ORIGIN=${baseURL}`,
      "--env",
      "ADMIN_HOSTS=127.0.0.1",
      "--env",
      "MAIL_RELAY_URL=",
      "--env",
      "DEPLOY_STATUS_FILE=/deploy/last-deploy.json",
      "--publish",
      `127.0.0.1:${port}:3000`,
      image,
    ],
    true,
  );
  if (result.status !== 0) {
    throw new E2eSetupError(`o container não subiu: ${result.stderr.trim()}`);
  }
}

function waitUntilHealthy(timeoutMs: number): boolean {
  const deadline = Date.now() + timeoutMs;
  const pause = new Int32Array(new SharedArrayBuffer(4));
  while (Date.now() < deadline) {
    const check = docker(["exec", container, "node", "-e", healthcheck], true);
    if (check.status === 0) {
      return true;
    }
    Atomics.wait(pause, 0, 0, 500);
  }
  return false;
}

function runPlaywright(imageVersion: string): number {
  const cli = createRequire(import.meta.url).resolve("@playwright/test/cli");
  const result = spawnSync(
    process.execPath,
    [cli, "test", ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        E2E_BASE_URL: baseURL,
        E2E_EXPECTED_VERSION: imageVersion,
        E2E_DEPLOY_STATUS: JSON.stringify(deployStatus),
      },
    },
  );
  return result.status ?? 1;
}

function main(): number {
  const imageVersion = readImageVersion();
  const deployDir = mkdtempSync(path.join(tmpdir(), "portfolio-e2e-"));
  writeFileSync(
    path.join(deployDir, "last-deploy.json"),
    JSON.stringify(deployStatus),
  );

  docker(["rm", "--force", container], true);
  try {
    startContainer(deployDir);
    // O compose dá 60 s de partida antes de contar falhas.
    if (!waitUntilHealthy(60_000)) {
      docker(["logs", container]);
      throw new E2eSetupError("o healthcheck não passou em 60 s");
    }

    const exitCode = runPlaywright(imageVersion);
    if (exitCode !== 0) {
      console.error("[e2e] log do container:");
      docker(["logs", container]);
    }
    return exitCode;
  } finally {
    docker(["rm", "--force", container], true);
    rmSync(deployDir, { recursive: true, force: true });
  }
}

try {
  process.exitCode = main();
} catch (error) {
  if (!(error instanceof E2eSetupError)) {
    throw error;
  }
  console.error(`[e2e] ${error.message}`);
  process.exitCode = 1;
}
