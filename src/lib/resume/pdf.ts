import "server-only";

import { readFileSync } from "node:fs";
import path from "node:path";

import PDFDocument from "pdfkit";

import { fitToFont } from "./glyphs";
import {
  layoutResume,
  type ResumeLayout,
  type ResumeLine,
  type ResumeLinkRun,
} from "./layout";
import type { ResumeModel } from "./model";

type Fonts = { regular: Buffer; bold: Buffer };

let fonts: Fonts | null = null;

/**
 * Lê a Inter (licença OFL), em WOFF, do pacote do Fontsource.
 *
 * Cada caminho fica escrito por inteiro dentro do `readFileSync`: assim o
 * build do Next sabe exatamente quais arquivos levar para a imagem. Com o
 * caminho numa variável, ele não sabe e leva o projeto inteiro.
 */
function loadFonts(): Fonts {
  fonts ??= {
    regular: readFileSync(
      path.join(
        process.cwd(),
        "node_modules/@fontsource/inter/files/inter-latin-400-normal.woff",
      ),
    ),
    bold: readFileSync(
      path.join(
        process.cwd(),
        "node_modules/@fontsource/inter/files/inter-latin-700-normal.woff",
      ),
    ),
  };
  return fonts;
}

const REGULAR = "regular";
const BOLD = "bold";

const COLORS = {
  text: "#111827",
  muted: "#4b5563",
  accent: "#0b6b43",
  rule: "#c9d1cc",
};

/** Tamanhos em pontos. O corpo fica em 10 pt, dentro do que o ATS lê bem. */
const SIZES = {
  name: 20,
  headline: 12,
  heading: 11.5,
  body: 10,
  meta: 9.5,
};

const MARGINS = { top: 46, bottom: 46, left: 52, right: 52 };

/** Espaço para um título de seção e a primeira linha dela não ficarem separados. */
const KEEP_WITH_HEADING = 64;

/** Espaço para o cabeçalho de um item e a primeira linha dele. */
const KEEP_ITEM_HEADER = 44;

const BULLET_INDENT = 11;

type Struct = PDFKit.PDFStructureElement;

/**
 * Desenha o currículo numa coluna, de cima para baixo, com uma estrutura de
 * PDF marcado (títulos, parágrafos e listas) na ordem de leitura.
 *
 * Cada trecho de texto termina com espaço: sem ele, a extração junta a última
 * palavra de uma linha com a primeira da seguinte.
 */
class ResumeWriter {
  private readonly doc: PDFKit.PDFDocument;
  private readonly layout: ResumeLayout;

  constructor(doc: PDFKit.PDFDocument, layout: ResumeLayout) {
    this.doc = doc;
    this.layout = layout;
  }

  private get left(): number {
    return this.doc.page.margins.left;
  }

  private get width(): number {
    const { margins } = this.doc.page;
    return this.doc.page.width - margins.left - margins.right;
  }

  /** Começa outra página se o que vem não cabe nesta. */
  private ensureSpace(height: number): void {
    const bottom = this.doc.page.height - this.doc.page.margins.bottom;
    if (this.doc.y + height > bottom) {
      this.doc.addPage();
    }
  }

  private style(font: string, size: number, color: string): void {
    this.doc.font(font).fontSize(size).fillColor(color);
  }

  /** Um parágrafo de uma cor e um tamanho, numa estrutura. */
  private paragraph(
    parent: Struct,
    text: string,
    options: {
      font?: string;
      size?: number;
      color?: string;
      gap?: number;
    } = {},
  ): void {
    const value = fitToFont(text).trim();
    if (value === "") {
      return;
    }
    parent.add(
      this.doc.struct("P", {}, () => {
        this.style(
          options.font ?? REGULAR,
          options.size ?? SIZES.body,
          options.color ?? COLORS.text,
        );
        this.doc.text(`${value} `, this.left, this.doc.y, {
          width: this.width,
          lineGap: 1.5,
        });
      }),
    );
    this.doc.moveDown(options.gap ?? 0.15);
  }

  /** Um parágrafo com um começo em negrito, como `Backend: PHP, Node.js`. */
  private labeledParagraph(
    parent: Struct,
    lead: string,
    rest: string,
    size = SIZES.body,
  ): void {
    const leadText = fitToFont(lead).trim();
    const restText = fitToFont(rest).trim();
    parent.add(
      this.doc.struct("P", {}, () => {
        this.style(BOLD, size, COLORS.text);
        this.doc.text(`${leadText} `, this.left, this.doc.y, {
          width: this.width,
          lineGap: 1.5,
          continued: restText !== "",
        });
        if (restText !== "") {
          this.style(REGULAR, size, COLORS.text);
          this.doc.text(`${restText} `);
        }
      }),
    );
    this.doc.moveDown(0.15);
  }

  /** Uma lista com marcador, item por item. */
  private bulletList(parent: Struct, items: readonly string[]): void {
    const values = items
      .map((item) => fitToFont(item).replace(/^•\s*/, "").trim())
      .filter((item) => item !== "");
    if (values.length === 0) {
      return;
    }
    const list = this.doc.struct("L");
    parent.add(list);
    for (const value of values) {
      this.style(REGULAR, SIZES.body, COLORS.text);
      this.ensureSpace(this.doc.currentLineHeight(true) + 2);
      const top = this.doc.y;
      const item = this.doc.struct("LI");
      list.add(item);
      item.add(
        this.doc.struct("Lbl", {}, () => {
          this.style(REGULAR, SIZES.body, COLORS.accent);
          this.doc.text("• ", this.left, top, { lineBreak: false });
        }),
      );
      item.add(
        this.doc.struct("LBody", {}, () => {
          this.style(REGULAR, SIZES.body, COLORS.text);
          this.doc.text(`${value} `, this.left + BULLET_INDENT, top, {
            width: this.width - BULLET_INDENT,
            lineGap: 1.5,
          });
        }),
      );
      item.end();
      this.doc.moveDown(0.1);
    }
    list.end();
  }

  /** Uma linha de links visíveis, como `Código: github.com/ana/app`. */
  private linkLine(parent: Struct, links: readonly ResumeLinkRun[]): void {
    const segments = links.flatMap((link, index) => [
      ...(link.label === null
        ? []
        : [{ text: `${link.label}: `, url: null, color: COLORS.muted }]),
      { text: link.display, url: link.url, color: COLORS.accent },
      {
        text: index === links.length - 1 ? " " : " · ",
        url: null,
        color: COLORS.muted,
      },
    ]);
    if (segments.length === 0) {
      return;
    }
    parent.add(
      this.doc.struct("P", {}, () => {
        this.style(REGULAR, SIZES.meta, COLORS.muted);
        segments.forEach((segment, index) => {
          const text = fitToFont(segment.text);
          const options = {
            width: this.width,
            lineGap: 1.5,
            link: segment.url,
            continued: index < segments.length - 1,
          };
          this.doc.fillColor(segment.color);
          if (index === 0) {
            this.doc.text(text, this.left, this.doc.y, options);
          } else {
            this.doc.text(text, options);
          }
        });
      }),
    );
    this.doc.moveDown(0.15);
  }

  private section(title: string, draw: (section: Struct) => void): void {
    this.doc.moveDown(0.7);
    this.ensureSpace(KEEP_WITH_HEADING);
    const section = this.doc.struct("Sect");
    this.doc.addStructure(section);
    section.add(
      this.doc.struct("H2", {}, () => {
        this.style(BOLD, SIZES.heading, COLORS.accent);
        this.doc.text(`${fitToFont(title)} `, this.left, this.doc.y, {
          width: this.width,
        });
      }),
    );
    // A linha embaixo do título é decoração: fica fora da leitura.
    const ruleY = this.doc.y + 1.5;
    this.doc.markContent("Artifact", { type: "Layout" });
    this.doc
      .moveTo(this.left, ruleY)
      .lineTo(this.left + this.width, ruleY)
      .lineWidth(0.6)
      .strokeColor(COLORS.rule)
      .stroke();
    this.doc.endMarkedContent();
    this.doc.y = ruleY + 6;
    draw(section);
    section.end();
  }

  private identity(): void {
    const { layout } = this;
    const header = this.doc.struct("Sect");
    this.doc.addStructure(header);
    header.add(
      this.doc.struct("H1", {}, () => {
        this.style(BOLD, SIZES.name, COLORS.text);
        this.doc.text(`${fitToFont(layout.name)} `, this.left, this.doc.y, {
          width: this.width,
        });
      }),
    );
    this.doc.moveDown(0.1);
    this.paragraph(header, layout.headline, {
      size: SIZES.headline,
      color: COLORS.accent,
      gap: 0.3,
    });
    this.paragraph(header, layout.contact, {
      size: SIZES.meta,
      color: COLORS.muted,
      gap: 0.1,
    });
    this.linkLine(header, layout.links);
    header.end();
  }

  private line(section: Struct, line: ResumeLine, first: boolean): void {
    switch (line.kind) {
      case "item":
        if (!first) {
          this.doc.moveDown(0.4);
        }
        this.ensureSpace(KEEP_ITEM_HEADER);
        this.labeledParagraph(section, line.lead, line.rest);
        return;
      case "pair":
        this.labeledParagraph(section, line.lead, line.rest);
        return;
      case "meta":
        this.paragraph(section, line.text, {
          size: SIZES.meta,
          color: COLORS.muted,
        });
        return;
      case "text":
        this.paragraph(section, line.text);
        return;
      case "bullets":
        this.bulletList(section, line.items);
        return;
      case "links":
        this.linkLine(section, line.links);
        return;
    }
  }

  write(): void {
    this.identity();
    for (const { title, lines } of this.layout.sections) {
      this.section(title, (section) => {
        lines.forEach((line, index) => this.line(section, line, index === 0));
      });
    }
  }
}

/**
 * Gera o PDF do currículo, no formato que recrutadores e sistemas de triagem
 * leem bem:
 *
 * - A4, uma coluna, sem tabela, sem imagem e nada em cabeçalho ou rodapé;
 * - texto real, com a Inter embutida (só os caracteres usados), e os acentos
 *   certos ao copiar o texto;
 * - os endereços escritos por extenso, além do link;
 * - PDF marcado (títulos, parágrafos e listas), com o idioma e os metadados
 *   (título, autor, assunto e palavras-chave).
 *
 * @param model - O currículo, de `buildResumeModel`.
 * @returns O arquivo PDF.
 */
export async function renderResumePdf(model: ResumeModel): Promise<Buffer> {
  const { regular, bold } = loadFonts();
  const layout = layoutResume(model);
  const doc = new PDFDocument({
    size: "A4",
    margins: MARGINS,
    // O pdfkit aceita o arquivo da fonte padrão, e assim não carrega a
    // Helvetica; o @types/pdfkit só tipa o nome de uma fonte embutida.
    font: regular as unknown as string,
    pdfVersion: "1.7",
    tagged: true,
    lang: layout.lang,
    displayTitle: true,
    info: {
      Title: layout.title,
      Author: layout.author,
      Subject: layout.subject,
      Keywords: layout.keywords.join(", "),
    },
  });
  doc.registerFont(REGULAR, regular);
  doc.registerFont(BOLD, bold);

  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  new ResumeWriter(doc, layout).write();
  doc.end();
  return finished;
}
