import { expect, test } from "@playwright/test";

// Valores que o scripts/run-e2e.mts passa a partir da imagem e do /deploy montado.
const expectedVersion = process.env.E2E_EXPECTED_VERSION;
const expectedDeploy: unknown = process.env.E2E_DEPLOY_STATUS
  ? JSON.parse(process.env.E2E_DEPLOY_STATUS)
  : undefined;

test.describe("GET /api/health", () => {
  test("responde 200 com a versão da imagem e o status do deploy", async ({
    request,
  }) => {
    const response = await request.get("/api/health");

    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(await response.json()).toEqual({
      status: "ok",
      version: expectedVersion ?? expect.any(String),
      deploy: expectedDeploy ?? expect.anything(),
    });
  });

  test("nunca redireciona, porque o healthcheck do servidor segue redirecionamentos", async ({
    request,
  }) => {
    const response = await request.get("/api/health", { maxRedirects: 0 });

    expect(response.status()).toBe(200);
  });

  test("fica fora do proxy, inclusive num host que não é o canônico", async ({
    request,
  }) => {
    // Num host assim, o proxy acrescentaria o noindex: a ausência do cabeçalho
    // mostra que ele não rodou.
    const response = await request.get("/api/health", {
      headers: { host: "outro-endereco.example" },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(200);
    expect(response.headers()["x-robots-tag"]).toBeUndefined();
  });
});
