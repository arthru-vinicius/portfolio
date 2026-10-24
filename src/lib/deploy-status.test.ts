import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { readDeployStatus, type DeployStatus } from "./deploy-status";

const running: DeployStatus = {
  status: "running",
  step: "start",
  sha: "0123456789abcdef0123456789abcdef01234567",
  liveSha: "",
  at: "2026-10-24T13:40:00Z",
};

describe("readDeployStatus", () => {
  let directory: string;
  let file: string;

  const write = (content: unknown) =>
    writeFileSync(
      file,
      typeof content === "string" ? content : JSON.stringify(content),
    );

  beforeEach(() => {
    directory = mkdtempSync(path.join(tmpdir(), "portfolio-deploy-"));
    file = path.join(directory, "last-deploy.json");
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it("devolve null fora do servidor, sem caminho configurado", async () => {
    expect(await readDeployStatus(null)).toBeNull();
  });

  it("devolve null antes do primeiro ciclo de deploy, quando o arquivo não existe", async () => {
    expect(await readDeployStatus(file)).toBeNull();
  });

  it("lê o status gravado pelo servidor", async () => {
    write(running);

    expect(await readDeployStatus(file)).toEqual(running);
  });

  it("aceita o commit no ar depois de um deploy concluído", async () => {
    const done = {
      ...running,
      status: "ok",
      step: "done",
      liveSha: running.sha,
    };
    write(done);

    expect(await readDeployStatus(file)).toEqual(done);
  });

  it("descarta campos que não são do contrato", async () => {
    write({ ...running, hostname: "servidor-interno" });

    expect(await readDeployStatus(file)).toEqual(running);
  });

  it.each([
    ["JSON quebrado", "{"],
    ["status desconhecido", { ...running, status: "exploded" }],
    ["passo desconhecido", { ...running, step: "deploy" }],
    ["commit abreviado", { ...running, sha: "0123456" }],
    ["hora fora do formato", { ...running, at: "24/10/2026" }],
    ["campo faltando", { status: "ok", step: "done" }],
  ])("devolve null com %s", async (_case, content) => {
    write(content);

    expect(await readDeployStatus(file)).toBeNull();
  });
});
