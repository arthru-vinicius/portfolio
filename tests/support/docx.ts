import JSZip from "jszip";

/** Um parágrafo do DOCX: o estilo (como `Heading2`), se é item de lista e o texto. */
export type DocxParagraph = {
  style: string | null;
  bullet: boolean;
  text: string;
};

/** O que os testes conferem num DOCX. */
export type DocxSummary = {
  paragraphs: DocxParagraph[];
  /** O texto todo, um parágrafo por linha, como um ATS o leria. */
  text: string;
  /** Os destinos dos hyperlinks. */
  links: string[];
  /** As propriedades do documento (`docProps/core.xml`). */
  core: string;
  /** Os estilos (`word/styles.xml`), onde fica o idioma. */
  styles: string;
};

const ENTITIES: Readonly<Record<string, string>> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&apos;": "'",
};

const decode = (text: string) =>
  text.replace(/&(amp|lt|gt|quot|apos);/g, (entity) => ENTITIES[entity] ?? "");

/**
 * Abre um DOCX e lê os parágrafos, na ordem, como um sistema de triagem leria.
 *
 * @param data - O arquivo.
 * @returns O resumo do arquivo.
 */
export async function readDocx(data: Uint8Array): Promise<DocxSummary> {
  const zip = await JSZip.loadAsync(data);
  const read = async (name: string) => {
    const file = zip.file(name);
    if (file === null) {
      throw new Error(`o DOCX não tem ${name}`);
    }
    return file.async("string");
  };
  const document = await read("word/document.xml");
  const relations = await read("word/_rels/document.xml.rels");

  const paragraphs = [...document.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)].map(
    ([paragraph]) => ({
      style: /<w:pStyle w:val="([^"]+)"/.exec(paragraph)?.[1] ?? null,
      bullet: paragraph.includes("<w:numPr>"),
      text: decode(
        [...paragraph.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)]
          .map(([, text]) => text)
          .join(""),
      ),
    }),
  );
  const links = [
    ...relations.matchAll(/Target="([^"]+)" TargetMode="External"/g),
  ].map(([, target]) => decode(target ?? ""));

  return {
    paragraphs,
    text: paragraphs.map((paragraph) => paragraph.text).join("\n"),
    links,
    core: await read("docProps/core.xml"),
    styles: await read("word/styles.xml"),
  };
}
