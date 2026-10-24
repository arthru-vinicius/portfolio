import { z } from "zod";

/**
 * Site key do widget do Turnstile em produção. É pública por definição (vai no
 * HTML da página); a secret correspondente fica só no servidor.
 */
export const TURNSTILE_SITE_KEY = "0x4AAAAAAFkVtqf629yml3US";

/**
 * Site key de teste da Cloudflare, que sempre passa. É a do desenvolvimento e
 * dos testes, que nunca usam a real.
 */
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

/** Endpoint de verificação do token, do lado do servidor. */
export const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Tamanho máximo de um token, segundo a documentação da Cloudflare. */
export const MAX_TURNSTILE_TOKEN_LENGTH = 2048;

const VERIFY_TIMEOUT_MS = 10_000;

const siteverifyResponseSchema = z.looseObject({
  success: z.boolean(),
  "error-codes": z.array(z.string()).default([]),
  hostname: z.string().optional(),
  action: z.string().optional(),
  metadata: z
    .looseObject({ result_with_testing_key: z.boolean().optional() })
    .optional(),
});

/** Resultado da verificação de um token. */
export type TurnstileVerification =
  | { ok: true }
  | {
      ok: false;
      /**
       * `rejected`: a Cloudflare recusou o token. `mismatch`: o token é de
       * outro host ou de outro formulário. `unavailable`: não deu para
       * consultar a Cloudflare.
       */
      reason: "rejected" | "mismatch" | "unavailable";
      errorCodes: readonly string[];
    };

/**
 * Confere um token do Turnstile na Cloudflare.
 *
 * Além do `success`, confere o host em que o widget foi exibido e a ação do
 * formulário, como a Cloudflare recomenda. As chaves de teste respondem com
 * host e ação fixos (e marcam a resposta como de teste), então essas duas
 * conferências só valem para as chaves reais.
 *
 * @param input - Secret, token enviado pelo formulário, IP do visitante (se
 *   conhecido), ação esperada e hosts aceitos.
 * @param fetchImpl - Implementação do `fetch`; os testes passam uma falsa.
 * @returns Se o token vale para este formulário.
 */
export async function verifyTurnstileToken(
  input: {
    secretKey: string;
    token: string;
    remoteIp: string | null;
    expectedAction: string;
    expectedHostnames: readonly string[];
  },
  fetchImpl: typeof fetch = fetch,
): Promise<TurnstileVerification> {
  const body = new URLSearchParams({
    secret: input.secretKey,
    response: input.token,
  });
  if (input.remoteIp !== null) {
    body.set("remoteip", input.remoteIp);
  }

  let parsed: z.infer<typeof siteverifyResponseSchema>;
  try {
    const response = await fetchImpl(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    if (!response.ok) {
      return { ok: false, reason: "unavailable", errorCodes: [] };
    }
    parsed = siteverifyResponseSchema.parse(await response.json());
  } catch {
    return { ok: false, reason: "unavailable", errorCodes: [] };
  }

  const errorCodes = parsed["error-codes"];
  if (!parsed.success) {
    return { ok: false, reason: "rejected", errorCodes };
  }
  if (parsed.metadata?.result_with_testing_key === true) {
    return { ok: true };
  }
  if (
    parsed.action !== input.expectedAction ||
    parsed.hostname === undefined ||
    !input.expectedHostnames.includes(parsed.hostname.toLowerCase())
  ) {
    return { ok: false, reason: "mismatch", errorCodes };
  }
  return { ok: true };
}
