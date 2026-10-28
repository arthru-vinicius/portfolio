import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { toPublicDocument } from "@/content/public-projection";
import { en } from "@/i18n/dictionaries/en";
import { ptBR } from "@/i18n/dictionaries/pt-BR";

import {
  FIXTURE_PHONE,
  portfolioFixture,
} from "../../../tests/fixtures/portfolio-document";

import { SitePage } from "./site-page";

function render(locale: "pt-BR" | "en", ownHost: string | null = null): string {
  return renderToStaticMarkup(
    <SitePage
      document={toPublicDocument(structuredClone(portfolioFixture))}
      locale={locale}
      ownHost={ownHost}
    />,
  );
}

describe("SitePage", () => {
  it("mostra o perfil e uma seção por bloco visível, com âncoras do idioma", () => {
    const html = render("pt-BR");

    expect(html).toContain("Ana Exemplo");
    expect(html).toContain("Desenvolvedora Full Stack");
    for (const anchor of [
      ptBR.anchors.about,
      ptBR.anchors.experience,
      ptBR.anchors.projects,
      ptBR.anchors.contact,
    ]) {
      expect(html).toContain(`id="${anchor}"`);
      expect(html).toContain(`href="#${anchor}"`);
    }
  });

  it("deixa de fora o que está oculto no painel", () => {
    const html = render("pt-BR");

    expect(html).not.toContain("Agência Imaginária");
    expect(html).not.toContain("Projeto Arquivado");
    expect(html).not.toContain("Bastidores");
  });

  it("nunca mostra o telefone, que é privado", () => {
    expect(render("pt-BR")).not.toContain(FIXTURE_PHONE);
    expect(render("en")).not.toContain(FIXTURE_PHONE);
  });

  it("esconde o link do perfil que aponta para o próprio site", () => {
    expect(render("pt-BR", "example.com")).not.toContain(
      'href="https://example.com"',
    );
    expect(render("pt-BR", null)).toContain('href="https://example.com"');
  });

  it("escreve tudo no idioma da página", () => {
    const html = render("en");

    expect(html).toContain("Full Stack Developer");
    expect(html).toContain(`id="${en.anchors.experience}"`);
    expect(html).toContain(en.site.present);
    expect(html).not.toContain(ptBR.site.contactCta);
  });
});
