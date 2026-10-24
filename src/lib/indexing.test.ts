import { describe, expect, it } from "vitest";

import { isIndexable } from "./indexing";

const released = {
  publicOrigin: "https://portfolio.example.com",
  allowIndexing: true,
};

describe("isIndexable", () => {
  it("indexa o host canônico quando a indexação está liberada", () => {
    expect(isIndexable("portfolio.example.com", released)).toBe(true);
  });

  it("não indexa outro host que sirva o mesmo site", () => {
    expect(isIndexable("example.com", released)).toBe(false);
    expect(isIndexable("127.0.0.1:3000", released)).toBe(false);
  });

  it("não indexa nada enquanto a indexação estiver desligada, nem o canônico", () => {
    expect(
      isIndexable("portfolio.example.com", {
        ...released,
        allowIndexing: false,
      }),
    ).toBe(false);
  });

  it("não indexa nada sem origem canônica", () => {
    expect(
      isIndexable("portfolio.example.com", {
        publicOrigin: null,
        allowIndexing: true,
      }),
    ).toBe(false);
  });

  it("compara só o nome do host, sem porta e sem diferença de maiúsculas", () => {
    expect(isIndexable("Portfolio.Example.com:443", released)).toBe(true);
  });

  it("não indexa um pedido sem host válido", () => {
    expect(isIndexable(null, released)).toBe(false);
    expect(isIndexable("portfolio.example.com/x", released)).toBe(false);
  });
});
