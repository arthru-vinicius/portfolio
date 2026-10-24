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
