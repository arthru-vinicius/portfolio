import { describe, expect, it, vi } from "vitest";

import type { DeployStatus } from "./deploy-status";
import { buildHealthResponse } from "./health";

const failedDeploy: DeployStatus = {
  status: "failed",
  step: "healthcheck",
  sha: "0123456789abcdef0123456789abcdef01234567",
  liveSha: "89abcdef0123456789abcdef0123456789abcdef",
  at: "2026-10-24T13:40:00Z",
};

describe("buildHealthResponse", () => {
  it("responde 200 com a versão e o status do deploy quando o banco está pronto", async () => {
    const response = await buildHealthResponse({
      version: "0123456789abcdef0123456789abcdef01234567",
      checkDatabase: () => {},
      readDeployStatus: async () => failedDeploy,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      status: "ok",
      version: "0123456789abcdef0123456789abcdef01234567",
      deploy: failedDeploy,
    });
  });

  it("responde 503 sem o banco, e o erro fica só no log", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await buildHealthResponse({
      version: null,
      checkDatabase: () => {
        throw new Error("unable to open database file /data/portfolio.db");
      },
      readDeployStatus: async () => null,
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: "unavailable",
      version: null,
      deploy: null,
    });
    expect(log).toHaveBeenCalledWith(
      "[health] banco indisponível: unable to open database file /data/portfolio.db",
    );
  });
});
