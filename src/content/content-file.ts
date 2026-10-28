import "server-only";

import { Document, parseDocument } from "yaml";

import type { PortfolioDocument } from "./schema";

// O arquivo de conteúdo é YAML 1.2, só com o schema padrão (`core`): sem tags
// próprias, sem chaves de merge e sem alias. JSON é YAML válido, então as
// cópias antigas, em JSON, continuam entrando.

/** O texto não pôde ser lido como arquivo de conteúdo. */
export class ContentFileSyntaxError extends Error {
  /** A linha do primeiro problema, quando o leitor a conhece. */
  readonly line: number | undefined;

  /**
   * @param message - O problema, nas palavras do leitor de YAML.
   * @param line - A linha do problema, contada a partir de 1.
   */
  constructor(message: string, line?: number) {
    super(message);
    this.name = "ContentFileSyntaxError";
    this.line = line;
  }
}

/**
 * Hoje, todo objeto dentro de uma lista do documento tem `id`: links, blocos,
 * itens, grupos de habilidades e destaques. Quem escreve o arquivo à mão pode
 * deixar o campo de fora, e o objeto ganha um id novo.
 */
function withMissingIds(value: unknown, insideList = false): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => withMissingIds(item, true));
  }
  if (typeof value !== "object" || value === null) {
    return value;
  }
  // `Object.fromEntries` cria propriedades próprias: uma chave `__proto__`
  // vinda do arquivo não chega ao protótipo.
  const copy: Record<string, unknown> = Object.fromEntries(
    Object.entries(value).map(([key, child]) => [key, withMissingIds(child)]),
  );
  if (insideList && (copy.id === undefined || copy.id === null)) {
    copy.id = crypto.randomUUID();
  }
  return copy;
}

/**
 * Lê o texto de um arquivo de conteúdo, em YAML ou JSON, e dá um id a cada
 * item escrito sem ele.
 *
 * @param text - O texto do arquivo.
 * @returns O documento interpretado, ainda sem validar: quem chama o passa
 *   por `migrateDocument`.
 * @throws {ContentFileSyntaxError} Se o texto não for YAML válido, tiver mais
 *   de um documento, tag desconhecida ou alias.
 */
export function parseContentFile(text: string): unknown {
  const file = parseDocument(text, {
    version: "1.2",
    schema: "core",
    merge: false,
  });
  // Tag desconhecida é só um aviso para o leitor; aqui ela recusa o arquivo.
  const [problem] = [...file.errors, ...file.warnings];
  if (problem !== undefined) {
    throw new ContentFileSyntaxError(
      problem.message,
      problem.linePos?.[0].line,
    );
  }

  let data: unknown;
  try {
    // Sem alias: nenhum conteúdo precisa deles, e assim não há como um
    // arquivo pequeno se expandir num documento enorme.
    data = file.toJS({ maxAliasCount: 0 });
  } catch (error) {
    throw new ContentFileSyntaxError(
      error instanceof Error ? error.message : String(error),
    );
  }
  return withMissingIds(data);
}

/**
 * Escreve o documento como arquivo de conteúdo em YAML. Os textos de várias
 * linhas saem em bloco literal (`|`), que guarda as quebras do Markdown, e as
 * linhas longas não são quebradas.
 *
 * @param document - O documento, com os campos privados.
 * @param header - Linhas do comentário do topo do arquivo.
 * @returns O texto do arquivo, terminado em quebra de linha.
 */
export function serializeContentFile(
  document: PortfolioDocument,
  header: readonly string[] = [],
): string {
  const file = new Document(document);
  if (header.length > 0) {
    file.commentBefore = header.map((line) => ` ${line}`).join("\n");
  }
  return file.toString({ lineWidth: 0, blockQuote: "literal" });
}
