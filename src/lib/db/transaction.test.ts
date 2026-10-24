import { DatabaseSync } from "node:sqlite";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { withTransaction } from "./transaction";

describe("withTransaction", () => {
  let db: DatabaseSync;

  const insert = (value: string) =>
    db.prepare("INSERT INTO items (value) VALUES (?)").run(value);
  const count = () =>
    Number(db.prepare("SELECT count(*) AS n FROM items").get()?.n);

  beforeEach(() => {
    db = new DatabaseSync(":memory:");
    db.exec("CREATE TABLE items (value TEXT NOT NULL) STRICT");
  });

  afterEach(() => {
    db.close();
  });

  it("confirma o trabalho e devolve o resultado", () => {
    const result = withTransaction(db, () => {
      insert("a");
      return 42;
    });

    expect(result).toBe(42);
    expect(count()).toBe(1);
  });

  it("desfaz tudo e repassa o erro quando o trabalho falha", () => {
    const failure = new Error("falhou no meio");

    expect(() =>
      withTransaction(db, () => {
        insert("a");
        throw failure;
      }),
    ).toThrow(failure);
    expect(count()).toBe(0);
  });

  it("deixa a conexão pronta para a próxima transação depois de um rollback", () => {
    expect(() =>
      withTransaction(db, () => {
        throw new Error("falhou");
      }),
    ).toThrow();

    withTransaction(db, () => insert("b"));
    expect(count()).toBe(1);
  });
});
