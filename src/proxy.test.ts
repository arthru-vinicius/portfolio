import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const env = vi.hoisted(() => ({
  publicOrigin: "https://portfolio.example.com" as string | null,
  allowIndexing: true,
}));

vi.mock("@/lib/env", () => ({ getServerEnv: () => env }));

const { config, proxy } = await import("./proxy");

function request(path: string, host: string): NextRequest {
  return new NextRequest(`http://${host}${path}`, { headers: { host } });
}

describe("proxy", () => {
  beforeEach(() => {
    env.publicOrigin = "https://portfolio.example.com";
    env.allowIndexing = true;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("deixa o host canônico indexável quando a indexação está liberada", () => {
    const response = proxy(request("/", "portfolio.example.com"));

    expect(response.headers.get("x-robots-tag")).toBeNull();
  });

  it("pede para não indexar os outros hosts", () => {
    const response = proxy(request("/", "example.com"));

    expect(response.headers.get("x-robots-tag")).toBe("noindex");
  });

  it("pede para não indexar nem o canônico com a indexação desligada", () => {
    env.allowIndexing = false;

    const response = proxy(request("/", "portfolio.example.com"));

    expect(response.headers.get("x-robots-tag")).toBe("noindex");
  });

  it("só acrescenta cabeçalhos, sem redirecionar nem responder no lugar da rota", () => {
    const response = proxy(request("/", "example.com"));

    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("location")).toBeNull();
  });

  describe("matcher", () => {
    it.each(["/", "/en", "/admin/login", "/api/contact"])(
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
