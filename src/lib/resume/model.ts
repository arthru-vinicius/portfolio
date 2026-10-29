import type { PublicDocument } from "@/content/public-projection";
import type { Block } from "@/content/schema";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { fillTemplate } from "@/i18n/template";

import { displayUrl, markdownToLines } from "./plain-text";

/**
 * As seções do currículo, na ordem fixa do mercado. Ela não segue a ordem dos
 * blocos do site.
 */
export const RESUME_SECTIONS = [
  "summary",
  "experience",
  "skills",
  "projects",
  "education",
  "awards",
  "languages",
] as const;

/** Uma seção do currículo. */
export type ResumeSection = (typeof RESUME_SECTIONS)[number];

/** Um link do perfil: o nome do tipo, o endereço e o endereço para ler. */
export type ResumeLink = { label: string; url: string; display: string };

/** Uma experiência profissional. Os meses ficam em `AAAA-MM`. */
export type ResumeExperience = {
  role: string;
  company: string;
  location: string;
  /** A modalidade, como `Híbrido`, ou `null` se não foi informada. */
  workMode: string | null;
  start: string;
  /** `null` é o emprego atual. */
  end: string | null;
  /** Como `10/2024 – 10/2025` ou `10/2025 – atual`. */
  period: string;
  /** Os destaques marcados; sem nenhum, o resumo da experiência. */
  highlights: string[];
  technologies: string[];
};

/** Um projeto. */
export type ResumeProject = {
  name: string;
  summary: string;
  technologies: string[];
  repositoryUrl: string | null;
  websiteUrl: string | null;
};

/** Um grupo de habilidades. */
export type ResumeSkillGroup = { name: string; skills: string[] };

/** Um curso. Os meses ficam em `AAAA-MM`. */
export type ResumeEducation = {
  degree: string;
  institution: string;
  location: string;
  start: string;
  end: string | null;
  expectedEnd: string | null;
  /** Como `09/2022 – 12/2025`, ou `09/2022 – atual` em andamento. */
  period: string;
  /** Em andamento: `conclusão prevista em 06/2027`, ou `em andamento`. */
  status: string | null;
  notes: string[];
};

/** Um prêmio. */
export type ResumeAward = {
  title: string;
  issuer: string;
  /** Em `AAAA-MM`. */
  date: string;
  /** Como `09/2024`. */
  dateLabel: string;
  description: string[];
};

/** Um idioma e o nível. */
export type ResumeLanguage = { name: string; level: string };

/**
 * O currículo num idioma, em texto puro e na ordem final. Os geradores de PDF
 * e de DOCX só desenham esta estrutura; nenhum dos dois decide o que entra.
 */
export type ResumeModel = {
  locale: Locale;
  fullName: string;
  /** Nome curto, para o nome do arquivo baixado. */
  displayName: string;
  headline: string;
  location: string;
  email: string | null;
  /** Só na versão completa do painel; a pública nunca tem telefone. */
  phone: string | null;
  links: ResumeLink[];
  /** O resumo profissional, uma linha por parágrafo. */
  summary: string[];
  experience: ResumeExperience[];
  skills: ResumeSkillGroup[];
  projects: ResumeProject[];
  education: ResumeEducation[];
  awards: ResumeAward[];
  languages: ResumeLanguage[];
};

/** Opções do currículo. */
export type ResumeOptions = {
  /**
   * O telefone, para a versão completa gerada no painel. Ele vem à parte
   * porque o documento público não tem campo privado nenhum.
   */
  phone?: string;
};

/**
 * Formata um mês do conteúdo como no currículo: igual nos dois idiomas, que é o
 * formato que o ATS lê sem erro.
 *
 * @param yearMonth - O mês, em `AAAA-MM`.
 * @returns Como `10/2025`.
 */
export function formatResumeMonth(yearMonth: string): string {
  const [year = "", month = ""] = yearMonth.split("-");
  return `${month}/${year}`;
}

/** O valor de comparação de um fim: o emprego atual vem antes de todos. */
const endKey = (end: string | null) => end ?? "9999-99";

/** Do mais recente para o mais antigo: pelo fim e, empatado, pelo início. */
function byRecency(
  a: { start: string; end: string | null },
  b: { start: string; end: string | null },
): number {
  return (
    endKey(b.end).localeCompare(endKey(a.end)) || b.start.localeCompare(a.start)
  );
}

/** O bloco de um tipo, se o documento tiver; o schema garante um por tipo. */
function blockOfType<T extends Block["type"]>(
  document: PublicDocument,
  type: T,
): Extract<Block, { type: T }> | undefined {
  return document.blocks.find(
    (block): block is Extract<Block, { type: T }> => block.type === type,
  );
}

/**
 * Os itens marcados para o currículo. Um bloco ou item oculto no site ainda
 * serve: o que decide é a marcação de cada item.
 */
function selected<T extends { inResume: boolean }>(
  items: readonly T[] | undefined,
): T[] {
  return (items ?? []).filter((item) => item.inResume);
}

/**
 * Monta o currículo de um idioma a partir do documento publicado (ou do
 * rascunho, no painel):
 *
 * - entra só o que está marcado com `inResume`, mesmo oculto no site; dos
 *   destaques, só os marcados;
 * - as seções seguem a ordem fixa de `RESUME_SECTIONS`;
 * - experiências, cursos e prêmios vêm do mais recente para o mais antigo;
 *   projetos, habilidades e idiomas, na ordem do painel;
 * - o Markdown vira texto puro, com os endereços dos links escritos;
 * - os meses saem como `MM/AAAA`, e o emprego atual, como `atual`.
 *
 * Não calcula duração: o arquivo é gerado na publicação, e a duração do
 * emprego atual ficaria velha. As datas bastam para o ATS fazer a conta.
 *
 * @param document - O documento, sem os campos privados.
 * @param locale - O idioma do currículo.
 * @param options - O telefone, só na versão completa.
 * @returns O currículo, pronto para os geradores.
 */
export function buildResumeModel(
  document: PublicDocument,
  locale: Locale,
  options: ResumeOptions = {},
): ResumeModel {
  const dict = getDictionary(locale);
  const labels = dict.resume;
  const period = (start: string, end: string | null) =>
    fillTemplate(labels.period, {
      start: formatResumeMonth(start),
      end: end === null ? labels.present : formatResumeMonth(end),
    });
  const { profile } = document;

  const experience = selected(blockOfType(document, "experience")?.items)
    .toSorted(byRecency)
    .map((item): ResumeExperience => {
      const highlights = item.highlights
        .filter((highlight) => highlight.inResume)
        .map((highlight) => highlight.text[locale].trim())
        .filter((text) => text !== "");
      return {
        role: item.role[locale],
        company: item.company,
        location: item.location[locale],
        workMode:
          item.workMode === undefined ? null : dict.workModes[item.workMode],
        start: item.start,
        end: item.end,
        period: period(item.start, item.end),
        highlights:
          highlights.length > 0
            ? highlights
            : markdownToLines(item.summary[locale]),
        technologies: item.technologies,
      };
    });

  const education = selected(blockOfType(document, "education")?.items)
    .toSorted(byRecency)
    .map((item): ResumeEducation => ({
      degree: item.degree[locale],
      institution: item.institution,
      location: item.location[locale],
      start: item.start,
      end: item.end,
      expectedEnd: item.end === null ? item.expectedEnd : null,
      period: period(item.start, item.end),
      status:
        item.end !== null
          ? null
          : item.expectedEnd === null
            ? labels.inProgress
            : fillTemplate(labels.expectedEnd, {
                date: formatResumeMonth(item.expectedEnd),
              }),
      notes: markdownToLines(item.notes[locale]),
    }));

  const awards = selected(blockOfType(document, "awards")?.items)
    .toSorted((a, b) => b.date.localeCompare(a.date))
    .map((item): ResumeAward => ({
      title: item.title[locale],
      issuer: item.issuer,
      date: item.date,
      dateLabel: formatResumeMonth(item.date),
      description: markdownToLines(item.description[locale]),
    }));

  return {
    locale,
    fullName: profile.fullName,
    displayName: profile.displayName,
    headline: profile.headline[locale],
    location: profile.location[locale],
    email: profile.publicEmail ?? null,
    phone: options.phone?.trim() || null,
    links: profile.links.map((link) => ({
      label:
        link.kind === "other"
          ? (link.label ?? displayUrl(link.url))
          : dict.links[link.kind],
      url: link.url,
      display: displayUrl(link.url),
    })),
    summary: markdownToLines(document.resume.summary[locale]),
    experience,
    skills: selected(blockOfType(document, "skills")?.groups)
      .filter((group) => group.skills.length > 0)
      .map((group) => ({ name: group.name[locale], skills: group.skills })),
    projects: selected(blockOfType(document, "projects")?.items).map(
      (item): ResumeProject => ({
        name: item.name,
        summary: item.summary[locale],
        technologies: item.technologies,
        repositoryUrl: item.repositoryUrl ?? null,
        websiteUrl: item.websiteUrl ?? null,
      }),
    ),
    education,
    awards,
    languages: selected(blockOfType(document, "languages")?.items).map(
      (item) => ({ name: item.name[locale], level: item.level[locale] }),
    ),
  };
}

/**
 * Junta partes de uma linha do currículo, pulando as vazias.
 *
 * @param parts - As partes, como o local e o período.
 * @param separator - O separador; o padrão é ` · `.
 * @returns A linha.
 */
export function joinParts(
  parts: readonly (string | null)[],
  separator = " · ",
): string {
  return parts
    .filter((part): part is string => part !== null && part.trim() !== "")
    .join(separator);
}
