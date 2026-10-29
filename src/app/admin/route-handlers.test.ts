import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  TEST_ADMIN_HOST,
  readyAdminEnv,
} from "../../../tests/support/admin-env";
import {
  NotFoundSignal,
  RedirectSignal,
  resetFakeRequest,
} from "../../../tests/support/next-request";

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
  connection: async () => {},
}));
vi.mock("@/lib/env", () => ({
  getAdminEnv: () => readyAdminEnv(),
  getServerEnv: () => ({ databasePath: ":memory:" }),
}));

/**
 * Todos os route handlers do painel, com os métodos que cada um exporta. Um
 * handler novo precisa entrar aqui: o teste falha enquanto ele estiver fora.
 */
const ROUTE_HANDLERS: Record<
  string,
  { load: () => Promise<object>; methods: string[] }
> = {
  "src/app/admin/export/route.ts": {
    load: () => import("./export/route"),
    methods: ["GET"],
  },
  "src/app/admin/photo/route.ts": {
    load: () => import("./photo/route"),
    methods: ["POST"],
  },
};

const HTTP_METHODS =
  /^export\s+(?:async\s+)?function\s+(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)\b/gm;

function handlerFiles(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const files = readdirSync("src/app/admin", {
    recursive: true,
    encoding: "utf8",
  });
  for (const file of files) {
    if (!/(^|[\\/])route\.tsx?$/.test(file)) {
      continue;
    }
    const relative = `src/app/admin/${file.replaceAll("\\", "/")}`;
    const source = readFileSync(path.resolve(relative), "utf8");
    found.set(
      relative,
      [...source.matchAll(HTTP_METHODS)].map(([, method]) => method ?? ""),
    );
  }
  return found;
}

describe("route handlers do painel", () => {
  beforeEach(() => {
    resetFakeRequest({ host: TEST_ADMIN_HOST });
  });

  it("estão todos na lista, com os mesmos métodos", () => {
    expect(Object.fromEntries(handlerFiles())).toEqual(
      Object.fromEntries(
        Object.entries(ROUTE_HANDLERS).map(([file, { methods }]) => [
          file,
          methods,
        ]),
      ),
    );
  });

  describe.each(
    Object.entries(ROUTE_HANDLERS).flatMap(([file, entry]) =>
      entry.methods.map((method) => ({ file, method, load: entry.load })),
    ),
  )("$method ($file)", ({ method, load }) => {
    async function call(): Promise<unknown> {
      const exports: Record<string, unknown> = { ...(await load()) };
      const handler = exports[method];
      if (typeof handler !== "function") {
        throw new Error(`${method} não é uma função exportada`);
      }
      return handler(
        new NextRequest(`https://${TEST_ADMIN_HOST}/admin`, { method }),
      );
    }

    it("recusa o pedido sem sessão, mandando para o login", async () => {
      await expect(call()).rejects.toEqual(new RedirectSignal("/admin/login"));
    });

    it("responde 404 fora dos hosts do painel", async () => {
      resetFakeRequest({ host: "example.com" });

      await expect(call()).rejects.toBeInstanceOf(NotFoundSignal);
    });
  });
});
