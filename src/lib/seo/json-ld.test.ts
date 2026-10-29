import { describe, expect, it } from "vitest";

import { toPublicDocument } from "@/content/public-projection";

import {
  FIXTURE_PHONE,
  portfolioFixture,
} from "../../../tests/fixtures/portfolio-document";

import { profilePageJsonLd, serializeJsonLd } from "./json-ld";

const OPTIONS = {
  origin: "https://example.com",
  publishedAt: "2026-10-29T12:00:00.000Z",
};

function build(locale: "pt-BR" | "en" = "en") {
  return profilePageJsonLd(
    toPublicDocument(structuredClone(portfolioFixture)),
    locale,
    OPTIONS,
  );
}

describe("profilePageJsonLd", () => {
  it("descreve a página e a pessoa com os dados do idioma", () => {
    expect(build()).toMatchObject({
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      url: "https://example.com/en/",
      inLanguage: "en",
      dateModified: "2026-10-29T12:00:00.000Z",
      mainEntity: {
        "@type": "Person",
        "@id": "https://example.com/#person",
        name: "Ana Exemplo da Silva",
        alternateName: "Ana Exemplo",
        jobTitle: "Full Stack Developer",
        description:
          "I'm a full stack developer who enjoys taking a project from requirements to running in production.",
        email: "mailto:ana@example.com",
        homeLocation: { "@type": "Place", name: "Recife, Brazil" },
        worksFor: [
          {
            "@type": "Organization",
            name: "Empresa Exemplo",
            url: "https://example.com/empresa",
          },
        ],
        alumniOf: [
          { "@type": "EducationalOrganization", name: "Instituto Exemplo" },
        ],
        knowsLanguage: [
          { "@type": "Language", name: "Portuguese" },
          { "@type": "Language", name: "English" },
        ],
        award: ["Runner-up at a regional hackathon"],
      },
    });
  });

  it("deixa de fora o link do próprio site e não repete habilidade", () => {
    const document = structuredClone(portfolioFixture);
    for (const link of document.profile.links) {
      if (link.kind === "website") {
        link.url = "https://portfolio.example.com/";
      }
    }
    const person = profilePageJsonLd(toPublicDocument(document), "en", {
      ...OPTIONS,
      origin: "https://portfolio.example.com",
    }).mainEntity as Record<string, unknown>;

    expect(person.sameAs).toEqual([
      "https://example.com/linkedin/ana-exemplo",
      "https://example.com/github/ana-exemplo",
    ]);
    const skills = person.knowsAbout as string[];
    expect(new Set(skills).size).toBe(skills.length);
    expect(skills).toContain("Spring Boot");
  });

  it("usa só o que a página mostra, nunca o telefone", () => {
    const text = JSON.stringify(build("pt-BR"));

    expect(text).not.toContain(FIXTURE_PHONE);
    expect(text).not.toContain("Agência Imaginária");
    expect(text).not.toContain("Projeto Arquivado");
  });
});

describe("serializeJsonLd", () => {
  it("não deixa o texto fechar a tag do script", () => {
    expect(serializeJsonLd({ name: "</script><b>" })).toBe(
      '{"name":"\\u003c/script>\\u003cb>"}',
    );
  });
});
