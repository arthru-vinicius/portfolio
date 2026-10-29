import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  TEST_ADMIN_HOST,
  readyAdminEnv,
} from "../../../tests/support/admin-env";
import {
  NotFoundSignal,
  RedirectSignal,
  fakeRequest,
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
  // Fora do Next não há pedido; aqui todo pedido é "de verdade".
  connection: async () => {},
}));
vi.mock("@/lib/env", () => ({
  getAdminEnv: () => readyAdminEnv(),
  getServerEnv: () => ({ databasePath: ":memory:" }),
}));

type Access = "public" | "admin";

/**
 * Todas as Server Actions do projeto, uma entrada por arquivo com
 * `"use server"`. Uma action nova precisa entrar aqui, dizendo se é pública
 * (só o login) ou exige sessão: o teste falha enquanto ela estiver fora.
 */
const SERVER_ACTIONS: Record<
  string,
  { load: () => Promise<object>; actions: Record<string, Access> }
> = {
  "src/app/admin/login/actions.ts": {
    load: () => import("./login/actions"),
    actions: { login: "public" },
  },
  // O contato é do site: público, protegido pelo limite por IP, pelo
  // campo-armadilha e pelo Turnstile.
  "src/app/(site)/[locale]/contact-actions.ts": {
    load: () => import("../(site)/[locale]/contact-actions"),
    actions: { sendContactMessage: "public" },
  },
  "src/app/admin/(panel)/actions.ts": {
    load: () => import("./(panel)/actions"),
    actions: { logout: "admin" },
  },
  "src/app/admin/(panel)/content-actions.ts": {
    load: () => import("./(panel)/content-actions"),
    actions: {
      importDocument: "admin",
      restoreRevision: "admin",
      saveBlock: "admin",
      saveBlockList: "admin",
      saveProfile: "admin",
      saveResumeSettings: "admin",
    },
  },
  "src/app/admin/(panel)/publish-actions.ts": {
    load: () => import("./(panel)/publish-actions"),
    actions: { publishDraft: "admin" },
  },
};

const DIRECTIVE = /["']use server["']/g;

function sourceFiles(): string[] {
  return readdirSync("src", { recursive: true, encoding: "utf8" })
    .map((file) => `src/${file.replaceAll("\\", "/")}`)
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file));
}

function filesWithDirective(): Map<string, string> {
  const found = new Map<string, string>();
  for (const file of sourceFiles()) {
    const source = readFileSync(path.resolve(file), "utf8");
    if (DIRECTIVE.test(source)) {
      found.set(file, source);
    }
    DIRECTIVE.lastIndex = 0;
  }
  return found;
}

function exportedFunctions(source: string): string[] {
  return [...source.matchAll(/^export\s+async\s+function\s+(\w+)/gm)].map(
    ([, name]) => name ?? "",
  );
}

describe("Server Actions", () => {
  beforeEach(() => {
    resetFakeRequest({ host: TEST_ADMIN_HOST });
  });

  it("estão todas na lista, e a lista não tem nada a mais", () => {
    const found = Object.fromEntries(
      [...filesWithDirective()].map(([file, source]) => [
        file,
        exportedFunctions(source).sort(),
      ]),
    );
    const listed = Object.fromEntries(
      Object.entries(SERVER_ACTIONS).map(([file, { actions }]) => [
        file,
        Object.keys(actions).sort(),
      ]),
    );

    expect(found).toEqual(listed);
  });

  it("ficam em arquivos próprios, com a diretiva no topo e só funções exportadas", () => {
    for (const [file, source] of filesWithDirective()) {
      const withoutComments = source.replace(
        /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*/,
        "",
      );
      // Uma action dentro de componente (closure) escaparia da lista.
      expect(source.match(DIRECTIVE), file).toHaveLength(1);
      expect(withoutComments, file).toMatch(/^["']use server["']/);
      expect(source, file).not.toMatch(
        /^export\s+(?!async\s+function\s|type\s)/m,
      );
    }
  });

  describe.each(
    Object.entries(SERVER_ACTIONS).flatMap(([file, entry]) =>
      Object.entries(entry.actions)
        .filter(([, access]) => access === "admin")
        .map(([name]) => ({ file, name, load: entry.load })),
    ),
  )("$name ($file)", ({ name, load }) => {
    async function call(): Promise<unknown> {
      const exports: Record<string, unknown> = { ...(await load()) };
      const action = exports[name];
      if (typeof action !== "function") {
        throw new Error(`${name} não é uma função exportada`);
      }
      // Os argumentos não importam: a action tem que recusar antes de lê-los.
      return action(undefined, new FormData());
    }

    it("recusa o pedido sem sessão, mandando para o login", async () => {
      await expect(call()).rejects.toEqual(new RedirectSignal("/admin/login"));
      expect(fakeRequest.setCookies).toEqual([]);
    });

    it("responde 404 fora dos hosts do painel", async () => {
      resetFakeRequest({ host: "example.com" });

      await expect(call()).rejects.toBeInstanceOf(NotFoundSignal);
    });
  });
});
