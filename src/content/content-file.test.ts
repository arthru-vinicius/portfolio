import { describe, expect, it } from "vitest";

import {
  FIXTURE_PHONE,
  portfolioFixture,
} from "../../tests/fixtures/portfolio-document";

import {
  ContentFileSyntaxError,
  parseContentFile,
  serializeContentFile,
} from "./content-file";
import { migrateDocument } from "./migrations";
import type { PortfolioDocument } from "./schema";

function copy(): PortfolioDocument {
  return structuredClone(portfolioFixture);
}

/** Tira todos os `id` do documento, como num arquivo escrito à mão. */
function withoutIds(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(withoutIds);
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "id")
      .map(([key, child]) => [key, withoutIds(child)]),
  );
}

function syntaxErrorOf(text: string): ContentFileSyntaxError {
  try {
    parseContentFile(text);
  } catch (error) {
    if (error instanceof ContentFileSyntaxError) {
      return error;
    }
    throw error;
  }
  throw new Error("o arquivo foi aceito");
}

describe("serializeContentFile", () => {
  it("volta igual pela leitura, com os campos privados", () => {
    const file = serializeContentFile(portfolioFixture);

    expect(file).toContain(FIXTURE_PHONE);
    expect(parseContentFile(file)).toEqual(portfolioFixture);
  });

  it("escreve texto de várias linhas em bloco literal, e o comentário no topo", () => {
    const document = copy();
    const about = document.blocks.find((block) => block.type === "about");
    if (about === undefined) throw new Error("o fixture não tem Sobre");
    about.body["pt-BR"] =
      "Primeiro parágrafo.\n\n- um item\n- outro: com dois-pontos";

    const file = serializeContentFile(document, ["Linha um.", "Linha dois."]);

    expect(file.startsWith("# Linha um.\n# Linha dois.\n")).toBe(true);
    expect(file).toContain(
      "pt-BR: |-\n        Primeiro parágrafo.\n\n        - um item\n",
    );
    expect(parseContentFile(file)).toEqual(document);
  });

  it("protege textos que o YAML leria como outro tipo", () => {
    const document = copy();
    document.profile.displayName = "no";
    document.profile.headline = { "pt-BR": "null", en: "2024" };

    expect(parseContentFile(serializeContentFile(document))).toEqual(document);
  });
});

describe("parseContentFile", () => {
  it("aceita a cópia antiga, em JSON", () => {
    expect(parseContentFile(JSON.stringify(portfolioFixture))).toEqual(
      portfolioFixture,
    );
  });

  it("dá um id a cada item escrito sem ele, e mantém os que existem", () => {
    const document = copy();
    const [keptLink] = document.profile.links;
    if (keptLink === undefined) throw new Error("o fixture não tem links");
    const handWritten = withoutIds(document) as PortfolioDocument;
    handWritten.profile.links[0] = { ...keptLink };

    const imported = migrateDocument(
      parseContentFile(serializeContentFile(handWritten)),
    );

    expect(imported.profile.links[0]?.id).toBe(keptLink.id);
    const ids = JSON.stringify(imported).match(/"id":"[^"]+"/g) ?? [];
    expect(ids.length).toBeGreaterThan(10);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("lê datas e palavras como texto, no YAML 1.2", () => {
    expect(parseContentFile("start: 2024-10\nlevel: no\nend: ~\n")).toEqual({
      start: "2024-10",
      level: "no",
      end: null,
    });
  });

  it("recusa YAML quebrado e diz a linha", () => {
    expect(
      syntaxErrorOf("profile:\n  fullName: Ana\n displayName: Ana\n").line,
    ).toBe(3);
    expect(syntaxErrorOf("schemaVersion: 1\nschemaVersion: 2\n").line).toBe(2);
    expect(
      syntaxErrorOf("schemaVersion: 1\n---\nschemaVersion: 1\n").line,
    ).toBe(2);
  });

  it("recusa tags desconhecidas e alias", () => {
    expect(syntaxErrorOf("profile: !!js/function 'return 1'\n")).toBeInstanceOf(
      ContentFileSyntaxError,
    );
    expect(syntaxErrorOf("a: &lista [1, 2]\nb: *lista\n")).toBeInstanceOf(
      ContentFileSyntaxError,
    );
  });

  it("não deixa uma chave __proto__ chegar ao protótipo", () => {
    const parsed = parseContentFile(
      "__proto__:\n  polluted: true\nlist:\n  - __proto__:\n      polluted: true\n",
    );

    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype);
  });
});
