import type { PublicDocument } from "@/content/public-projection";
import { localeHomePath, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { fillTemplate } from "@/i18n/template";
import { resumeFile, type ResumeFormat } from "@/lib/resume/catalog";
import { escapeMarkdown } from "@/lib/resume/markdown";
import { buildResumeModel } from "@/lib/resume/model";

/**
 * O idioma do `llms.txt`. É um arquivo só, e os assistentes que o leem
 * trabalham em inglês; cada arquivo listado leva o nome no idioma dele.
 */
const LLMS_LOCALE: Locale = "en";

/** O inglês primeiro, depois os outros idiomas, na ordem do site. */
const ORDER: readonly Locale[] = [
  LLMS_LOCALE,
  ...locales.filter((locale) => locale !== LLMS_LOCALE),
];

/** Um item de lista do `llms.txt`: `- [nome](endereço): nota`. */
function entry(label: string, href: string, note?: string): string {
  return `- [${escapeMarkdown(label)}](${href})${note === undefined ? "" : `: ${escapeMarkdown(note)}`}`;
}

/**
 * O `/llms.txt` do site, na convenção do `llmstxt.org`: quem é a pessoa, em
 * uma linha, e os links para o que um assistente de IA lê melhor que a página:
 *
 * - **Résumé:** o currículo em Markdown e em JSON Resume, nos dois idiomas;
 * - **Portfolio:** as páginas do site;
 * - **Profiles** e **Contact:** os links do perfil, o e-mail e o contato;
 * - **Optional:** o PDF e o DOCX, que a convenção deixa pular.
 *
 * Sai só do conteúdo publicado e do resumo do currículo, nunca de campo
 * privado.
 *
 * @param document - O documento publicado, sem os campos privados.
 * @param origin - A origem dos links absolutos.
 * @returns O texto, em Markdown, terminado em quebra de linha.
 */
export function llmsTxt(document: PublicDocument, origin: string): string {
  const dict = getDictionary(LLMS_LOCALE).llms;
  const model = buildResumeModel(document, LLMS_LOCALE);
  const url = (path: string) => new URL(path, origin).href;
  const files = (formats: readonly ResumeFormat[]) =>
    ORDER.flatMap((locale) => {
      const labels = getDictionary(locale).llms;
      return formats.map((format) => {
        const note =
          format === "md"
            ? labels.mdNote
            : format === "json"
              ? labels.jsonNote
              : undefined;
        return entry(
          labels[format],
          url(`/cv/${resumeFile(locale, format).name}`),
          note,
        );
      });
    });

  const intro = fillTemplate(dict.intro, {
    headline: model.headline,
    location: model.location,
  });
  const contact = [
    ...(model.email === null
      ? []
      : [entry(dict.email, `mailto:${model.email}`)]),
    entry(
      dict.contactSection,
      url(
        `${localeHomePath(LLMS_LOCALE)}#${getDictionary(LLMS_LOCALE).anchors.contact}`,
      ),
    ),
  ];
  const sections: [string, string[]][] = [
    [dict.resumeHeading, files(["md", "json"])],
    [
      dict.pagesHeading,
      ORDER.map((locale) =>
        entry(getDictionary(locale).llms.home, url(localeHomePath(locale))),
      ),
    ],
    [
      dict.profilesHeading,
      model.links.map((link) => entry(link.label, link.url)),
    ],
    [dict.contactHeading, contact],
    // O título "Optional" tem sentido na convenção: o que dá para pular.
    ["Optional", files(["pdf", "docx"])],
  ];

  return `${[
    `# ${escapeMarkdown(model.fullName)}`,
    `> ${escapeMarkdown(intro)}`,
    ...model.summary.map(escapeMarkdown),
    ...sections
      .filter(([, items]) => items.length > 0)
      .map(
        ([heading, items]) =>
          `## ${escapeMarkdown(heading)}\n\n${items.join("\n")}`,
      ),
  ].join("\n\n")}\n`;
}
