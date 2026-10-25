import { describe, expect, it } from "vitest";

import { adminUrl, getClientIp } from "./request";

function headersWith(values: Record<string, string>): Headers {
  return new Headers(values);
}

describe("getClientIp", () => {
  it("lê o IP que a Cloudflare grava no CF-Connecting-IP", () => {
    expect(
      getClientIp(headersWith({ "cf-connecting-ip": "203.0.113.7" })),
    ).toBe("203.0.113.7");
    expect(
      getClientIp(headersWith({ "cf-connecting-ip": " 2001:db8::1 " })),
    ).toBe("2001:db8::1");
  });

  it("devolve null sem o cabeçalho ou com valor que não é IP", () => {
    expect(getClientIp(headersWith({}))).toBeNull();
    expect(getClientIp(headersWith({ "cf-connecting-ip": "evil" }))).toBeNull();
    // O X-Forwarded-For pode ser escrito pelo visitante: não vale.
    expect(
      getClientIp(headersWith({ "x-forwarded-for": "203.0.113.7" })),
    ).toBeNull();
  });
});

describe("adminUrl", () => {
  it("fica no host do pedido, com o protocolo do PUBLIC_ORIGIN", () => {
    expect(
      adminUrl(
        "/admin/login",
        "portfolio.example.com",
        "https://portfolio.example.com",
      ).href,
    ).toBe("https://portfolio.example.com/admin/login");
    expect(
      adminUrl("/admin", "127.0.0.1:3100", "http://127.0.0.1:3100").href,
    ).toBe("http://127.0.0.1:3100/admin");
  });

  it("não herda a porta do PUBLIC_ORIGIN quando o host do pedido não tem porta", () => {
    expect(adminUrl("/admin", "localhost", "http://localhost:3000").href).toBe(
      "http://localhost/admin",
    );
  });
});
