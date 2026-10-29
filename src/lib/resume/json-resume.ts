import { joinParts, type ResumeModel } from "./model";

/** O schema que o arquivo segue, versão fixa. */
export const JSON_RESUME_SCHEMA =
  "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json";

/**
 * O local escrito no painel separado em cidade e região, que é como o JSON
 * Resume pede: `Recife, PE, Brasil` dá a cidade e a região; `Recife, Brazil`,
 * só a cidade. O país fica de fora: o padrão quer o código (`BR`), e o texto
 * livre não dá para converter sem adivinhar.
 */
export function locationOf(text: string): { city?: string; region?: string } {
  const parts = text
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
  const [city] = parts;
  const region = parts.length >= 3 ? parts[1] : undefined;
  return {
    ...(city === undefined ? {} : { city }),
    ...(region === undefined ? {} : { region }),
  };
}

/**
 * Só as chaves com valor: o JSON Resume não quer `null`, texto vazio nem
 * lista ou objeto sem nada.
 */
function compact<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, entry]) =>
        entry !== null &&
        entry !== undefined &&
        entry !== "" &&
        !(typeof entry === "object" && Object.keys(entry).length === 0),
    ),
  ) as Partial<T>;
}

/**
 * Converte o currículo para o JSON Resume (`jsonresume.org`, v1.0.0), o
 * formato aberto que ferramentas de triagem e assistentes leem como dados.
 * Sai do mesmo modelo do PDF, então tem o mesmo conteúdo, nunca o telefone da
 * versão pública.
 *
 * - As datas ficam em `AAAA-MM`, que o padrão aceita. Um curso em andamento
 *   leva a conclusão prevista como `endDate`.
 * - As tecnologias de cada experiência e projeto vão em `keywords`.
 *
 * @param model - O currículo, de `buildResumeModel`.
 * @param options.portfolio - O endereço do portfólio no idioma do currículo.
 * @param options.canonical - O endereço deste arquivo.
 * @returns O JSON, com recuo de dois espaços e quebra de linha no fim.
 */
export function renderJsonResume(
  model: ResumeModel,
  options: { portfolio?: string | null; canonical?: string | null } = {},
): string {
  const resume = {
    $schema: JSON_RESUME_SCHEMA,
    basics: compact({
      name: model.fullName,
      label: model.headline,
      email: model.email,
      phone: model.phone,
      url: options.portfolio,
      summary: model.summary.join("\n"),
      location: locationOf(model.location),
      profiles: model.links.map((link) => ({
        network: link.label,
        url: link.url,
      })),
    }),
    work: model.experience.map((item) =>
      compact({
        name: item.company,
        position: item.role,
        location: joinParts([item.location, item.workMode]),
        startDate: item.start,
        endDate: item.end,
        highlights: item.highlights,
        keywords: item.technologies,
      }),
    ),
    education: model.education.map((item) =>
      compact({
        institution: item.institution,
        area: item.degree,
        startDate: item.start,
        endDate: item.end ?? item.expectedEnd,
        summary: [item.status, ...item.notes]
          .filter((line) => line !== null)
          .join("\n"),
      }),
    ),
    awards: model.awards.map((award) =>
      compact({
        title: award.title,
        date: award.date,
        awarder: award.issuer,
        summary: award.description.join("\n"),
      }),
    ),
    skills: model.skills.map((group) => ({
      name: group.name,
      keywords: group.skills,
    })),
    languages: model.languages.map((language) => ({
      language: language.name,
      fluency: language.level,
    })),
    projects: model.projects.map((project) =>
      compact({
        name: project.name,
        description: project.summary,
        url: project.websiteUrl ?? project.repositoryUrl,
        repository: project.websiteUrl === null ? null : project.repositoryUrl,
        keywords: project.technologies,
      }),
    ),
    meta: compact({
      canonical: options.canonical,
      language: model.locale,
    }),
  };
  return `${JSON.stringify(resume, null, 2)}\n`;
}
