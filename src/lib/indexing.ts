import { hostnameFromHostHeader } from "@/lib/hosts";

/** O que decide se uma resposta pode ser indexada. */
export type IndexingSettings = {
  /** Origem canônica (`PUBLIC_ORIGIN`), ou `null` se não estiver definida. */
  publicOrigin: string | null;
  /** Se a indexação está liberada (`ALLOW_INDEXING=true`). */
  allowIndexing: boolean;
};

/**
 * Diz se a resposta pode ser indexada pelos buscadores.
 *
 * O app responde com o mesmo conteúdo a qualquer host que chegue até ele (o
 * `127.0.0.1` do healthcheck, por exemplo). Só o host do `PUBLIC_ORIGIN` pode
 * ser indexado, para a busca não ver cópias. E só com a indexação liberada, o
 * que fica desligado enquanto o site está em construção. Sem origem válida,
 * nada é indexado.
 *
 * @param hostHeader - Cabeçalho `Host` do pedido.
 * @param settings - Origem canônica e liberação da indexação.
 * @returns `true` se a resposta pode ir para o índice.
 */
export function isIndexable(
  hostHeader: string | null,
  settings: IndexingSettings,
): boolean {
  if (!settings.allowIndexing || settings.publicOrigin === null) {
    return false;
  }
  const host = hostnameFromHostHeader(hostHeader);
  return host !== null && host === new URL(settings.publicOrigin).hostname;
}
