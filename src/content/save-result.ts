import type { z } from "zod";

/**
 * Um problema de validação, com o caminho do campo (por exemplo,
 * `items.2.start`) relativo ao que estava sendo salvo.
 */
export type FieldIssue = { path: string; message: string };

/**
 * Resposta das Server Actions que gravam o rascunho.
 *
 * - `ok`: `saved` é o que ficou gravado (normalizado pelo schema), e `version`
 *   é a versão nova da parte editada, para o próximo salvamento.
 * - `conflict`: a parte editada mudou desde que a página abriu (outra aba, por
 *   exemplo), e salvar por cima perderia a outra alteração.
 * - `invalid`: o conteúdo não segue o schema; `issues` diz onde.
 * - `newer-version`: o rascunho foi gravado por uma versão mais nova do
 *   painel, que esta não sabe ler.
 */
export type SaveResult<T> =
  | { ok: true; version: string; savedAt: string; saved: T }
  | { ok: false; reason: "conflict" | "newer-version" }
  | { ok: false; reason: "invalid"; issues: FieldIssue[] };

/**
 * Resposta da importação do arquivo de conteúdo. Além das recusas do
 * salvamento, o arquivo pode nem ser YAML válido (`unreadable`); `line` é a
 * linha do primeiro problema, quando se sabe.
 */
export type ImportResult =
  SaveResult<null> | { ok: false; reason: "unreadable"; line?: number };

/**
 * Converte os problemas de um `ZodError` em caminhos de campo.
 *
 * @param error - O erro da validação.
 * @param prefix - Parte do caminho a tirar do começo, quando o schema validou
 *   um objeto maior que o editado (por exemplo, `["profile"]`). Problemas fora
 *   do prefixo ficam com o caminho inteiro.
 * @returns Um problema por item do erro, na ordem do zod.
 */
export function toFieldIssues(
  error: z.ZodError,
  prefix: readonly PropertyKey[] = [],
): FieldIssue[] {
  return error.issues.map((issue) => {
    const insidePrefix = prefix.every(
      (segment, index) => issue.path[index] === segment,
    );
    const path = insidePrefix ? issue.path.slice(prefix.length) : issue.path;
    return { path: path.map(String).join("."), message: issue.message };
  });
}
