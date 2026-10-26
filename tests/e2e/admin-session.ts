import { randomBytes } from "node:crypto";

import { expect, type Page } from "@playwright/test";

import { adminMessages } from "../../src/i18n/admin";

/** Credenciais fictícias que o scripts/run-e2e.mts passa ao container. */
export const USERNAME = process.env.E2E_ADMIN_USERNAME ?? "admin-e2e";
export const PASSWORD =
  process.env.E2E_ADMIN_PASSWORD ?? "senha-ficticia-do-e2e";
export const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";
export const SESSION_COOKIE = "__Host-portfolio-admin";

const { login: loginText } = adminMessages;

/**
 * Faz o navegador se passar por um visitante novo, com um IP só dele, como a
 * Cloudflare informa em produção. Com um IP por teste (e por repetição), os
 * testes em paralelo não esgotam o limite de tentativas uns dos outros. O
 * cabeçalho só vai para o app, e não para a Cloudflare, que serve o widget do
 * Turnstile.
 *
 * @param page - A página do teste.
 */
export async function asNewVisitor(page: Page): Promise<void> {
  // Faixa reservada para documentação (2001:db8::/32): nunca é de ninguém.
  const ip = `2001:db8::${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}`;
  await page.route(`${BASE_URL}/**`, (route) =>
    route.continue({
      headers: { ...route.request().headers(), "cf-connecting-ip": ip },
    }),
  );
}

/** O campo de usuário do login. */
export function usernameField(page: Page) {
  return page.getByLabel(loginText.username, { exact: true });
}

/** O campo de senha do login. */
export function passwordField(page: Page) {
  return page.getByLabel(loginText.password, { exact: true });
}

/**
 * Espera o widget do Turnstile (chave de teste) entregar o token.
 *
 * @param page - A página do login.
 */
export async function waitForTurnstile(page: Page): Promise<void> {
  await expect(page.locator('input[name="turnstileToken"]')).not.toHaveValue(
    "",
    { timeout: 15_000 },
  );
}

/**
 * Envia o formulário de login e espera a resposta da Server Action.
 *
 * @param page - A página do login.
 */
export async function submitLogin(page: Page): Promise<void> {
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        new URL(response.url()).pathname === "/admin/login",
    ),
    page.getByRole("button", { name: loginText.submit }).click(),
  ]);
}

/**
 * Espera o título da página aparecer e o React assumir a página. Depois de um
 * carregamento completo (o login, um `reload`), mexer num campo antes disso
 * pode se perder: o React ainda não ouve os eventos.
 *
 * @param page - A página do teste.
 * @param heading - O título (`h1`) esperado.
 */
export async function waitForPage(page: Page, heading: string): Promise<void> {
  const title = page.getByRole("heading", { level: 1, name: heading });
  await expect(title).toBeVisible();
  // O React marca cada elemento que assume com uma propriedade `__reactFiber$`.
  await expect
    .poll(() =>
      title.evaluate((element) =>
        Object.keys(element).some((key) => key.startsWith("__reactFiber$")),
      ),
    )
    .toBe(true);
}

/**
 * Entra no painel pela tela de login.
 *
 * @param page - A página do teste.
 * @param password - A senha a usar; o padrão é a certa.
 */
export async function logIn(page: Page, password = PASSWORD): Promise<void> {
  await page.goto("/admin/login");
  await usernameField(page).fill(USERNAME);
  await passwordField(page).fill(password);
  await waitForTurnstile(page);
  await submitLogin(page);
}
