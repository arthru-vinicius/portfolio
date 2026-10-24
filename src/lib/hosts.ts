/**
 * Extrai o nome do host do cabeçalho `Host`, sem a porta.
 *
 * @param hostHeader - Valor do cabeçalho, por exemplo `127.0.0.1:3000`.
 * @returns O nome em minúsculas e sem o ponto final, ou `null` se o valor não
 *   for um host.
 */
export function hostnameFromHostHeader(
  hostHeader: string | null,
): string | null {
  // Espaço, barras, arroba, interrogação e cerquilha fariam o `URL` abaixo
  // ler outra coisa como host.
  if (
    hostHeader === null ||
    hostHeader === "" ||
    /[\s/@?#\\]/.test(hostHeader)
  ) {
    return null;
  }
  try {
    const { hostname } = new URL(`http://${hostHeader}`);
    return hostname.replace(/\.$/, "") || null;
  } catch {
    return null;
  }
}

/**
 * Lê uma lista de hosts separada por vírgula, como a `ADMIN_HOSTS`.
 *
 * @param value - Valor da variável; ausente vale lista vazia.
 * @returns Os hosts em minúsculas, sem espaços e sem itens vazios.
 */
export function parseHostList(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter((host) => host !== "");
}

/**
 * Diz se o pedido chegou por um host da lista. A porta é ignorada: a lista
 * guarda só nomes.
 *
 * @param hostHeader - Valor do cabeçalho `Host`.
 * @param allowedHosts - Hosts permitidos, como sai de `parseHostList`.
 * @returns `true` se o host está na lista.
 */
export function isAllowedHost(
  hostHeader: string | null,
  allowedHosts: readonly string[],
): boolean {
  const hostname = hostnameFromHostHeader(hostHeader);
  return hostname !== null && allowedHosts.includes(hostname);
}
