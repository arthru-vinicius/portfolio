/**
 * Pedido simulado para testar Server Actions e funções que leem
 * `next/headers` e chamam `next/navigation`, fora do Next.
 *
 * Uso, no arquivo de teste:
 *
 * ```ts
 * vi.mock("next/headers", async () =>
 *   (await import("../tests/support/next-request")).nextHeadersMock);
 * vi.mock("next/navigation", async () =>
 *   (await import("../tests/support/next-request")).nextNavigationMock);
 * ```
 *
 * Código que chama `connection()` precisa também de um `next/server` com
 * `connection` substituído, porque fora do Next não há pedido em andamento.
 */

/** Um cookie gravado pela resposta. */
export type SetCookie = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

/** Estado do pedido simulado: cabeçalhos, cookies recebidos e gravados. */
export const fakeRequest = {
  headers: new Headers(),
  cookies: new Map<string, string>(),
  setCookies: [] as SetCookie[],
};

/**
 * Começa um pedido novo.
 *
 * @param headers - Cabeçalhos do pedido.
 * @param cookies - Cookies que o navegador mandou.
 */
export function resetFakeRequest(
  headers: Record<string, string> = {},
  cookies: Record<string, string> = {},
): void {
  fakeRequest.headers = new Headers(headers);
  fakeRequest.cookies = new Map(Object.entries(cookies));
  fakeRequest.setCookies = [];
}

/** Substituto de `next/headers`. */
export const nextHeadersMock = {
  headers: async () => fakeRequest.headers,
  cookies: async () => ({
    get: (name: string) => {
      const value = fakeRequest.cookies.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (
      name: string,
      value: string,
      options: Record<string, unknown> = {},
    ) => {
      fakeRequest.setCookies.push({ name, value, options });
    },
  }),
};

/** O `redirect()` foi chamado. */
export class RedirectSignal extends Error {
  readonly url: string;

  constructor(url: string) {
    super(`redirect para ${url}`);
    this.url = url;
  }
}

/** O `notFound()` foi chamado. */
export class NotFoundSignal extends Error {
  constructor() {
    super("notFound");
  }
}

/** Substituto de `next/navigation`: os dois lançam, como no Next. */
export const nextNavigationMock = {
  redirect: (url: string): never => {
    throw new RedirectSignal(url);
  },
  notFound: (): never => {
    throw new NotFoundSignal();
  },
};
