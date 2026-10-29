import "server-only";

import type { PublicDocument } from "@/content/public-projection";

import { resumeFiles, type ResumeFile } from "./catalog";
import { buildResumeModel, type ResumeOptions } from "./model";
import { renderResumePdf } from "./pdf";
import { renderResumeXlsx } from "./xlsx";

/**
 * Versão do formato dos arquivos. Sobe quando o gerador muda o que sai no
 * arquivo: os arquivos gravados com a versão anterior deixam de valer e são
 * gerados de novo no primeiro pedido.
 */
export const RESUME_FORMAT_VERSION = 1;

/**
 * Gera um arquivo do currículo.
 *
 * @param document - O documento, sem os campos privados.
 * @param file - O idioma e o formato.
 * @param options - O telefone, só na versão completa do painel.
 * @returns O conteúdo do arquivo.
 */
export async function renderResumeFile(
  document: PublicDocument,
  file: ResumeFile,
  options: ResumeOptions = {},
): Promise<Buffer> {
  const model = buildResumeModel(document, file.locale, options);
  return file.format === "pdf"
    ? renderResumePdf(model)
    : renderResumeXlsx(model);
}

/**
 * Gera os quatro arquivos públicos do currículo, sem telefone.
 *
 * @param document - O documento, sem os campos privados.
 * @returns O conteúdo de cada arquivo, pelo nome.
 */
export async function renderPublicResumeFiles(
  document: PublicDocument,
): Promise<Map<string, Buffer>> {
  const rendered = new Map<string, Buffer>();
  for (const file of resumeFiles) {
    rendered.set(file.name, await renderResumeFile(document, file));
  }
  return rendered;
}
