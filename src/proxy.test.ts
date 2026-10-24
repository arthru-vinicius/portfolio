import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSessionToken } from "@/lib/auth/session";
import type { AdminEnv } from "@/lib/env";

import { readyAdminEnv } from "../tests/support/admin-env";

const env = vi.hoisted(() => ({
  server: {
    publicOrigin: "https://portfolio.example.com" as string | null,
    allowIndexing: true,
  },
  admin: undefined as unknown as AdminEnv,
}));

vi.mock("@/lib/env", () => ({
  getServerEnv: () => env.server,
  getAdminEnv: () => env.admin,
}));

const { config, proxy } = await import("./proxy");

function request(
  path: string,
  options: {
    host?: string;
    method?: string;
    cookie?: string;
    protocol?: string;
  } = {},
): NextRequest {
  const host = options.host ?? "portfolio.example.com";
  const headers = new Headers({ host });
  if (options.cookie !== undefined) {
    headers.set("cookie", `portfolio-admin=${options.cookie}`);
  }
  if (options.protocol !== undefined) {
    headers.set("x-forwarded-proto", options.protocol);
  }
  return new NextRequest(`http://${host}${path}`, {
    method: options.method ?? "GET",
    headers,
  });
}

function validSession(): string {
  if (env.admin.status !== "ready") {
    throw new Error("painel desligado");
  }
  return createSessionToken(env.admin.config.sessionKey).token;
}

describe("proxy", () => {
  beforeEach(() => {
    env.server = {
      publicOrigin: "https://portfolio.example.com",
      allowIndexing: true,
    };
    env.admin = readyAdminEnv();
  });

  describe("indexação", () => {
    it("deixa o host canônico indexável quando a indexação está liberada", () => {
      expect(proxy(request("/")).headers.get("x-robots-tag")).toBeNull();
    });

    it("pede para não indexar os outros hosts", () => {
      expect(
        proxy(request("/", { host: "example.com" })).headers.get(
          "x-robots-tag",
        ),
      ).toBe("noindex");
    });

    it("pede para não indexar nem o canônico com a indexação desligada", () => {
      env.server.allowIndexing = false;

      expect(proxy(request("/")).headers.get("x-robots-tag")).toBe("noindex");
    });

    it("só acrescenta cabeçalhos nas páginas do site, sem redirecionar", () => {
      const response = proxy(request("/", { host: "example.com" }));

      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("HTTPS", () => {
    it("redireciona para HTTPS o pedido que chegou por HTTP, mantendo caminho e busca", () => {
      const response = proxy(request("/admin/login?x=1", { protocol: "http" }));

      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe(
        "https://portfolio.example.com/admin/login?x=1",
      );
    });

    it("manda HSTS, sem includeSubDomains, nas respostas em HTTPS", () => {
      for (const path of ["/", "/admin/login"]) {
        expect(
          proxy(request(path, { protocol: "https" })).headers.get(
            "strict-transport-security",
          ),
        ).toBe("max-age=31536000");
      }
    });

    it("não mexe no pedido sem X-Forwarded-Proto, como o healthcheck de dentro do container", () => {
      const response = proxy(request("/"));

      expect(response.status).toBe(200);
      expect(response.headers.get("strict-transport-security")).toBeNull();
    });

    it("não redireciona quando o próprio site está em HTTP (desenvolvimento e e2e)", () => {
      env.server.publicOrigin = "http://127.0.0.1:3100";

      const response = proxy(
        request("/", { host: "127.0.0.1:3100", protocol: "http" }),
      );

      expect(response.headers.get("location")).toBeNull();
    });
  });

  describe("painel", () => {
    it("responde 404 fora dos hosts do painel, sem dizer nada dele", async () => {
      const response = proxy(request("/admin/login", { host: "example.com" }));

      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Not Found");
    });

    it("responde 503 quando falta configuração", () => {
      env.admin = {
        hosts: ["portfolio.example.com"],
        status: "disabled",
        problems: ["ADMIN_USERNAME ausente"],
      };

      expect(proxy(request("/admin/login")).status).toBe(503);
    });

    it("manda para o login, no mesmo host, a navegação sem sessão", () => {
      const response = proxy(request("/admin"));

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(
        "https://portfolio.example.com/admin/login",
      );
    });

    it("recusa uma sessão adulterada", () => {
      const response = proxy(
        request("/admin", { cookie: `${validSession()}x` }),
      );

      expect(response.headers.get("location")).toBe(
        "https://portfolio.example.com/admin/login",
      );
    });

    it("deixa passar a navegação com sessão válida", () => {
      const response = proxy(request("/admin", { cookie: validSession() }));

      expect(response.headers.get("x-middleware-next")).toBe("1");
    });

    it("leva para o painel quem já está logado e abre o login", () => {
      const response = proxy(
        request("/admin/login", { cookie: validSession() }),
      );

      expect(response.headers.get("location")).toBe(
        "https://portfolio.example.com/admin",
      );
    });

    it("deixa os POSTs seguirem: as Server Actions conferem a sessão sozinhas", () => {
      const response = proxy(request("/admin", { method: "POST" }));

      expect(response.headers.get("x-middleware-next")).toBe("1");
    });

    it("tira todo o painel do cache e da busca, inclusive as recusas", () => {
      const responses = [
        proxy(request("/admin/login")),
        proxy(request("/admin")),
        proxy(request("/admin", { host: "example.com" })),
      ];

      for (const response of responses) {
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
      }
    });

    it("não confunde outra rota que comece com admin com o painel", () => {
      const response = proxy(request("/administracao"));

      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("cache-control")).toBeNull();
    });
  });

  describe("matcher", () => {
    it.each(["/", "/en", "/admin", "/admin/login", "/api/contact"])(
      "roda em %s",
      (url) => {
        expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
      },
    );

    it.each(["/api/health", "/_next/static/chunks/app.js", "/_next/image"])(
      "fica fora de %s",
      (url) => {
        expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
      },
    );
  });
});
