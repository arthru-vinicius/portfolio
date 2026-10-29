import "server-only";

import type { PublicDocument } from "@/content/public-projection";
import { localeHomePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

import { resumeFiles, type ResumeFile } from "./catalog";
import { renderResumeDocx } from "./docx";
import { renderJsonResume } from "./json-resume";
import { layoutResume } from "./layout";
import { renderResumeMarkdown } from "./markdown";
import {
  buildResumeModel,
  type ResumeModel,
  type ResumeOptions,
} from "./model";
import { renderResumePdf } from "./pdf";
import { displayUrl } from "./plain-text";

/** Opções de um arquivo do currículo. */
export type ResumeFileOptions = ResumeOptions & {
  /**
   * A origem canônica (`PUBLIC_ORIGIN`). O Markdown e o JSON levam o endereço
   * do portfólio e o do próprio arquivo; sem ela, saem sem os dois.
   */
  origin?: string | null;
};

/** Se algum link do perfil aponta para o host de um endereço. */
function linksToHost(model: ResumeModel, url: string): boolean {
  const { host } = new URL(url);
  return model.links.some((link) => {
    try {
      return new URL(link.url).host === host;
    } catch {
      return false;
    }
  });
}

/**
 * Gera um arquivo do currículo.
 *
 * @param document - O documento, sem os campos privados.
 * @param file - O idioma e o formato.
 * @param options - O telefone, só na versão completa do painel, e a origem.
 * @returns O conteúdo do arquivo.
 */
export async function renderResumeFile(
  document: PublicDocument,
  file: ResumeFile,
  options: ResumeFileOptions = {},
): Promise<Buffer> {
  const model = buildResumeModel(document, file.locale, options);
  const { origin } = options;
  const absolute = (path: string) =>
    origin === null || origin === undefined ? null : new URL(path, origin).href;
  const portfolio = absolute(localeHomePath(file.locale));
  switch (file.format) {
    case "pdf":
      return renderResumePdf(model);
    case "docx":
      return renderResumeDocx(model);
    case "md":
      return Buffer.from(
        renderResumeMarkdown(layoutResume(model), {
          // Se um link do perfil já é o próprio site, ele não entra duas vezes.
          portfolio:
            portfolio === null || linksToHost(model, portfolio)
              ? null
              : {
                  label: getDictionary(file.locale).resume.portfolio,
                  url: portfolio,
                  display: displayUrl(portfolio),
                },
        }),
        "utf8",
      );
    case "json":
      return Buffer.from(
        renderJsonResume(model, {
          portfolio,
          canonical: absolute(`/cv/${file.name}`),
        }),
        "utf8",
      );
  }
}

/**
 * Gera os oito arquivos públicos do currículo, sem telefone.
 *
 * @param document - O documento, sem os campos privados.
 * @param options.origin - A origem canônica, para os links do Markdown e do
 *   JSON.
 * @returns O conteúdo de cada arquivo, pelo nome.
 */
export async function renderPublicResumeFiles(
  document: PublicDocument,
  options: { origin?: string | null } = {},
): Promise<Map<string, Buffer>> {
  const rendered = new Map<string, Buffer>();
  for (const file of resumeFiles) {
    rendered.set(
      file.name,
      await renderResumeFile(document, file, { origin: options.origin }),
    );
  }
  return rendered;
}
