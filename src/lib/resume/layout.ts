import { getDictionary } from "@/i18n/dictionaries";
import { fillTemplate } from "@/i18n/template";

import { joinParts, type ResumeModel } from "./model";
import { displayUrl } from "./plain-text";

/** Um link escrito por extenso, com um rótulo opcional antes, como `Código:`. */
export type ResumeLinkRun = {
  label: string | null;
  url: string;
  display: string;
};

/**
 * Uma linha do currículo, já com o texto final. Os geradores decidem só a
 * aparência de cada tipo.
 *
 * - `item`: começo de um item (uma experiência, um projeto), com o começo em
 *   negrito; entre dois itens há um respiro.
 * - `pair`: rótulo em negrito e texto, como `Backend: PHP, Node.js`.
 * - `meta`: linha secundária, menor, como o local e o período.
 * - `text`: parágrafo.
 * - `bullets`: lista com marcador.
 * - `links`: endereços escritos por extenso.
 */
export type ResumeLine =
  | { kind: "item"; lead: string; rest: string }
  | { kind: "pair"; lead: string; rest: string }
  | { kind: "meta"; text: string }
  | { kind: "text"; text: string }
  | { kind: "bullets"; items: readonly string[] }
  | { kind: "links"; links: readonly ResumeLinkRun[] };

/** Uma seção do currículo, com o título padrão do mercado. */
export type ResumeLayoutSection = {
  title: string;
  lines: readonly ResumeLine[];
};

/** O currículo pronto para desenhar, igual no PDF e no DOCX. */
export type ResumeLayout = {
  lang: string;
  /** Metadados do arquivo. */
  title: string;
  author: string;
  subject: string;
  keywords: readonly string[];
  /** Identificação, no corpo do documento. */
  name: string;
  headline: string;
  contact: string;
  links: readonly ResumeLinkRun[];
  sections: readonly ResumeLayoutSection[];
};

/** As palavras-chave do arquivo: habilidades e tecnologias, sem repetir. */
function keywordsOf(model: ResumeModel): string[] {
  const seen = new Set<string>();
  return [
    ...model.skills.flatMap((group) => group.skills),
    ...model.experience.flatMap((item) => item.technologies),
  ].filter((keyword) => {
    const key = keyword.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

const textLines = (lines: readonly string[]): ResumeLine[] =>
  lines.map((text) => ({ kind: "text", text }));

/**
 * Dispõe o currículo em seções e linhas, na ordem final. É a parte comum ao
 * PDF e ao DOCX: os dois têm o mesmo texto, na mesma ordem, e uma seção vazia
 * não aparece em nenhum.
 *
 * @param model - O currículo, de `buildResumeModel`.
 * @returns O currículo pronto para desenhar.
 */
export function layoutResume(model: ResumeModel): ResumeLayout {
  const labels = getDictionary(model.locale).resume;
  const { sections: titles } = labels;
  const technologies = (list: readonly string[]): ResumeLine[] =>
    list.length === 0
      ? []
      : [{ kind: "meta", text: `${labels.technologies}: ${list.join(", ")}` }];

  const sections: ResumeLayoutSection[] = [
    {
      title: titles.summary,
      lines: textLines(model.summary),
    },
    {
      title: titles.experience,
      lines: model.experience.flatMap((item): ResumeLine[] => [
        {
          kind: "item",
          lead: item.role,
          rest: item.company === "" ? "" : `· ${item.company}`,
        },
        {
          kind: "meta",
          text: joinParts([item.location, item.workMode, item.period]),
        },
        { kind: "bullets", items: item.highlights },
        ...technologies(item.technologies),
      ]),
    },
    {
      title: titles.skills,
      lines: model.skills.map((group) => ({
        kind: "pair",
        lead: `${group.name}:`,
        rest: group.skills.join(", "),
      })),
    },
    {
      title: titles.projects,
      lines: model.projects.flatMap((project): ResumeLine[] => {
        const links = [
          { label: labels.code, url: project.repositoryUrl },
          { label: labels.website, url: project.websiteUrl },
        ].flatMap(({ label, url }) =>
          url === null ? [] : [{ label, url, display: displayUrl(url) }],
        );
        return [
          {
            kind: "item",
            lead: project.name,
            rest: project.summary === "" ? "" : `· ${project.summary}`,
          },
          ...technologies(project.technologies),
          ...(links.length === 0 ? [] : [{ kind: "links" as const, links }]),
        ];
      }),
    },
    {
      title: titles.education,
      lines: model.education.flatMap((item): ResumeLine[] => [
        { kind: "item", lead: item.degree, rest: "" },
        {
          kind: "meta",
          text: joinParts([item.institution, item.location, item.period]),
        },
        ...(item.status === null
          ? []
          : [{ kind: "meta" as const, text: item.status }]),
        ...textLines(item.notes),
      ]),
    },
    {
      title: titles.awards,
      lines: model.awards.flatMap((award): ResumeLine[] => [
        { kind: "item", lead: award.title, rest: "" },
        { kind: "meta", text: joinParts([award.issuer, award.dateLabel]) },
        ...textLines(award.description),
      ]),
    },
    {
      title: titles.languages,
      lines: model.languages.map((language) => ({
        kind: "pair",
        lead: `${language.name}:`,
        rest: language.level,
      })),
    },
  ];

  return {
    lang: model.locale,
    title: fillTemplate(labels.documentTitle, { name: model.fullName }),
    author: model.fullName,
    subject: model.headline,
    keywords: keywordsOf(model),
    name: model.fullName,
    headline: model.headline,
    contact: joinParts([model.location, model.email, model.phone]),
    links: model.links.map((link) => ({ ...link, label: null })),
    sections: sections.filter((section) => section.lines.length > 0),
  };
}
