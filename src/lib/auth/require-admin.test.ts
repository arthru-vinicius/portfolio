import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminEnv } from "@/lib/env";

import {
  readyAdminEnv,
  TEST_ADMIN_HOST,
} from "../../../tests/support/admin-env";
import {
  NotFoundSignal,
  RedirectSignal,
  resetFakeRequest,
} from "../../../tests/support/next-request";

import { SESSION_COOKIE_NAME, createSessionToken } from "./session";

const env = vi.hoisted(() => ({ admin: undefined as unknown as AdminEnv }));

vi.mock(
  "next/headers",
  async () =>
    (await import("../../../tests/support/next-request")).nextHeadersMock,
);
vi.mock(
  "next/navigation",
  async () =>
    (await import("../../../tests/support/next-request")).nextNavigationMock,
);
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  // Fora do Next não há pedido; aqui todo pedido é "de verdade".
  connection: async () => {},
}));
vi.mock("@/lib/env", () => ({ getAdminEnv: () => env.admin }));

const { requireAdmin } = await import("./require-admin");

function sessionToken(): string {
  if (env.admin.status !== "ready") {
    throw new Error("painel desligado");
  }
  return createSessionToken(env.admin.config.sessionKey).token;
}

describe("requireAdmin", () => {
  beforeEach(() => {
    env.admin = readyAdminEnv();
  });

  it("devolve a sessão de um pedido com cookie válido no host do painel", async () => {
    resetFakeRequest(
      { host: TEST_ADMIN_HOST },
      { [SESSION_COOKIE_NAME]: sessionToken() },
    );

    await expect(requireAdmin()).resolves.toMatchObject({
      expiresAt: expect.any(Date),
    });
  });

  it("manda para o login sem cookie, ou com cookie adulterado", async () => {
    for (const cookies of [
      {},
      { [SESSION_COOKIE_NAME]: `${sessionToken()}x` },
    ]) {
      resetFakeRequest({ host: TEST_ADMIN_HOST }, cookies);

      await expect(requireAdmin()).rejects.toEqual(
        new RedirectSignal("/admin/login"),
      );
    }
  });

  it("responde 404 fora dos hosts do painel, mesmo com sessão válida", async () => {
    resetFakeRequest(
      { host: "example.com" },
      { [SESSION_COOKIE_NAME]: sessionToken() },
    );

    await expect(requireAdmin()).rejects.toBeInstanceOf(NotFoundSignal);
  });

  it("responde 404 com o painel desligado", async () => {
    env.admin = { hosts: [TEST_ADMIN_HOST], status: "disabled", problems: [] };
    resetFakeRequest({ host: TEST_ADMIN_HOST });

    await expect(requireAdmin()).rejects.toBeInstanceOf(NotFoundSignal);
  });
});
