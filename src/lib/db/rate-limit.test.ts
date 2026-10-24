import type { DatabaseSync } from "node:sqlite";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createTestDatabase } from "../../../tests/support/database";

import { consumeRateLimit, resetRateLimit } from "./rate-limit";

const RULE = { limit: 3, windowMs: 60_000 };
const NOW = new Date("2026-10-24T12:00:00.000Z");

function at(ms: number): Date {
  return new Date(NOW.getTime() + ms);
}

describe("limite de tentativas", () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = createTestDatabase();
  });

  afterEach(() => {
    db.close();
  });

  it("deixa passar até o limite e recusa a tentativa seguinte", () => {
    for (let attempt = 0; attempt < RULE.limit; attempt += 1) {
      expect(consumeRateLimit(db, "ip:a", RULE, at(attempt * 1000))).toEqual({
        allowed: true,
      });
    }

    expect(consumeRateLimit(db, "ip:a", RULE, at(10_000))).toEqual({
      allowed: false,
      retryAfterMs: 50_000,
    });
  });

  it("recomeça a contagem quando a janela acaba", () => {
    for (let attempt = 0; attempt <= RULE.limit; attempt += 1) {
      consumeRateLimit(db, "ip:a", RULE, NOW);
    }

    expect(consumeRateLimit(db, "ip:a", RULE, at(60_000))).toEqual({
      allowed: true,
    });
  });

  it("conta cada chave separadamente", () => {
    for (let attempt = 0; attempt <= RULE.limit; attempt += 1) {
      consumeRateLimit(db, "ip:a", RULE, NOW);
    }

    expect(consumeRateLimit(db, "ip:b", RULE, NOW)).toEqual({ allowed: true });
  });

  it("zera a contagem de uma chave", () => {
    for (let attempt = 0; attempt <= RULE.limit; attempt += 1) {
      consumeRateLimit(db, "ip:a", RULE, NOW);
    }
    resetRateLimit(db, "ip:a");

    expect(consumeRateLimit(db, "ip:a", RULE, NOW)).toEqual({ allowed: true });
  });

  it("apaga as janelas vencidas a cada tentativa", () => {
    consumeRateLimit(db, "ip:a", RULE, NOW);
    consumeRateLimit(db, "ip:b", RULE, at(120_000));

    const keys = db
      .prepare("SELECT key FROM rate_limits")
      .all()
      .map((row) => row.key);
    expect(keys).toEqual(["ip:b"]);
  });
});
