import { describe, expect, it } from "vitest";

import { hostnameFromHostHeader } from "./hosts";

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
