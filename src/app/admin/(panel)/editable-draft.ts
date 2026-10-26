import "server-only";

import { NewerDocumentVersionError } from "@/content/migrations";
import { getDatabase } from "@/lib/db/database";
import { readEditableDraft, type EditableDraft } from "@/lib/db/draft";

/**
 * Lê o documento que as telas de edição abrem.
 *
 * @returns O documento editável, ou `null` se o rascunho foi gravado por uma
 *   versão mais nova do painel (depois de um rollback do deploy). Nesse caso a
 *   tela não abre o editor, e o rascunho fica intacto no banco.
 */
export function loadEditableDraft(): EditableDraft | null {
  try {
    return readEditableDraft(getDatabase());
  } catch (error) {
    if (error instanceof NewerDocumentVersionError) {
      return null;
    }
    throw error;
  }
}
