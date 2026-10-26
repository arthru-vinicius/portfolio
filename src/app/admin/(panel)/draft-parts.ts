import "server-only";

import { createHash } from "node:crypto";

import type { Block, PortfolioDocument } from "@/content/schema";

/**
 * As partes do rascunho que cada tela do painel edita. Cada tela guarda a
 * versão da parte que abriu, e salvar só é recusado se essa mesma parte mudou
 * em outro lugar (outra aba, por exemplo): mudar o perfil não atrapalha quem
 * está editando um bloco.
 */
export const draftParts = {
  profile: (document: PortfolioDocument) => document.profile,
  resume: (document: PortfolioDocument) => document.resume,
  /** A estrutura da lista: ordem, tipos e visibilidade, sem o conteúdo. */
  blockList: (document: PortfolioDocument) =>
    document.blocks.map(({ id, type, visible }) => ({ id, type, visible })),
  block:
    (blockId: string) =>
    (document: PortfolioDocument): Block | null =>
      document.blocks.find((block) => block.id === blockId) ?? null,
  /** O documento inteiro, para a importação. */
  document: (document: PortfolioDocument) => document,
};

/** O valor com as chaves dos objetos em ordem alfabética, em toda a árvore. */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, child]) => [key, canonical(child)]),
    );
  }
  return value;
}

/**
 * Versão de uma parte do rascunho: um resumo (SHA-256) do JSON dela, com as
 * chaves em ordem alfabética. O mesmo conteúdo dá sempre a mesma versão, seja
 * qual for a ordem em que as chaves chegaram.
 *
 * @param part - A parte, como sai de `draftParts`.
 * @returns A versão, em hexadecimal.
 */
export function versionOf(part: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonical(part ?? null)))
    .digest("hex");
}
