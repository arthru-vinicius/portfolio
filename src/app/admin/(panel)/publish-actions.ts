"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { NewerDocumentVersionError } from "@/content/migrations";
import { findPublishProblems } from "@/content/publish-check";
import { expirePublishedContent } from "@/content/read-published";
import { toFieldIssues, type PublishResult } from "@/content/save-result";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getDatabase } from "@/lib/db/database";
import { readEditableDraft } from "@/lib/db/draft";
import { insertRevision, readLatestRevision } from "@/lib/db/revisions";

import { draftParts, versionOf } from "./draft-parts";

const publishInput = z.object({
  version: z.string().max(100),
  note: z.string().trim().max(200, "use até 200 caracteres"),
});

/**
 * Publica o rascunho: confere se ele pode ir ao ar, grava uma revisão nova e
 * expira o cache do site, que mostra a revisão já na próxima visita, sem
 * deploy.
 *
 * Publica exatamente o que a página mostrava: se o rascunho mudou desde que
 * ela abriu (outra aba, por exemplo), recusa.
 *
 * @param input - A versão do documento que a página abriu e uma nota opcional,
 *   que aparece no histórico.
 * @returns A revisão nova, ou o motivo da recusa.
 */
export async function publishDraft(input: {
  version: string;
  note: string;
}): Promise<PublishResult> {
  await requireAdmin();
  const parsed = publishInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "incomplete",
      problems: toFieldIssues(parsed.error),
    };
  }
  const { version, note } = parsed.data;

  try {
    const db = getDatabase();
    const { document } = readEditableDraft(db);
    if (versionOf(draftParts.document(document)) !== version) {
      return { ok: false, reason: "conflict" };
    }
    const latest = readLatestRevision(db);
    if (latest !== null && versionOf(latest.document) === version) {
      return { ok: false, reason: "unchanged" };
    }
    const problems = findPublishProblems(document);
    if (problems.length > 0) {
      return { ok: false, reason: "incomplete", problems };
    }

    // Da leitura do rascunho até a gravação não há pausa: o `node:sqlite` é
    // síncrono, e nenhuma outra gravação entra no meio.
    const revision = insertRevision(db, document, note === "" ? null : note);
    expirePublishedContent();
    revalidatePath("/admin", "layout");
    console.info(`[admin] revisão ${revision.id} publicada`);
    return {
      ok: true,
      revisionId: revision.id,
      publishedAt: revision.publishedAt,
    };
  } catch (error) {
    if (error instanceof NewerDocumentVersionError) {
      return { ok: false, reason: "newer-version" };
    }
    throw error;
  }
}
