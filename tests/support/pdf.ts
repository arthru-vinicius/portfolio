import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

/** O que os testes conferem num PDF: páginas, texto, metadados e marcação. */
export type PdfSummary = {
  pages: number;
  /** O texto extraído, uma linha por linha do PDF, como um ATS o leria. */
  text: string;
  /** O mesmo texto, separado por página. */
  pageTexts: string[];
  info: Record<string, unknown>;
  /** Se o PDF é marcado (tagged). */
  marked: boolean;
};

/**
 * Lê um PDF como um sistema de triagem leria: extrai o texto de todas as
 * páginas, na ordem.
 *
 * @param data - O arquivo.
 * @returns O resumo do arquivo.
 */
export async function readPdf(data: Uint8Array): Promise<PdfSummary> {
  // O pdfjs fica com o buffer que recebe; a cópia deixa o original intacto.
  const task = getDocument({ data: new Uint8Array(data) });
  const pdf = await task.promise;
  try {
    const pageTexts: string[] = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const content = await (await pdf.getPage(number)).getTextContent();
      let page = "";
      for (const item of content.items) {
        if ("str" in item) {
          page += item.str + (item.hasEOL ? "\n" : "");
        }
      }
      pageTexts.push(page);
    }
    const text = pageTexts.map((page) => `${page}\n`).join("");
    const { info } = await pdf.getMetadata();
    // O tipo diz objeto, mas esta versão do pdfjs devolve um `Map`.
    const markInfo: unknown = await pdf.getMarkInfo();
    const marked =
      markInfo instanceof Map
        ? markInfo.get("Marked") === true
        : (markInfo as { Marked?: boolean } | null)?.Marked === true;
    return {
      pages: pdf.numPages,
      text,
      pageTexts,
      info: info as Record<string, unknown>,
      marked,
    };
  } finally {
    await task.destroy();
  }
}
