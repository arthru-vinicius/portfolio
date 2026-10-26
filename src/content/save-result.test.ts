import { describe, expect, it } from "vitest";
import { z } from "zod";

import { toFieldIssues } from "./save-result";

describe("toFieldIssues", () => {
  const schema = z.object({
    profile: z.object({
      links: z.array(z.object({ url: z.httpUrl("endereço inválido") })),
    }),
    other: z.string("texto"),
  });

  it("tira o prefixo do caminho e mantém o caminho dos problemas fora dele", () => {
    const result = schema.safeParse({
      profile: { links: [{ url: "https://example.com" }, { url: "oi" }] },
      other: 1,
    });
    if (result.success) throw new Error("devia falhar");

    expect(toFieldIssues(result.error, ["profile"])).toEqual([
      { path: "links.1.url", message: "endereço inválido" },
      { path: "other", message: "texto" },
    ]);
  });
});
