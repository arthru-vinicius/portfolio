"use client";

import { useActionState } from "react";

import { TurnstileWidget } from "@/components/turnstile-widget";
import { adminMessages } from "@/i18n/admin";
import { ADMIN_LOGIN_TURNSTILE_ACTION } from "@/lib/turnstile-actions";

import { login } from "./actions";
import { INITIAL_LOGIN_STATE } from "./state";

const ERROR_ID = "login-error";

const fieldClass =
  "rounded-md border border-control bg-background px-3 py-2.5 text-base outline-offset-2 focus-visible:outline-2 focus-visible:outline-foreground";

/**
 * Formulário de login do painel: usuário, senha e a verificação do Turnstile.
 *
 * @param props.siteKey - Site key do Turnstile, lida no servidor.
 */
export function LoginForm({ siteKey }: { siteKey: string }) {
  const [state, formAction, pending] = useActionState(
    login,
    INITIAL_LOGIN_STATE,
  );
  const describedBy = state.error === null ? undefined : ERROR_ID;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error !== null && (
        <p
          id={ERROR_ID}
          role="alert"
          className="rounded-md border border-danger px-3 py-2.5 text-danger"
        >
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="font-medium">
          {adminMessages.login.username}
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={state.username}
          aria-describedby={describedBy}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="font-medium">
          {adminMessages.login.password}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-describedby={describedBy}
          className={fieldClass}
        />
      </div>

      {/* Uma tentativa gasta o token: a cada resposta, um widget novo. */}
      <TurnstileWidget
        key={state.attempt}
        siteKey={siteKey}
        action={ADMIN_LOGIN_TURNSTILE_ACTION}
      />

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-md bg-foreground px-4 py-2.5 font-medium text-background outline-offset-2 focus-visible:outline-2 focus-visible:outline-foreground disabled:opacity-60"
      >
        {pending ? adminMessages.login.submitting : adminMessages.login.submit}
      </button>
    </form>
  );
}
