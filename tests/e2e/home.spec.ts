import { expect, test } from "@playwright/test";

import { en } from "../../src/i18n/dictionaries/en";
import { ptBR } from "../../src/i18n/dictionaries/pt-BR";

// Estes testes valem com ou sem conteúdo publicado: os do editor publicam em
// paralelo, e a página em construção vira o site no meio do caminho.

test.describe("idiomas", () => {
  test("a raiz leva ao idioma do navegador, sem cache", async ({ request }) => {
    const portuguese = await request.get("/", { maxRedirects: 0 });
    expect(portuguese.status()).toBe(307);
    expect(new URL(portuguese.headers()["location"] ?? "").pathname).toBe(
      "/pt/",
    );
    expect(portuguese.headers()["vary"]).toBe("Accept-Language");

    const english = await request.get("/", {
      maxRedirects: 0,
      headers: { "accept-language": "en-US,en;q=0.9" },
    });
    expect(new URL(english.headers()["location"] ?? "").pathname).toBe("/en/");
  });

  test("a página do idioma mora com a barra no fim", async ({ request }) => {
    const response = await request.get("/pt?ref=1", { maxRedirects: 0 });

    expect(response.status()).toBe(308);
    expect(new URL(response.headers()["location"] ?? "").pathname).toBe("/pt/");
    expect(new URL(response.headers()["location"] ?? "").search).toBe("?ref=1");
  });

  test("cada idioma tem a sua página, marcada com o idioma", async ({
    request,
  }) => {
    const portuguese = await request.get("/pt/");
    const english = await request.get("/en/");

    expect(portuguese.status()).toBe(200);
    expect(await portuguese.text()).toContain('<html lang="pt-BR"');
    expect(english.status()).toBe(200);
    expect(await english.text()).toContain('<html lang="en"');
  });

  test("um endereço que não existe dá 404, nos dois idiomas", async ({
    request,
  }) => {
    for (const path of ["/pt/nada-aqui", "/xx", "/en/x/y"]) {
      const response = await request.get(path);
      const html = await response.text();

      expect(response.status(), path).toBe(404);
      expect(html).toContain(ptBR.notFound.title);
      expect(html).toContain(en.notFound.title);
    }
  });
});

// O scripts/run-e2e.mts sobe o container com o PUBLIC_ORIGIN no endereço do
// teste e com a indexação liberada, para exercitar os dois lados da regra.
test.describe("indexação", () => {
  test("no host do PUBLIC_ORIGIN, permite indexar", async ({ request }) => {
    const response = await request.get("/pt/");

    expect(response.status()).toBe(200);
    expect(response.headers()["x-robots-tag"]).toBeUndefined();
  });

  test("em outro host, pede para não indexar", async ({ request }) => {
    const response = await request.get("/pt/", {
      headers: { host: "outro-endereco.example" },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()["x-robots-tag"]).toBe("noindex");
  });
});
