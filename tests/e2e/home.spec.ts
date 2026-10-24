import { expect, test } from "@playwright/test";

import { en } from "../../src/i18n/dictionaries/en";
import { ptBR } from "../../src/i18n/dictionaries/pt-BR";

test.describe("página provisória", () => {
  test("responde nos dois idiomas, com o idioma de cada trecho marcado", async ({
    request,
  }) => {
    const response = await request.get("/");
    const html = await response.text();

    expect(response.status()).toBe(200);
    expect(html).toContain('<html lang="pt-BR"');
    expect(html).toContain(ptBR.placeholder.title);
    expect(html).toContain('<section lang="en"');
    expect(html).toContain(en.placeholder.title);
  });
});

// O scripts/run-e2e.mts sobe o container com o PUBLIC_ORIGIN no endereço do
// teste e com a indexação liberada, para exercitar os dois lados da regra.
test.describe("indexação", () => {
  test("no host do PUBLIC_ORIGIN, permite indexar", async ({ request }) => {
    const response = await request.get("/");

    expect(response.status()).toBe(200);
    expect(response.headers()["x-robots-tag"]).toBeUndefined();
  });

  test("em outro host que sirva o mesmo site, pede para não indexar", async ({
    request,
  }) => {
    const response = await request.get("/", {
      headers: { host: "outro-endereco.example" },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()["x-robots-tag"]).toBe("noindex");
  });
});
