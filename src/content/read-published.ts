import "server-only";

import { cacheLife, cacheTag, updateTag } from "next/cache";

import { getDatabase } from "@/lib/db/database";
import { readLatestRevision } from "@/lib/db/revisions";

import { toPublicDocument, type PublicDocument } from "./public-projection";

/** Tag do cache do conteúdo publicado. Publicar expira esta tag. */
export const CONTENT_CACHE_TAG = "content";

/** O conteúdo que o site mostra: a última revisão publicada, sem os campos privados. */
export type PublishedContent = {
  revisionId: number;
  /** Hora da publicação, em ISO 8601 (UTC). */
  publishedAt: string;
  document: PublicDocument;
};

/**
 * Lê a última revisão publicada, sem os campos privados, com cache do Next.
 *
 * O cache vale até a próxima publicação, que o expira com
 * `expirePublishedContent()`, e zera a cada deploy.
 *
 * Quem chama precisa fazer `await io()` antes, dentro de um `<Suspense>`: sem
 * isso, o prerender tentaria ler o banco no build, e o build falha.
 *
 * @returns O conteúdo publicado, ou `null` se nada foi publicado ainda.
 */
export async function readPublishedContent(): Promise<PublishedContent | null> {
  "use cache";
  cacheLife("max");
  cacheTag(CONTENT_CACHE_TAG);

  const revision = readLatestRevision(getDatabase());
  if (revision === null) {
    return null;
  }
  return {
    revisionId: revision.id,
    publishedAt: revision.publishedAt,
    document: toPublicDocument(revision.document),
  };
}

/**
 * Expira o cache do conteúdo publicado: a próxima visita já lê a revisão nova,
 * sem servir a antiga nenhuma vez.
 *
 * Só funciona dentro de uma Server Action (é o `updateTag` do Next).
 */
export function expirePublishedContent(): void {
  updateTag(CONTENT_CACHE_TAG);
}
