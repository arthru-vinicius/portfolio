import "server-only";

import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
  convertMillimetersToTwip,
} from "docx";

import { layoutResume, type ResumeLine, type ResumeLinkRun } from "./layout";
import type { ResumeModel } from "./model";

/** Calibri, a fonte padrão do Word, que o LibreOffice troca pela Carlito, de mesmas medidas. */
const FONT = "Calibri";

const COLORS = {
  text: "111827",
  muted: "4B5563",
  accent: "0B6B43",
  rule: "C9D1CC",
};

/** Tamanhos em meios-pontos, a unidade do Word: 21 é 10,5 pt. */
const SIZES = {
  name: 40,
  headline: 24,
  heading: 24,
  body: 21,
  meta: 19,
};

/** Espaços em vinte avos de ponto (twips): 120 é 6 pt. */
const SPACE = {
  line: 40,
  item: 120,
};

/** A lista com marcador do currículo, com o recuo do PDF (o padrão do Word é maior). */
const BULLETS = "resume-bullets";

const meta = (text: string) =>
  new Paragraph({
    spacing: { after: SPACE.line },
    children: [new TextRun({ text, size: SIZES.meta, color: COLORS.muted })],
  });

/** Bold no começo, texto normal depois, como `Backend: PHP, Node.js`. */
function leadParagraph(
  lead: string,
  rest: string,
  spaceBefore: number,
): Paragraph {
  return new Paragraph({
    keepNext: true,
    spacing: { before: spaceBefore, after: SPACE.line },
    children: [
      new TextRun({ text: lead, bold: true }),
      ...(rest === "" ? [] : [new TextRun({ text: ` ${rest}` })]),
    ],
  });
}

function linksParagraph(links: readonly ResumeLinkRun[]): Paragraph {
  return new Paragraph({
    spacing: { after: SPACE.line },
    children: links.flatMap((link, index) => [
      ...(index === 0
        ? []
        : [
            new TextRun({ text: " · ", size: SIZES.meta, color: COLORS.muted }),
          ]),
      ...(link.label === null
        ? []
        : [
            new TextRun({
              text: `${link.label}: `,
              size: SIZES.meta,
              color: COLORS.muted,
            }),
          ]),
      new ExternalHyperlink({
        link: link.url,
        children: [
          new TextRun({
            text: link.display,
            size: SIZES.meta,
            color: COLORS.accent,
          }),
        ],
      }),
    ]),
  });
}

function lineParagraphs(line: ResumeLine, first: boolean): Paragraph[] {
  switch (line.kind) {
    case "item":
      return [leadParagraph(line.lead, line.rest, first ? 0 : SPACE.item)];
    case "pair":
      return [leadParagraph(line.lead, line.rest, 0)];
    case "meta":
      return [meta(line.text)];
    case "text":
      return [
        new Paragraph({
          spacing: { after: SPACE.line },
          children: [new TextRun(line.text)],
        }),
      ];
    case "bullets":
      return line.items
        .map((item) => item.replace(/^•\s*/, "").trim())
        .filter((item) => item !== "")
        .map(
          (item) =>
            new Paragraph({
              numbering: { reference: BULLETS, level: 0 },
              spacing: { after: SPACE.line },
              children: [new TextRun(item)],
            }),
        );
    case "links":
      return [linksParagraph(line.links)];
  }
}

/**
 * Gera o currículo em DOCX, para quem precisa de um arquivo editável ou de um
 * formato que a plataforma da vaga aceite:
 *
 * - uma coluna, sem tabela, caixa de texto, imagem ou nada em cabeçalho e
 *   rodapé de página;
 * - os estilos do próprio Word: o nome em Título 1, as seções em Título 2 e
 *   listas com marcador de verdade, que o ATS e o leitor de tela reconhecem;
 * - os endereços escritos por extenso, além do link;
 * - o idioma do texto e as propriedades (título, autor, assunto e
 *   palavras-chave).
 *
 * O texto e a ordem são os mesmos do PDF (`layoutResume`).
 *
 * @param model - O currículo, de `buildResumeModel`.
 * @returns O arquivo DOCX.
 */
export async function renderResumeDocx(model: ResumeModel): Promise<Buffer> {
  const layout = layoutResume(model);
  const margin = convertMillimetersToTwip(18);

  const document = new Document({
    title: layout.title,
    creator: layout.author,
    lastModifiedBy: layout.author,
    subject: layout.subject,
    keywords: layout.keywords.join(", "),
    numbering: {
      config: [
        {
          reference: BULLETS,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: {
                run: { color: COLORS.accent },
                paragraph: { indent: { left: 300, hanging: 220 } },
              },
            },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: SIZES.body,
            color: COLORS.text,
            language: { value: layout.lang },
          },
        },
        heading1: {
          run: { font: FONT, size: SIZES.name, bold: true, color: COLORS.text },
          paragraph: { spacing: { after: SPACE.line } },
        },
        heading2: {
          run: {
            font: FONT,
            size: SIZES.heading,
            bold: true,
            color: COLORS.accent,
          },
          paragraph: {
            keepNext: true,
            spacing: { before: 280, after: SPACE.item },
            border: {
              bottom: {
                style: BorderStyle.SINGLE,
                size: 4,
                space: 2,
                color: COLORS.rule,
              },
            },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            // A4, em vinte avos de ponto.
            size: { width: 11906, height: 16838 },
            margin: {
              top: margin,
              bottom: margin,
              left: margin,
              right: margin,
            },
          },
        },
        children: [
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun(layout.name)],
          }),
          new Paragraph({
            spacing: { after: SPACE.item },
            children: [
              new TextRun({
                text: layout.headline,
                size: SIZES.headline,
                color: COLORS.accent,
              }),
            ],
          }),
          ...(layout.contact === "" ? [] : [meta(layout.contact)]),
          ...(layout.links.length === 0 ? [] : [linksParagraph(layout.links)]),
          ...layout.sections.flatMap((section) => [
            new Paragraph({
              heading: HeadingLevel.HEADING_2,
              children: [new TextRun(section.title)],
            }),
            ...section.lines.flatMap((line, index) =>
              lineParagraphs(line, index === 0),
            ),
          ]),
        ],
      },
    ],
  });

  return Packer.toBuffer(document);
}
