"use client";

import { useActionState, useEffect, useRef } from "react";

import { TurnstileWidget } from "@/components/turnstile-widget";
import { localePaths, type Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionaries";
import { contactLimits, type ContactField } from "@/lib/contact/fields";
import { CONTACT_TURNSTILE_ACTION } from "@/lib/turnstile-actions";

import { sendContactMessage } from "./contact-actions";
import { INITIAL_CONTACT_STATE } from "./contact-state";

const fieldClass =
  "w-full rounded-xl border border-line bg-page px-4 py-3 text-base text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-[invalid=true]:border-alert";

/**
 * Formulário de contato do site: nome, e-mail, mensagem e a verificação do
 * Turnstile. Num erro, o foco vai para o primeiro campo marcado; num envio
 * certo, para o aviso de sucesso.
 *
 * @param props.locale - Idioma da página.
 * @param props.labels - Os textos do formulário, no idioma da página.
 * @param props.siteKey - Site key do Turnstile, lida no servidor.
 */
export function ContactForm({
  locale,
  labels,
  siteKey,
}: {
  locale: Locale;
  labels: Dictionary["contactForm"];
  siteKey: string;
}) {
  const [state, formAction, pending] = useActionState(
    sendContactMessage,
    INITIAL_CONTACT_STATE,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.attempt === 0) {
      return;
    }
    const [firstInvalid] = state.invalidFields;
    if (firstInvalid !== undefined) {
      formRef.current
        ?.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)
        ?.focus();
    } else {
      statusRef.current?.focus();
    }
  }, [state]);

  const errorText: Record<ContactField, string> = {
    name: labels.nameError,
    email: labels.emailError,
    message: labels.messageError,
  };
  const field = (name: ContactField) => {
    const invalid = state.invalidFields.includes(name);
    return {
      id: `contato-${name}`,
      name,
      defaultValue: state.values[name],
      "aria-invalid": invalid || undefined,
      "aria-describedby": invalid ? `contato-${name}-erro` : undefined,
      className: fieldClass,
    } as const;
  };
  const fieldError = (name: ContactField) =>
    state.invalidFields.includes(name) ? (
      <p id={`contato-${name}-erro`} className="text-sm text-alert">
        {errorText[name]}
      </p>
    ) : null;

  return (
    <form
      // O formulário remonta a cada resposta: os valores voltam do servidor
      // (vazios depois de enviar) e o Turnstile gera um token novo.
      key={state.attempt}
      ref={formRef}
      action={formAction}
      noValidate
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="locale" value={localePaths[locale]} />
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="contato-name" className="font-semibold">
            {labels.name}
          </label>
          <input
            {...field("name")}
            type="text"
            autoComplete="name"
            maxLength={contactLimits.name}
            required
          />
          {fieldError("name")}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="contato-email" className="font-semibold">
            {labels.email}
          </label>
          <input
            {...field("email")}
            type="email"
            autoComplete="email"
            maxLength={contactLimits.email}
            required
          />
          {fieldError("email")}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="contato-message" className="font-semibold">
          {labels.message}
        </label>
        <textarea
          {...field("message")}
          rows={6}
          maxLength={contactLimits.message}
          required
        />
        {fieldError("message")}
      </div>
      {/* Campo-armadilha: fora da tela e fora do teclado; só robô preenche. */}
      <div
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px overflow-hidden"
      >
        <label htmlFor="contato-website">{labels.honeypot}</label>
        <input
          id="contato-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      <div role="group" aria-label={labels.verification}>
        <TurnstileWidget
          siteKey={siteKey}
          action={CONTACT_TURNSTILE_ACTION}
          language={locale === "en" ? "en" : "pt-br"}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 items-center rounded-full bg-accent px-7 font-bold text-on-accent shadow-[0_0_28px_-6px_var(--site-accent)] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
        >
          {pending ? labels.sending : labels.submit}
        </button>
      </div>
      {state.message !== null && (
        <p
          ref={statusRef}
          tabIndex={-1}
          role={state.status === "sent" ? "status" : "alert"}
          className={`rounded-xl border px-4 py-3 outline-none ${state.status === "sent" ? "border-accent text-ink" : "border-alert text-ink"}`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
