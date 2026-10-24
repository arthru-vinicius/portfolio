import { describe, expect, it } from "vitest";

import { hostnameFromHostHeader, isAllowedHost, parseHostList } from "./hosts";

describe("hostnameFromHostHeader", () => {
  it("tira a porta e passa para minúsculas", () => {
    expect(hostnameFromHostHeader("127.0.0.1:3000")).toBe("127.0.0.1");
    expect(hostnameFromHostHeader("Portfolio.Example.COM")).toBe(
      "portfolio.example.com",
    );
  });

  it("ignora o ponto final de um nome absoluto", () => {
    expect(hostnameFromHostHeader("portfolio.example.com.")).toBe(
      "portfolio.example.com",
    );
  });

  it("aceita IPv6 entre colchetes", () => {
    expect(hostnameFromHostHeader("[::1]:3000")).toBe("[::1]");
  });

  it.each([
    null,
    "",
    " ",
    "a b",
    "evil.example/path",
    "user@evil.example",
    "a\\b",
  ])("recusa %j", (value) => {
    expect(hostnameFromHostHeader(value)).toBeNull();
  });
});

describe("parseHostList", () => {
  it("separa por vírgula, tira espaços e itens vazios e passa para minúsculas", () => {
    expect(parseHostList(" Portfolio.Example.com, ,127.0.0.1 ")).toEqual([
      "portfolio.example.com",
      "127.0.0.1",
    ]);
  });

  it("vale lista vazia sem a variável", () => {
    expect(parseHostList(undefined)).toEqual([]);
  });
});

describe("isAllowedHost", () => {
  const allowed = ["portfolio.example.com", "127.0.0.1"];

  it("aceita os hosts da lista, com ou sem porta", () => {
    expect(isAllowedHost("portfolio.example.com", allowed)).toBe(true);
    expect(isAllowedHost("127.0.0.1:3100", allowed)).toBe(true);
  });

  it("recusa outro host, um subdomínio e pedido sem host", () => {
    expect(isAllowedHost("example.com", allowed)).toBe(false);
    expect(isAllowedHost("x.portfolio.example.com", allowed)).toBe(false);
    expect(isAllowedHost(null, allowed)).toBe(false);
  });

  it("recusa tudo com a lista vazia", () => {
    expect(isAllowedHost("portfolio.example.com", [])).toBe(false);
  });
});
