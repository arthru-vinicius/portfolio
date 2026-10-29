import { readFile } from "node:fs/promises";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { parse, stringify } from "yaml";

import { adminMessages } from "../../src/i18n/admin";
import { ptBR } from "../../src/i18n/dictionaries/pt-BR";
import {
  FIXTURE_PHONE,
  portfolioFixture,
} from "../fixtures/portfolio-document";

import { asNewVisitor, logIn, waitForPage } from "./admin-session";

const { backup, editor, fields, history, home, nav, publish } = adminMessages;

// Os testes daqui mexem no mesmo rascunho, então rodam em ordem. O primeiro
// importa o documento fictício, e os outros partem dele. Os testes de login
// rodam em paralelo, mas não mexem no conteúdo.
test.describe.configure({ mode: "serial" });

async function openSection(page: Page, name: string): Promise<void> {
  await page
    .getByRole("navigation", { name: nav.label })
    .getByRole("link", { name, exact: true })
    .click();
  await waitForPage(page, name);
}

async function save(page: Page): Promise<void> {
  await page.getByRole("button", { name: editor.save, exact: true }).click();
  await expect(page.getByRole("status").getByText(/^Salvo às/)).toBeVisible();
}

/** O cartão de um item de lista, aberto. */
function openItem(page: Page, name: string) {
  return page
    .getByRole("listitem")
    .filter({ has: page.getByRole("button", { name: editor.collapse(name) }) });
}

test.beforeEach(async ({ page }) => {
  await asNewVisitor(page);
  await logIn(page);
  await expect(page).toHaveURL(/\/admin$/);
  // O login termina com um carregamento completo da visão geral.
  await waitForPage(page, home.heading);
});

test("importa o conteúdo de um arquivo YAML, depois de confirmar", async ({
  page,
}) => {
  await page.getByLabel(backup.importLabel).setInputFiles({
    name: "conteudo.yaml",
    mimeType: "application/yaml",
    buffer: Buffer.from(stringify(portfolioFixture)),
  });
  await page
    .getByRole("button", { name: backup.importSubmit, exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: editor.cancel }),
  ).toBeFocused();
  await dialog.getByRole("button", { name: /^(Importar|Substituir)/ }).click();

  await expect(page.getByText(backup.imported)).toBeVisible();
  await expect(page.getByText(/^Salvo em /)).toBeVisible();
});

test("edita o perfil, avisa antes de sair sem salvar e salva", async ({
  page,
}) => {
  await openSection(page, nav.profile);
  const displayName = page.getByLabel(fields.displayName, { exact: true });
  await displayName.fill("Ana Editada");
  await expect(
    page.getByRole("status").getByText(editor.unsaved),
  ).toBeVisible();

  await page
    .getByRole("navigation", { name: nav.label })
    .getByRole("link", { name: nav.blocks })
    .click();
  const leave = page.getByRole("dialog", { name: editor.leaveTitle });
  await expect(leave).toBeVisible();
  await leave.getByRole("button", { name: editor.stay }).click();
  await expect(page).toHaveURL(/\/admin\/profile$/);

  await save(page);
  // O botão continua focável depois de salvar: o foco não se perde.
  await expect(
    page.getByRole("button", { name: editor.save, exact: true }),
  ).toBeFocused();

  await page.reload();
  await waitForPage(page, nav.profile);
  await expect(displayName).toHaveValue("Ana Editada");
});

test("descarta as alterações ao sair sem salvar", async ({ page }) => {
  await openSection(page, nav.profile);
  const fullName = page.getByLabel(fields.fullName, { exact: true });
  const saved = await fullName.inputValue();
  await fullName.fill("Nome que não fica");

  await page
    .getByRole("navigation", { name: nav.label })
    .getByRole("link", { name: nav.blocks })
    .click();
  await page
    .getByRole("dialog", { name: editor.leaveTitle })
    .getByRole("button", { name: editor.leaveConfirm })
    .click();
  await expect(page).toHaveURL(/\/admin\/blocks$/);

  // O Next guarda a página do perfil escondida; ela volta sem o descartado.
  await openSection(page, nav.profile);
  await expect(fullName).toHaveValue(saved);
});

test("aponta o campo inválido e leva o foco até ele", async ({ page }) => {
  await openSection(page, nav.profile);
  const url = page
    .getByRole("group", { name: fields.links })
    .getByLabel(fields.linkUrl)
    .first();
  await url.fill("sem-esquema");

  await page.getByRole("button", { name: editor.save, exact: true }).click();

  await expect(page.getByRole("alert").getByText(editor.invalid)).toBeVisible();
  await expect(url).toBeFocused();
  await expect(url).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByText("Use um endereço completo, começando com https://"),
  ).toBeVisible();
});

test("ordena os blocos pelo teclado e salva", async ({ page }) => {
  await openSection(page, nav.blocks);
  const headings = page.getByRole("main").getByRole("heading", { level: 2 });
  await expect(headings.first()).toHaveText("Sobre");

  const moveDown = page.getByRole("button", { name: editor.moveDown("Sobre") });
  await moveDown.focus();
  await page.keyboard.press("Enter");

  await expect(moveDown).toBeFocused();
  await expect(headings.nth(1)).toHaveText("Sobre");
  await expect(
    page.getByRole("status").getByText(editor.moved("Sobre", 2, 8)),
  ).toBeAttached();
  await save(page);

  await page.reload();
  await waitForPage(page, nav.blocks);
  await expect(headings.nth(1)).toHaveText("Sobre");
});

test("edita um projeto, com etiqueta nova, e salva", async ({ page }) => {
  await openSection(page, nav.blocks);
  await page.getByRole("link", { name: editor.editLabel("Projetos") }).click();
  await waitForPage(page, "Projetos");

  await page
    .getByRole("button", { name: editor.expand("Aquário Conectado") })
    .click();
  const project = openItem(page, "Aquário Conectado");
  await project
    .getByRole("combobox", { name: fields.technologies })
    .fill("Docker");
  await page.keyboard.press("Enter");
  await expect(
    project
      .getByRole("list", { name: fields.technologies })
      .getByText("Docker"),
  ).toBeVisible();
  await project
    .getByLabel(fields.name, { exact: true })
    .fill("Aquário Conectado 2");
  await save(page);

  await page.reload();
  await waitForPage(page, "Projetos");
  await page
    .getByRole("button", { name: editor.expand("Aquário Conectado 2") })
    .click();
  await expect(
    openItem(page, "Aquário Conectado 2")
      .getByRole("list", { name: fields.technologies })
      .getByText("Docker"),
  ).toBeVisible();
});

test("recusa salvar uma parte que mudou em outra aba", async ({
  page,
  context,
}) => {
  await openSection(page, nav.profile);
  const other = await context.newPage();
  await other.goto("/admin/profile");
  await waitForPage(other, nav.profile);
  await other.getByLabel(fields.fullName, { exact: true }).fill("Outra aba");
  await save(other);

  await page.getByLabel(fields.displayName, { exact: true }).fill("Esta aba");
  await page.getByRole("button", { name: editor.save, exact: true }).click();

  await expect(
    page.getByRole("alert").getByText(editor.conflict),
  ).toBeVisible();
  await page.getByRole("button", { name: editor.reload }).click();
  await waitForPage(page, nav.profile);
  await expect(page.getByLabel(fields.fullName, { exact: true })).toHaveValue(
    "Outra aba",
  );
});

test("exporta o rascunho, com os campos privados", async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: backup.export }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(
    /^portfolio-rascunho-\d{4}-\d{2}-\d{2}\.yaml$/,
  );
  const exported = parse(await readFile(await download.path(), "utf8"));
  expect(exported.profile).toMatchObject({
    fullName: "Outra aba",
    private: { phone: FIXTURE_PHONE },
  });
});

test("publica o rascunho depois de confirmar", async ({ page }) => {
  // Um nome diferente a cada tentativa: numa nova tentativa do CI, o rascunho
  // seria igual ao que a primeira publicou, e não haveria o que publicar.
  await openSection(page, nav.profile);
  await page
    .getByLabel(fields.displayName, { exact: true })
    .fill(`Ana Publicada ${test.info().retry}`);
  // A foto entra no rascunho junto com o perfil.
  await page.getByLabel(adminMessages.profile.photoChoose).setInputFiles({
    name: "foto.jpg",
    mimeType: "image/jpeg",
    buffer: await sharp({
      create: { width: 900, height: 900, channels: 3, background: "#2d8f6f" },
    })
      .jpeg()
      .toBuffer(),
  });
  await expect(
    page.getByText(adminMessages.profile.photoUploaded),
  ).toBeVisible();
  await expect(
    page.getByRole("img", { name: adminMessages.profile.photoPreview }),
  ).toBeVisible();
  await save(page);
  await openSection(page, nav.home);

  await page.getByRole("button", { name: publish.submit, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: publish.confirmTitle });
  await expect(
    dialog.getByRole("button", { name: editor.cancel }),
  ).toBeFocused();
  await dialog.getByRole("button", { name: publish.confirm }).click();

  // O número da revisão não é fixo: numa nova tentativa do CI, o banco já tem
  // a publicação da primeira.
  await expect(
    page.getByRole("status").getByText(/^Revisão \d+ publicada às/),
  ).toBeVisible();
  await expect(page.getByText(publish.nothingToPublish)).toBeVisible();
  await expect(page.getByText(/^Revisão \d+, publicada em/)).toBeVisible();
});

test("o site mostra a publicação, com tema e idioma", async ({ page }) => {
  const title = page.getByRole("heading", { level: 1 });
  await page.goto("/pt/");
  await expect(title).toContainText(`Ana Publicada ${test.info().retry}`);
  await expect(title).toContainText("Desenvolvedora Full Stack");
  const photo = page.getByRole("img", {
    name: `Foto de Ana Publicada ${test.info().retry}`,
  });
  await expect(photo).toBeVisible();
  await expect
    .poll(() => photo.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  await expect(
    page.getByRole("heading", { level: 2, name: ptBR.sections.experience }),
  ).toBeVisible();
  // O que está oculto no painel não vai para o site.
  await expect(page.getByText("Projeto Arquivado")).toHaveCount(0);

  // A escolha do tema vale também depois de recarregar.
  await page.getByRole("button", { name: /Trocar para: Tema claro$/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  // O nome acessível começa pelo texto visível do botão.
  await page
    .getByRole("link", {
      name: `${ptBR.language.short} ${ptBR.language.switchTo}`,
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/en\/$/);
  await expect(title).toContainText("Full Stack Developer");
});

test("a página publicada se apresenta aos buscadores e às redes", async ({
  page,
}) => {
  await page.goto("/pt/");
  const head = page.locator("head");
  await expect(head.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/pt\/$/,
  );
  await expect(
    head.locator('link[rel="alternate"][hreflang="en"]'),
  ).toHaveAttribute("href", /\/en\/$/);

  const image = await head
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect(image).toMatch(/\/pt\/og\.jpg\?v=\d+$/);
  const card = await page.request.get(image ?? "");
  expect(card.status()).toBe(200);
  expect(card.headers()["content-type"]).toBe("image/jpeg");

  const jsonLd = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      "{}",
  );
  expect(jsonLd).toMatchObject({
    "@type": "ProfilePage",
    // O nome completo muda nos testes anteriores; o cargo, não.
    mainEntity: {
      "@type": "Person",
      name: expect.any(String),
      jobTitle: "Desenvolvedora Full Stack",
    },
  });
  // O CV no site leva a revisão no link, para o navegador baixar o novo.
  await expect(
    page.locator('#topo a[href^="/cv/curriculo.pdf?v="]'),
  ).toHaveCount(1);

  // O e2e sobe o container com a indexação liberada no endereço do teste.
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/pt/</loc>");
  expect(sitemap).toContain('hreflang="x-default"');
  const robots = await (await page.request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
});

test("assistentes de IA acham o currículo em texto e em dados", async ({
  page,
}) => {
  await page.goto("/pt/");
  const markdownHref = await page
    .locator('head link[rel="alternate"][type="text/markdown"]')
    .getAttribute("href");
  expect(markdownHref).toMatch(/\/cv\/curriculo\.md$/);

  const markdown = await page.request.get(markdownHref ?? "");
  expect(markdown.headers()["content-type"]).toBe(
    "text/markdown; charset=utf-8",
  );
  expect(await markdown.text()).toContain(
    `## ${ptBR.resume.sections.experience}`,
  );

  const json = await page.request.get("/cv/resume.json");
  expect(await json.json()).toMatchObject({
    basics: { label: "Full Stack Developer" },
    meta: { language: "en" },
  });

  const llms = await page.request.get("/llms.txt");
  expect(llms.status()).toBe(200);
  const text = await llms.text();
  expect(text).toMatch(/^# /);
  expect(text).toMatch(/\]\(http[^)]*\/cv\/resume\.md\)/);
});

test("o site oferece o currículo da publicação, em PDF e DOCX", async ({
  page,
}) => {
  await page.goto("/pt/");
  const hero = page.locator("#topo");
  await hero.getByText(ptBR.resumeDownload.button).click();
  const pdf = hero.getByRole("link", { name: /^PDF/ }).first();
  await expect(pdf).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    pdf.click(),
  ]);
  expect(download.suggestedFilename()).toMatch(
    /^ana-publicada-\d+-curriculo\.pdf$/,
  );
  await page.keyboard.press("Escape");
  await expect(hero.locator("details")).not.toHaveAttribute("open");

  // A URL é fixa; a ETag é da revisão, e a cópia de quem já baixou vale.
  const file = await page.request.get("/cv/curriculo.pdf");
  expect(file.status()).toBe(200);
  expect(file.headers()["content-type"]).toBe("application/pdf");
  expect(file.headers()["cache-control"]).toBe("public, no-cache");
  expect((await file.body()).subarray(0, 5).toString()).toBe("%PDF-");
  const etag = file.headers().etag ?? "";
  const revalidated = await page.request.get("/cv/curriculo.pdf", {
    headers: { "If-None-Match": etag },
  });
  expect(revalidated.status()).toBe(304);

  const word = await page.request.get("/cv/resume.docx");
  expect(word.headers()["content-type"]).toBe(
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  expect((await word.body()).subarray(0, 2).toString()).toBe("PK");

  // O painel gera a versão completa do rascunho, só para quem tem sessão.
  const full = await page.request.get("/admin/cv/curriculo.pdf?full=1");
  expect(full.status()).toBe(200);
  expect(full.headers()["content-disposition"]).toMatch(
    /-curriculo-completo\.pdf"$/,
  );
});

test("só carrega o Turnstile quando o contato se aproxima", async ({
  page,
}) => {
  const turnstile: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://challenges.cloudflare.com/")) {
      turnstile.push(request.url());
    }
  });
  await page.goto("/pt/");
  await page.waitForLoadState("networkidle");
  expect(turnstile).toEqual([]);

  await page.locator("#contato").scrollIntoViewIfNeeded();
  await expect(page.locator('input[name="turnstileToken"]')).not.toHaveValue(
    "",
  );
  expect(turnstile.length).toBeGreaterThan(0);
});

test("envia uma mensagem pelo formulário de contato", async ({ page }) => {
  const form = ptBR.contactForm;
  const token = page.locator('input[name="turnstileToken"]');
  await page.goto("/pt/#contato");
  await page.getByLabel(form.name, { exact: true }).fill("Visitante do e2e");
  await page.getByLabel(form.email, { exact: true }).fill("sem-arroba");
  await page
    .getByLabel(form.message, { exact: true })
    .fill("Mensagem de teste.");
  // A chave de teste do Turnstile devolve o token sozinha.
  await expect(token).not.toHaveValue("");
  await page.getByRole("button", { name: form.submit }).click();

  await expect(page.getByText(form.emailError)).toBeVisible();
  const email = page.getByLabel(form.email, { exact: true });
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute("aria-invalid", "true");

  await email.fill("visitante@example.com");
  await expect(token).not.toHaveValue("");
  await page.getByRole("button", { name: form.submit }).click();
  await expect(page.getByRole("status").getByText(form.sent)).toBeVisible();
  await expect(page.getByLabel(form.name, { exact: true })).toHaveValue("");
});

test("aponta o que falta publicar e restaura a revisão do histórico", async ({
  page,
}) => {
  await openSection(page, nav.profile);
  await page
    .getByRole("group", { name: new RegExp(`^${fields.headline}`) })
    .getByLabel(editor.english)
    .fill("");
  await save(page);

  await openSection(page, nav.home);
  await expect(page.getByText(publish.problemsIntro(1))).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: `Perfil › ${fields.headline} › em inglês`,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: publish.submit, exact: true }),
  ).toHaveCount(0);

  // A revisão no ar é a primeira da lista.
  await openSection(page, nav.history);
  const live = page
    .getByRole("listitem")
    .filter({ has: page.getByRole("heading", { name: /^Revisão \d+$/ }) })
    .first();
  await expect(live.getByText(history.live, { exact: true })).toBeVisible();
  await live.getByRole("button", { name: /^Restaurar como rascunho/ }).click();
  await page
    .getByRole("dialog", { name: /^Restaurar a revisão \d+\?$/ })
    .getByRole("button", { name: history.confirm })
    .click();
  await expect(
    live.getByRole("status").getByText(/^A revisão \d+ virou o rascunho/),
  ).toBeVisible();

  await openSection(page, nav.home);
  await expect(page.getByText(publish.nothingToPublish)).toBeVisible();
});

for (const colorScheme of ["light", "dark"] as const) {
  test(`site e pré-visualização sem violações do axe, no tema ${colorScheme === "light" ? "claro" : "escuro"}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    for (const path of ["/pt/", "/en/", "/admin/preview/pt"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(
        (await new AxeBuilder({ page }).analyze()).violations,
        path,
      ).toEqual([]);
    }
  });

  test(`telas de edição sem violações do axe, no tema ${colorScheme === "light" ? "claro" : "escuro"}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    const scan = async () =>
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await scan();
    for (const section of [nav.profile, nav.blocks, nav.resume, nav.history]) {
      await openSection(page, section);
      await scan();
    }

    await openSection(page, nav.blocks);
    await page
      .getByRole("link", { name: editor.editLabel("Experiência") })
      .click();
    await waitForPage(page, "Experiência");
    // O título desta tela sai do `generateMetadata`, que lê o banco e chega
    // depois do corpo: sem esperar, o axe pode ver a página sem `<title>`.
    await expect(page).toHaveTitle(/^Experiência · /);
    await page
      .getByRole("button", { name: /^Abrir / })
      .first()
      .click();
    await scan();
  });
}
