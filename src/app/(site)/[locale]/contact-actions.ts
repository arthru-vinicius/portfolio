"use server";

import { headers } from "next/headers";

import { localeFromPath, defaultLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { pluralize } from "@/i18n/template";
import { getClientIp } from "@/lib/auth/request";
import { attemptContact } from "@/lib/contact/contact";
import type { ContactField } from "@/lib/contact/fields";
import { getDatabase } from "@/lib/db/database";
import { getContactEnv } from "@/lib/env";

import type { ContactFormState } from "./contact-state";

/**
 * Envia a mensagem do formulário de contato. É pública, como o login: não
 * exige sessão, e as proteções são o limite por IP, o campo-armadilha e o
 * Turnstile, conferidos pelo servidor.
 *
 * @param previous - Estado anterior do formulário (`useActionState`).
 * @param formData - Nome, e-mail, mensagem, idioma da página, token do
 *   Turnstile e o campo-armadilha.
 * @returns O novo estado, com a mensagem para o visitante no idioma da página.
 */
export async function sendContactMessage(
  previous: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const text = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  const locale = localeFromPath(text("locale")) ?? defaultLocale;
  const dict = getDictionary(locale).contactForm;
  const values: Record<ContactField, string> = {
    name: text("name").slice(0, 200),
    email: text("email").slice(0, 300),
    message: text("message").slice(0, 6000),
  };
  const reply = (
    status: ContactFormState["status"],
    message: string,
    invalidFields: ContactField[] = [],
  ): ContactFormState => ({
    status,
    message,
    invalidFields,
    // Depois de enviar, o formulário volta vazio.
    values: status === "sent" ? { name: "", email: "", message: "" } : values,
    attempt: previous.attempt + 1,
  });

  const env = getContactEnv();
  if (env.status !== "ready") {
    return reply("error", dict.unavailable);
  }
  const clientIp = getClientIp(await headers());
  const outcome = await attemptContact({
    db: getDatabase(),
    clientIp,
    turnstile: {
      secretKey: env.turnstile.secretKey,
      hostnames: env.hostnames,
    },
    delivery: env.delivery,
    locale,
    form: {
      ...values,
      turnstileToken: formData.get("turnstileToken"),
      website: formData.get("website") ?? undefined,
    },
  });

  if (outcome.ok) {
    return reply("sent", dict.sent);
  }
  switch (outcome.reason) {
    case "invalid-input":
      return reply("error", dict.invalid, outcome.fields);
    case "rate-limited":
      return reply(
        "error",
        pluralize(
          dict.rateLimited,
          Math.max(1, Math.ceil(outcome.retryAfterMs / 60_000)),
          locale,
        ),
      );
    case "turnstile-rejected":
      return reply("error", dict.turnstileRejected);
    case "turnstile-unavailable":
    case "unavailable":
      return reply("error", dict.unavailable);
  }
}
