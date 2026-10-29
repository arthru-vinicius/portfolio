"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { NewerDocumentVersionError } from "@/content/migrations";
import { toPublicDocument } from "@/content/public-projection";
import { findPublishProblems } from "@/content/publish-check";
import { expirePublishedContent } from "@/content/read-published";
import { toFieldIssues, type PublishResult } from "@/content/save-result";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getDatabase } from "@/lib/db/database";
import { readEditableDraft } from "@/lib/db/draft";
import { insertRevision, readLatestRevision } from "@/lib/db/revisions";
import { getServerEnv } from "@/lib/env";
import { renderPublicResumeFiles } from "@/lib/resume/render";
import { resumeDirectoryFor, saveResumeFiles } from "@/lib/resume/storage";

import { draftParts, versionOf } from "./draft-parts";

const publishInput = z.object({
  version: z.string().max(100),
  note: z.string().trim().max(200, "use até 200 caracteres"),
});

/**
 * Grava os arquivos do currículo da revisão nova em `/data/cv`. Uma falha aqui
 * não desfaz a publicação: a revisão já está gravada, e a rota `/cv` gera os
 * arquivos que faltarem no primeiro pedido.
 */
async function storeResumeFiles(
  revisionId: number,
  files: ReadonlyMap<string, Buffer>,
): Promise<void> {
  const { databasePath } = getServerEnv();
  if (databasePath === null) {
    return;
  }
  try {
    await saveResumeFiles(resumeDirectoryFor(databasePath), revisionId, files);
  } catch (error) {
    console.error(
      `[admin] o currículo da revisão ${revisionId} não foi gravado`,
      error,
    );
  }
}

/**
 * Publica o rascunho: confere se ele pode ir ao ar, gera o currículo em PDF e
 * DOCX, grava uma revisão nova e expira o cache do site, que mostra a revisão
 * já na próxima visita, sem deploy.
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

    // O currículo sai antes da revisão: se o gerador falhar, nada é publicado.
    let resume: Map<string, Buffer>;
    try {
      resume = await renderPublicResumeFiles(toPublicDocument(document));
    } catch (error) {
      console.error("[admin] o currículo não foi gerado", error);
      return { ok: false, reason: "resume-failed" };
    }
    // Enquanto o currículo era gerado, outra aba pode ter publicado esta mesma
    // versão. Daqui até gravar não há outra pausa: o `node:sqlite` é síncrono.
    const current = readLatestRevision(db);
    if (current !== null && versionOf(current.document) === version) {
      return { ok: false, reason: "unchanged" };
    }

    const revision = insertRevision(db, document, note === "" ? null : note);
    await storeResumeFiles(revision.id, resume);
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
