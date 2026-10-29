import type { DatabaseSync } from "node:sqlite";

import { z } from "zod";

import { consumeRateLimit, type RateLimitRule } from "@/lib/db/rate-limit";
import type { ContactDelivery } from "@/lib/env";
import {
  MAX_TURNSTILE_TOKEN_LENGTH,
  verifyTurnstileToken,
} from "@/lib/turnstile";
import { CONTACT_TURNSTILE_ACTION } from "@/lib/turnstile-actions";

import { contactLimits, type ContactField } from "./fields";

export { contactLimits, type ContactField } from "./fields";

/** Mensagens por IP: 5 por hora. Quem precisa de mais tem o e-mail na página. */
export const CONTACT_RATE_LIMIT: RateLimitRule = {
  limit: 5,
  windowMs: 60 * 60 * 1000,
};

// Quebra de linha e caracteres de controle no nome iriam para cabeçalhos de
// e-mail (o relay recusa); o app recusa antes.
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

/** Campos do formulário, já validados. */
const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "name")
    .max(contactLimits.name, "name")
    .refine((value) => !CONTROL_CHARACTERS.test(value), "name"),
  email: z
    .string()
    .trim()
    .max(contactLimits.email, "email")
    .pipe(z.email("email")),
  message: z
    .string()
    .trim()
    .min(1, "message")
    .max(contactLimits.message, "message"),
  turnstileToken: z.string().min(1).max(MAX_TURNSTILE_TOKEN_LENGTH),
  /** Campo-armadilha: escondido de quem usa a página, só robô preenche. */
  website: z.string().max(500).optional(),
});

/** Resultado de um envio. */
export type ContactOutcome =
  | { ok: true }
  | { ok: false; reason: "rate-limited"; retryAfterMs: number }
  | { ok: false; reason: "invalid-input"; fields: ContactField[] }
  | {
      ok: false;
      reason: "turnstile-rejected" | "turnstile-unavailable" | "unavailable";
    };

/** A mensagem no formato do relay de e-mail. */
export type RelayMessage = {
  subject: string;
  text: string;
  replyTo: string;
  fromName: string;
};

const RELAY_TIMEOUT_MS = 10_000;

/**
 * Entrega a mensagem ao relay de e-mail, que manda para o Arthur. O destino é
 * fixo no relay: o app não escolhe para quem envia.
 *
 * @param input - URL e token do relay, e a mensagem.
 * @param fetchImpl - Implementação do `fetch`; os testes passam uma falsa.
 * @returns Se o relay aceitou (`202`).
 */
export async function sendToRelay(
  input: { url: string; token: string; message: RelayMessage },
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; status: number | null }> {
  try {
    const response = await fetchImpl(input.url, {
      method: "POST",
      headers: {
        // O token vai como veio do ambiente, sem codificar.
        Authorization: `Bearer ${input.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input.message),
      signal: AbortSignal.timeout(RELAY_TIMEOUT_MS),
    });
    return response.status === 202
      ? { ok: true }
      : { ok: false, status: response.status };
  } catch {
    return { ok: false, status: null };
  }
}

/** Monta a mensagem que chega ao Arthur, em texto puro. */
export function composeMessage(form: {
  name: string;
  email: string;
  message: string;
  locale: string;
}): RelayMessage {
  return {
    subject: `Portfólio: mensagem de ${form.name}`.slice(0, 200),
    text: [
      "Nova mensagem pelo formulário do portfólio.",
      "",
      `Nome: ${form.name}`,
      `E-mail: ${form.email}`,
      `Idioma da página: ${form.locale}`,
      "",
      "Mensagem:",
      form.message,
    ].join("\n"),
    replyTo: form.email,
    fromName: form.name,
  };
}

/** O que um envio precisa. */
export type ContactAttempt = {
  db: DatabaseSync;
  clientIp: string | null;
  turnstile: { secretKey: string; hostnames: readonly string[] };
  delivery: ContactDelivery;
  locale: string;
  /** Os campos do formulário, ainda não validados. */
  form: Record<
    "name" | "email" | "message" | "turnstileToken" | "website",
    unknown
  >;
  now?: Date;
};

/** Dependências trocadas nos testes. */
export type ContactDependencies = {
  verifyTurnstile?: typeof verifyTurnstileToken;
  relay?: typeof sendToRelay;
};

function fieldsWithProblems(error: z.ZodError): ContactField[] {
  const fields = new Set<ContactField>();
  for (const issue of error.issues) {
    const [field] = issue.path;
    if (field === "name" || field === "email" || field === "message") {
      fields.add(field);
    }
  }
  return [...fields];
}

/**
 * Faz um envio do formulário de contato, na ordem que protege o servidor:
 * limite de tentativas, campos, campo-armadilha, Turnstile e, por último, a
 * entrega.
 *
 * O campo-armadilha preenchido responde como sucesso, sem entregar: o robô
 * não aprende que foi pego.
 *
 * @param attempt - Banco, IP, configuração, idioma e campos.
 * @param dependencies - Turnstile e relay; os testes passam versões falsas.
 * @returns Se a mensagem foi entregue, ou o motivo da recusa.
 */
export async function attemptContact(
  attempt: ContactAttempt,
  dependencies: ContactDependencies = {},
): Promise<ContactOutcome> {
  const { verifyTurnstile = verifyTurnstileToken, relay = sendToRelay } =
    dependencies;
  const { db, clientIp, now = new Date() } = attempt;

  const limit = consumeRateLimit(
    db,
    `contact:${clientIp ?? "desconhecido"}`,
    CONTACT_RATE_LIMIT,
    now,
  );
  if (!limit.allowed) {
    return {
      ok: false,
      reason: "rate-limited",
      retryAfterMs: limit.retryAfterMs,
    };
  }

  const form = contactFormSchema.safeParse(attempt.form);
  if (!form.success) {
    const fields = fieldsWithProblems(form.error);
    // Sem campo do visitante com problema, o que falhou foi o token.
    return fields.length === 0
      ? { ok: false, reason: "turnstile-rejected" }
      : { ok: false, reason: "invalid-input", fields };
  }
  if ((form.data.website ?? "").trim() !== "") {
    console.warn(
      `[contato] campo-armadilha preenchido, ip=${clientIp ?? "desconhecido"}`,
    );
    return { ok: true };
  }

  const turnstile = await verifyTurnstile({
    secretKey: attempt.turnstile.secretKey,
    token: form.data.turnstileToken,
    remoteIp: clientIp,
    expectedAction: CONTACT_TURNSTILE_ACTION,
    expectedHostnames: attempt.turnstile.hostnames,
  });
  if (!turnstile.ok) {
    return {
      ok: false,
      reason:
        turnstile.reason === "unavailable"
          ? "turnstile-unavailable"
          : "turnstile-rejected",
    };
  }

  const message = composeMessage({ ...form.data, locale: attempt.locale });
  if (attempt.delivery.mode === "log") {
    // Só o resumo: o texto do visitante não vai para o log.
    console.info(
      `[contato] envio simulado: "${message.subject}", ${form.data.message.length} caracteres`,
    );
    return { ok: true };
  }
  const delivered = await relay({
    url: attempt.delivery.url,
    token: attempt.delivery.token,
    message,
  });
  if (!delivered.ok) {
    console.error(
      `[contato] o relay recusou a mensagem (status ${delivered.status ?? "sem resposta"})`,
    );
    return { ok: false, reason: "unavailable" };
  }
  console.info("[contato] mensagem entregue ao relay");
  return { ok: true };
}
