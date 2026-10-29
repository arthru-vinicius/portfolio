import { describe, expect, it } from "vitest";

import { toPublicDocument } from "@/content/public-projection";

import { portfolioFixture } from "../../../tests/fixtures/portfolio-document";

import {
  SHARE_IMAGE_SIZE,
  localeAlternates,
  publishedPageMetadata,
  shareImagePath,
} from "./metadata";

const document = () => toPublicDocument(structuredClone(portfolioFixture));
const ORIGIN = "https://portfolio.example.com";

describe("localeAlternates", () => {
  it("dá o endereço de cada idioma, com a barra, e a raiz como x-default", () => {
    expect(localeAlternates(ORIGIN)).toEqual({
      "pt-BR": "https://portfolio.example.com/pt/",
      en: "https://portfolio.example.com/en/",
      "x-default": "https://portfolio.example.com/",
    });
  });
});

describe("shareImagePath", () => {
  it("leva a revisão na URL, para as redes buscarem a imagem nova", () => {
    expect(shareImagePath("en", 7)).toBe("/en/og.jpg?v=7");
  });
});

describe("publishedPageMetadata", () => {
  it("monta título, descrição, canônica, hreflang e o cartão no idioma", () => {
    const metadata = publishedPageMetadata(document(), "pt-BR", {
      origin: ORIGIN,
      revisionId: 3,
    });
    const image = {
      url: "/pt/og.jpg?v=3",
      ...SHARE_IMAGE_SIZE,
      alt: "Ana Exemplo, Desenvolvedora Full Stack, em Recife, PE, Brasil",
    };

    expect(metadata).toMatchObject({
      title: "Ana Exemplo · Desenvolvedora Full Stack",
      description:
        "Portfólio de Ana Exemplo, Desenvolvedora Full Stack em Recife, PE, Brasil: experiência, projetos e currículo em PDF e DOCX.",
      metadataBase: new URL(ORIGIN),
      alternates: {
        canonical: "/pt/",
        languages: localeAlternates(ORIGIN),
      },
      openGraph: {
        type: "profile",
        url: "/pt/",
        siteName: "Ana Exemplo",
        locale: "pt_BR",
        alternateLocale: ["en_US"],
        images: [image],
      },
      twitter: { card: "summary_large_image", images: [image] },
    });
  });

  it("sem PUBLIC_ORIGIN, não declara canônica nem base absoluta", () => {
    const metadata = publishedPageMetadata(document(), "en", {
      origin: null,
      revisionId: 1,
    });

    expect(metadata.title).toBe("Ana Exemplo · Full Stack Developer");
    expect(metadata).not.toHaveProperty("alternates");
    expect(metadata).not.toHaveProperty("metadataBase");
  });
});
