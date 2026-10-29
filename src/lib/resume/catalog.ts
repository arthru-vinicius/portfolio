import { slugify } from "@/content/site-view";
import { locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

/**
 * Os formatos do currículo. PDF e DOCX são para quem lê e para o ATS; o
 * Markdown e o JSON Resume, para assistentes de IA e ferramentas de triagem
 * que leem texto ou dados sem adivinhar o layout.
 */
export const resumeFormats = ["pdf", "docx", "md", "json"] as const;

/** Um formato do currículo. */
export type ResumeFormat = (typeof resumeFormats)[number];

/** Os formatos que o botão "Baixar currículo" oferece a quem visita. */
export const downloadFormats = ["pdf", "docx"] as const;

/** Um formato do botão "Baixar currículo". */
export type DownloadFormat = (typeof downloadFormats)[number];

/** Tipo de cada formato, para o `Content-Type` e o atributo `type` do link. */
export const resumeContentTypes: Readonly<Record<ResumeFormat, string>> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  md: "text/markdown; charset=utf-8",
  json: "application/json; charset=utf-8",
};

/**
 * Como o arquivo é entregue: o DOCX baixa; o PDF, o Markdown e o JSON abrem
 * no navegador, onde uma pessoa ou um agente lê sem salvar.
 *
 * @param format - O formato.
 * @returns O tipo do `Content-Disposition`.
 */
export function resumeDisposition(
  format: ResumeFormat,
): "inline" | "attachment" {
  return format === "docx" ? "attachment" : "inline";
}

/**
 * O nome do arquivo de cada idioma na URL, como `/cv/curriculo.pdf` e
 * `/cv/resume.pdf`. Não muda a cada publicação: um recrutador ou um agente de
 * IA pode guardar o endereço.
 */
export const resumeFileStems: Readonly<Record<Locale, string>> = {
  "pt-BR": "curriculo",
  en: "resume",
};

/** Um arquivo do currículo: um idioma num formato. */
export type ResumeFile = {
  locale: Locale;
  format: ResumeFormat;
  /** O nome na URL e na pasta, como `curriculo.pdf`. */
  name: string;
};

/** Os oito arquivos: dois idiomas em quatro formatos. */
export const resumeFiles: readonly ResumeFile[] = locales.flatMap((locale) =>
  resumeFormats.map((format) => resumeFile(locale, format)),
);

/**
 * O arquivo de um idioma num formato.
 *
 * @param locale - O idioma.
 * @param format - O formato.
 * @returns O arquivo, como `curriculo.md`.
 */
export function resumeFile(locale: Locale, format: ResumeFormat): ResumeFile {
  return { locale, format, name: `${resumeFileStems[locale]}.${format}` };
}

/**
 * Lê o nome de um arquivo do currículo. Serve também de filtro: só os oito
 * nomes passam.
 *
 * @param name - O nome pedido na URL.
 * @returns O arquivo, ou `null` se o nome não for de um deles.
 */
export function parseResumeFileName(name: string): ResumeFile | null {
  return resumeFiles.find((file) => file.name === name) ?? null;
}

/**
 * O nome com que o arquivo é salvo por quem baixa, como
 * `ana-exemplo-curriculo.pdf`.
 *
 * @param displayName - O nome curto do perfil.
 * @param file - O arquivo.
 * @param suffix - Um acréscimo antes da extensão, como `rascunho`.
 * @returns O nome, só com letras sem acento, números e hífen.
 */
export function downloadFileName(
  displayName: string,
  file: ResumeFile,
  suffix?: string,
): string {
  const parts = [
    slugify(displayName),
    getDictionary(file.locale).resume.fileName,
    suffix === undefined ? "" : slugify(suffix),
  ].filter((part) => part !== "");
  return `${parts.join("-")}.${file.format}`;
}

/** Um arquivo do currículo como o botão "Baixar currículo" o oferece. */
export type ResumeDownload = ResumeFile & {
  format: DownloadFormat;
  href: string;
  /** O nome sugerido ao salvar, para o atributo `download`. */
  fileName: string;
  /** Tamanho em bytes, quando já se sabe. */
  size: number | null;
};

const isDownload = (
  file: ResumeFile,
): file is ResumeFile & { format: DownloadFormat } =>
  (downloadFormats as readonly ResumeFormat[]).includes(file.format);

/**
 * Os links do botão "Baixar currículo": PDF e DOCX nos dois idiomas. O
 * Markdown e o JSON ficam fora do botão; quem os acha é o `/llms.txt` e o
 * `<link rel="alternate">` da página.
 *
 * @param displayName - O nome curto do perfil, para o nome do arquivo salvo.
 * @param options.basePath - Onde os arquivos ficam: `/cv` no site,
 *   `/admin/cv` na pré-visualização do rascunho.
 * @param options.sizes - O tamanho de cada arquivo, pelo nome, se já se sabe.
 * @param options.suffix - Acréscimo ao nome do arquivo salvo, como
 *   `rascunho`.
 * @param options.revisionId - A revisão publicada. Vai no link como `?v=`:
 *   o navegador guarda o arquivo por endereço, e o endereço novo depois de
 *   publicar faz ele baixar a versão nova. A URL sem `?v=` continua valendo.
 * @returns Um link por arquivo.
 */
export function resumeDownloads(
  displayName: string,
  options: {
    basePath: string;
    sizes?: ReadonlyMap<string, number>;
    suffix?: string;
    revisionId?: number;
  },
): ResumeDownload[] {
  const query =
    options.revisionId === undefined ? "" : `?v=${options.revisionId}`;
  return resumeFiles.filter(isDownload).map((file) => ({
    ...file,
    href: `${options.basePath}/${file.name}${query}`,
    fileName: downloadFileName(displayName, file, options.suffix),
    size: options.sizes?.get(file.name) ?? null,
  }));
}
