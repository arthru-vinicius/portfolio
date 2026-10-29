import type { PublicDocument } from "@/content/public-projection";
import type { Block } from "@/content/schema";
import { siteBlocks } from "@/content/site-view";
import { localeHomePath, type Locale } from "@/i18n/config";
import { markdownToLines } from "@/lib/resume/plain-text";

type JsonLd = Record<string, unknown>;

function blockOfType<T extends Block["type"]>(
  blocks: readonly Block[],
  type: T,
): Extract<Block, { type: T }> | undefined {
  return blocks.find(
    (block): block is Extract<Block, { type: T }> => block.type === type,
  );
}

/** Lista vazia vira ausente: o JSON-LD não leva campo sem valor. */
const nonEmpty = <T>(list: readonly T[]): readonly T[] | undefined =>
  list.length === 0 ? undefined : list;

/**
 * Os dados estruturados da página (schema.org `ProfilePage`, com a pessoa em
 * `mainEntity`), para buscadores e assistentes de IA lerem o perfil sem
 * adivinhar.
 *
 * Saem só do que a página mostra: os blocos e itens visíveis e os links do
 * perfil. O que está oculto no site, mesmo que vá para o currículo, fica de
 * fora, como pedem as regras do Google para dados estruturados.
 *
 * @param document - O documento publicado, sem os campos privados.
 * @param locale - O idioma da página.
 * @param options.origin - A origem canônica (`PUBLIC_ORIGIN`).
 * @param options.publishedAt - Hora da publicação, em ISO 8601.
 * @returns O objeto JSON-LD.
 */
export function profilePageJsonLd(
  document: PublicDocument,
  locale: Locale,
  options: { origin: string; publishedAt: string },
): JsonLd {
  const { profile } = document;
  const blocks = siteBlocks(document);
  const pageUrl = new URL(localeHomePath(locale), options.origin).href;
  const ownHost = new URL(options.origin).hostname;
  const about = blockOfType(blocks, "about");
  const experience = blockOfType(blocks, "experience")?.items ?? [];
  const education = blockOfType(blocks, "education")?.items ?? [];
  const skills = blockOfType(blocks, "skills")?.groups ?? [];
  const languages = blockOfType(blocks, "languages")?.items ?? [];
  const awards = blockOfType(blocks, "awards")?.items ?? [];

  const sameAs = profile.links
    .map((link) => link.url)
    .filter((url) => {
      try {
        return new URL(url).hostname !== ownHost;
      } catch {
        return false;
      }
    });

  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: pageUrl,
    inLanguage: locale,
    dateModified: options.publishedAt,
    mainEntity: {
      "@type": "Person",
      "@id": new URL("/#person", options.origin).href,
      name: profile.fullName,
      alternateName:
        profile.displayName === profile.fullName
          ? undefined
          : profile.displayName,
      jobTitle: profile.headline[locale],
      description:
        about === undefined
          ? undefined
          : markdownToLines(about.body[locale])[0],
      url: pageUrl,
      image:
        profile.photo === undefined
          ? undefined
          : new URL(`/media/${profile.photo.id}-960.webp`, options.origin).href,
      email:
        profile.publicEmail === undefined
          ? undefined
          : `mailto:${profile.publicEmail}`,
      homeLocation: { "@type": "Place", name: profile.location[locale] },
      sameAs: nonEmpty(sameAs),
      worksFor: nonEmpty(
        experience
          .filter((item) => item.end === null)
          .map((item) => ({
            "@type": "Organization",
            name: item.company,
            url: item.companyUrl,
          })),
      ),
      alumniOf: nonEmpty(
        education.map((item) => ({
          "@type": "EducationalOrganization",
          name: item.institution,
        })),
      ),
      knowsAbout: nonEmpty([
        ...new Set(skills.flatMap((group) => group.skills)),
      ]),
      knowsLanguage: nonEmpty(
        languages.map((item) => ({
          "@type": "Language",
          name: item.name[locale],
        })),
      ),
      award: nonEmpty(awards.map((item) => item.title[locale])),
    },
  };
}

/**
 * Escreve o JSON-LD para dentro de um `<script>`. O `<` vira `<`, para um
 * texto do conteúdo nunca fechar a tag do script.
 *
 * @param data - O objeto JSON-LD.
 * @returns O texto do script.
 */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
