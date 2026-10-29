import "server-only";

import ExcelJS from "exceljs";

import { getDictionary } from "@/i18n/dictionaries";
import { fillTemplate } from "@/i18n/template";

import type { ResumeModel } from "./model";

type Cell = string | Date | null;

type Column = { header: string; width: number; date?: boolean };

/** Caracteres de controle que o XML da planilha não aceita (fica a quebra de linha). */
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

function clean(value: Cell): Cell {
  if (typeof value !== "string") {
    return value;
  }
  const text = value.replace(CONTROL_CHARACTERS, "").trim();
  return text === "" ? null : text;
}

/**
 * Um mês do conteúdo como data de verdade, no primeiro dia e em UTC: a
 * planilha guarda o número do dia, sem fuso, e mostra `mm/aaaa`.
 */
function monthDate(yearMonth: string | null): Date | null {
  if (yearMonth === null) {
    return null;
  }
  const [year = 0, month = 1] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

/** Uma lista numa célula só, um item por linha. */
const lines = (items: readonly string[]) => items.join("\n");

function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: readonly Column[],
  rows: readonly (readonly Cell[])[],
): void {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = columns.map((column) => ({
    header: column.header,
    width: column.width,
    style: column.date === true ? { numFmt: "mm/yyyy" } : {},
  }));
  for (const row of rows) {
    sheet.addRow(row.map(clean));
  }
  sheet.getRow(1).font = { bold: true };
  sheet.eachRow((row) => {
    row.alignment = { wrapText: true, vertical: "top" };
  });
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: rows.length + 1, column: columns.length },
  };
}

/**
 * Gera a planilha do currículo, no formato que um sistema de triagem ou um
 * agente de IA lê sem adivinhar:
 *
 * - uma aba por seção; a aba Perfil em `Campo | Valor`, as outras com o
 *   cabeçalho na linha 1 e uma linha por registro;
 * - sem célula mesclada, linha em branco ou fórmula; cabeçalho congelado e
 *   filtro ligado;
 * - datas de verdade, mostradas como `mm/aaaa`; no emprego atual, o fim fica
 *   vazio e a coluna "Atual" diz Sim;
 * - listas (destaques, tecnologias) numa célula, um item por linha;
 * - título, autor, assunto, palavras-chave e idioma nas propriedades.
 *
 * @param model - O currículo, de `buildResumeModel`.
 * @returns O arquivo XLSX.
 */
export async function renderResumeXlsx(model: ResumeModel): Promise<Buffer> {
  const labels = getDictionary(model.locale).resume;
  const { columns: c, sheets, profileFields: fields } = labels;
  const yesNo = (value: boolean) => (value ? labels.yes : labels.no);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = model.fullName;
  workbook.lastModifiedBy = model.fullName;
  workbook.title = fillTemplate(labels.documentTitle, {
    name: model.fullName,
  });
  workbook.subject = model.headline;
  workbook.keywords = model.skills.flatMap((group) => group.skills).join(", ");
  // O exceljs grava o idioma (`dc:language`), mas o tipo dele não tem o campo.
  (workbook as ExcelJS.Workbook & { language: string }).language = model.locale;
  workbook.created = new Date();
  workbook.modified = workbook.created;

  addSheet(
    workbook,
    sheets.profile,
    [
      { header: c.field, width: 22 },
      { header: c.value, width: 100 },
    ],
    [
      [fields.fullName, model.fullName],
      [fields.headline, model.headline],
      [fields.location, model.location],
      ...(model.email === null ? [] : [[fields.email, model.email]]),
      ...(model.phone === null ? [] : [[fields.phone, model.phone]]),
      ...model.links.map((link) => [link.label, link.url]),
      ...(model.summary.length === 0
        ? []
        : [[fields.summary, lines(model.summary)]]),
    ],
  );

  addSheet(
    workbook,
    sheets.experience,
    [
      { header: c.role, width: 32 },
      { header: c.company, width: 22 },
      { header: c.location, width: 20 },
      { header: c.workMode, width: 14 },
      { header: c.start, width: 10, date: true },
      { header: c.end, width: 10, date: true },
      { header: c.current, width: 9 },
      { header: c.highlights, width: 80 },
      { header: c.technologies, width: 24 },
    ],
    model.experience.map((item) => [
      item.role,
      item.company,
      item.location,
      item.workMode,
      monthDate(item.start),
      monthDate(item.end),
      yesNo(item.end === null),
      lines(item.highlights),
      lines(item.technologies),
    ]),
  );

  addSheet(
    workbook,
    sheets.skills,
    [
      { header: c.group, width: 28 },
      { header: c.skills, width: 40 },
    ],
    model.skills.map((group) => [group.name, lines(group.skills)]),
  );

  addSheet(
    workbook,
    sheets.projects,
    [
      { header: c.name, width: 22 },
      { header: c.summary, width: 70 },
      { header: c.technologies, width: 24 },
      { header: c.repository, width: 40 },
      { header: c.website, width: 40 },
    ],
    model.projects.map((project) => [
      project.name,
      project.summary,
      lines(project.technologies),
      project.repositoryUrl,
      project.websiteUrl,
    ]),
  );

  addSheet(
    workbook,
    sheets.education,
    [
      { header: c.degree, width: 40 },
      { header: c.institution, width: 36 },
      { header: c.location, width: 20 },
      { header: c.start, width: 10, date: true },
      { header: c.end, width: 10, date: true },
      { header: c.inProgress, width: 13 },
      { header: c.expectedEnd, width: 18, date: true },
      { header: c.notes, width: 50 },
    ],
    model.education.map((item) => [
      item.degree,
      item.institution,
      item.location,
      monthDate(item.start),
      monthDate(item.end),
      yesNo(item.end === null),
      monthDate(item.expectedEnd),
      lines(item.notes),
    ]),
  );

  addSheet(
    workbook,
    sheets.awards,
    [
      { header: c.award, width: 40 },
      { header: c.issuer, width: 28 },
      { header: c.date, width: 10, date: true },
      { header: c.description, width: 70 },
    ],
    model.awards.map((award) => [
      award.title,
      award.issuer,
      monthDate(award.date),
      lines(award.description),
    ]),
  );

  addSheet(
    workbook,
    sheets.languages,
    [
      { header: c.language, width: 18 },
      { header: c.level, width: 60 },
    ],
    model.languages.map((language) => [language.name, language.level]),
  );

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
