import { randomBytes } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { adminMessages } from "../../src/i18n/admin";

// Credenciais fictícias que o scripts/run-e2e.mts passa ao container.
const USERNAME = process.env.E2E_ADMIN_USERNAME ?? "admin-e2e";
const PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "senha-ficticia-do-e2e";
const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
const SESSION_COOKIE = "__Host-portfolio-admin";

const { login: loginText, home: homeText } = adminMessages;

/**
 * Faz o navegador se passar por um visitante novo, com um IP só dele, como a
 * Cloudflare informa em produção. Com um IP por teste (e por repetição), os
 * testes em paralelo não esgotam o limite de tentativas uns dos outros. O
 * cabeçalho só vai para o app, e não para a Cloudflare, que serve o widget do
 * Turnstile.
 */
async function asNewVisitor(page: Page): Promise<void> {
  // Faixa reservada para documentação (2001:db8::/32): nunca é de ninguém.
  const ip = `2001:db8::${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}`;
  await page.route(`${BASE_URL}/**`, (route) =>
    route.continue({
      headers: { ...route.request().headers(), "cf-connecting-ip": ip },
    }),
  );
}

function usernameField(page: Page) {
  return page.getByLabel(loginText.username, { exact: true });
}

function passwordField(page: Page) {
  return page.getByLabel(loginText.password, { exact: true });
}

/** Espera o widget do Turnstile (chave de teste) entregar o token. */
async function waitForTurnstile(page: Page): Promise<void> {
  await expect(page.locator('input[name="turnstileToken"]')).not.toHaveValue(
    "",
    { timeout: 15_000 },
  );
}

/** Envia o formulário e espera a resposta da Server Action. */
async function submit(page: Page): Promise<void> {
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/admin/login",
    ),
    page.getByRole("button", { name: loginText.submit }).click(),
  ]);
}

async function logIn(page: Page, password = PASSWORD): Promise<void> {
  await page.goto("/admin/login");
  await usernameField(page).fill(USERNAME);
  await passwordField(page).fill(password);
  await waitForTurnstile(page);
  await submit(page);
}

test.describe("painel: respostas", () => {
  test("fora dos hosts do painel, responde 404, fora do cache e da busca", async ({
    request,
  }) => {
    const response = await request.get("/admin/login", {
      headers: { host: "outro-endereco.example" },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(404);
    expect(response.headers()["cache-control"]).toBe("no-store");
    expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  });

  test("sem sessão, manda para o login", async ({ request }) => {
    const response = await request.get("/admin", { maxRedirects: 0 });

    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toMatch(/\/admin\/login$/);
  });

  test("o login responde fora do cache e da busca", async ({ request }) => {
    const response = await request.get("/admin/login");
    const html = await response.text();

    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    expect(html).toContain('<meta name="robots" content="noindex, nofollow"/>');
    expect(html).toContain('<html lang="pt-BR"');
  });
});

test.describe("painel: login", () => {
  test("entra com cookie seguro, mostra a situação e sai", async ({
    page,
    context,
  }) => {
    await asNewVisitor(page);
    await logIn(page);

    await expect(page).toHaveURL(/\/admin$/);
    await expect(
      page.getByRole("heading", { level: 1, name: homeText.heading }),
    ).toBeVisible();
    await expect(page.getByText(homeText.noDraft)).toBeVisible();

    const cookie = (await context.cookies()).find(
      ({ name }) => name === SESSION_COOKIE,
    );
    expect(cookie).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
      path: "/",
    });

    await page.getByRole("button", { name: adminMessages.logout }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);
    expect(
      (await context.cookies()).some(({ name }) => name === SESSION_COOKIE),
    ).toBe(false);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("com a senha errada, avisa, mantém o usuário e gera um token novo", async ({
    page,
  }) => {
    await asNewVisitor(page);
    await logIn(page, "senha-errada");

    await expect(page.locator("#login-error")).toHaveText(
      loginText.invalidCredentials,
    );
    await expect(usernameField(page)).toHaveValue(USERNAME);
    await expect(passwordField(page)).toHaveAttribute(
      "aria-describedby",
      "login-error",
    );

    await passwordField(page).fill(PASSWORD);
    await waitForTurnstile(page);
    await submit(page);
    await expect(page).toHaveURL(/\/admin$/);
  });

  test("bloqueia o IP depois de cinco tentativas erradas", async ({ page }) => {
    await asNewVisitor(page);
    await page.goto("/admin/login");

    for (let attempt = 1; attempt <= 6; attempt += 1) {
      await usernameField(page).fill(USERNAME);
      await passwordField(page).fill("senha-errada");
      await waitForTurnstile(page);
      await submit(page);
      await expect(page.locator("#login-error")).toHaveText(
        attempt <= 5 ? loginText.invalidCredentials : loginText.rateLimited(15),
      );
    }
  });

  test("funciona só com o teclado", async ({ page }) => {
    await asNewVisitor(page);
    await page.goto("/admin/login");

    // O formulário vem por streaming, e o React só o revela uns 300 ms depois:
    // antes disso, a página tem só o "Carregando…", sem nada para focar.
    await expect(usernameField(page)).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(usernameField(page)).toBeFocused();
    await page.keyboard.type(USERNAME);
    await page.keyboard.press("Tab");
    await expect(passwordField(page)).toBeFocused();
    await page.keyboard.type(PASSWORD);
    await waitForTurnstile(page);
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/admin$/);
  });
});

test.describe("painel: acessibilidade", () => {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`login e situação sem violações do axe, no tema ${colorScheme === "light" ? "claro" : "escuro"}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await asNewVisitor(page);

      await page.goto("/admin/login");
      await waitForTurnstile(page);
      const loginScan = await new AxeBuilder({ page }).analyze();
      expect(loginScan.violations).toEqual([]);

      await usernameField(page).fill(USERNAME);
      await passwordField(page).fill(PASSWORD);
      await submit(page);
      await expect(
        page.getByRole("heading", { level: 1, name: homeText.heading }),
      ).toBeVisible();
      const homeScan = await new AxeBuilder({ page }).analyze();
      expect(homeScan.violations).toEqual([]);
    });
  }
});
