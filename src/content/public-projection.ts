import type { z } from "zod";

import {
  basePortfolioDocumentSchema,
  profileSchema,
  type PortfolioDocument,
} from "./schema";

/** Schema do documento como o público o vê: igual ao completo, sem `profile.private`. */
export const publicDocumentSchema = basePortfolioDocumentSchema.extend({
  profile: profileSchema.omit({ private: true }),
});

/**
 * Documento sem nenhum campo privado. É o que as páginas, o currículo público,
 * o JSON-LD e qualquer endpoint recebem.
 */
export type PublicDocument = z.infer<typeof publicDocumentSchema>;

/**
 * Remove os campos privados de um documento. Tudo o que é público passa por
 * aqui.
 *
 * O corte é feito pelo schema público: um campo que não está nele não sai,
 * mesmo que alguém o acrescente depois ao documento completo.
 *
 * @param document - Documento completo e válido.
 * @returns Uma cópia sem os campos privados.
 */
export function toPublicDocument(document: PortfolioDocument): PublicDocument {
  return publicDocumentSchema.parse(document);
}
