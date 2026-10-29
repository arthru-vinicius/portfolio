import { slugify } from "@/content/site-view";
import { locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

/** Os formatos do currículo. */
export const resumeFormats = ["pdf", "docx"] as const;

/** Um formato do currículo. */
export type ResumeFormat = (typeof resumeFormats)[number];

/** Tipo de cada formato, para o `Content-Type` e o atributo `type` do link. */
export const resumeContentTypes: Readonly<Record<ResumeFormat, string>> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

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

/** Os quatro arquivos: dois idiomas em dois formatos. */
export const resumeFiles: readonly ResumeFile[] = locales.flatMap((locale) =>
  resumeFormats.map((format) => ({
    locale,
    format,
    name: `${resumeFileStems[locale]}.${format}`,
  })),
);

/**
 * Lê o nome de um arquivo do currículo. Serve também de filtro: só os quatro
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

/** Um arquivo do currículo como o site o oferece. */
export type ResumeDownload = ResumeFile & {
  href: string;
  /** O nome sugerido ao salvar, para o atributo `download`. */
  fileName: string;
  /** Tamanho em bytes, quando já se sabe. */
  size: number | null;
};

/**
 * Os links dos quatro arquivos do currículo.
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
  return resumeFiles.map((file) => ({
    ...file,
    href: `${options.basePath}/${file.name}${query}`,
    fileName: downloadFileName(displayName, file, options.suffix),
    size: options.sizes?.get(file.name) ?? null,
  }));
}
