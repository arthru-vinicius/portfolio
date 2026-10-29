"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

/** O pedaço da API do Turnstile (`window.turnstile`) que o widget usa. */
type TurnstileApi = {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: "auto" | "light" | "dark";
      language: string;
      size: "flexible";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ): string | undefined;
  remove(widgetId: string): void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Propriedades do `TurnstileWidget`. */
export type TurnstileWidgetProps = {
  /** Site key do widget (pública). */
  siteKey: string;
  /** Ação do formulário, conferida pelo servidor junto com o token. */
  action: string;
  /** Nome do campo escondido que leva o token no formulário. */
  name?: string;
  /** Idioma do widget, no formato da Cloudflare (`pt-br`, `en`). */
  language?: string;
};

/**
 * Widget do Cloudflare Turnstile, que põe o token num campo escondido do
 * formulário em volta.
 *
 * O token vale uma vez só. Para gerar outro depois de uma tentativa, monte o
 * widget de novo (por exemplo, trocando a `key`).
 */
export function TurnstileWidget({
  siteKey,
  action,
  name = "turnstileToken",
  language = "pt-br",
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [token, setToken] = useState("");

  useEffect(() => {
    const container = containerRef.current;
    const turnstile = window.turnstile;
    if (!scriptReady || container === null || turnstile === undefined) {
      return;
    }
    // O tema escolhido no botão do site (`data-theme`) vale sobre o do sistema.
    const chosen = document.documentElement.getAttribute("data-theme");
    const widgetId = turnstile.render(container, {
      sitekey: siteKey,
      action,
      theme: chosen === "light" || chosen === "dark" ? chosen : "auto",
      language,
      size: "flexible",
      callback: setToken,
      "expired-callback": () => setToken(""),
      "error-callback": () => setToken(""),
    });
    return () => {
      if (widgetId !== undefined) {
        turnstile.remove(widgetId);
      }
    };
  }, [scriptReady, siteKey, action, language]);

  return (
    <>
      {/* O onReady roda quando o script termina de carregar e de novo a cada
          montagem, então um widget montado outra vez se desenha sozinho. */}
      <Script
        src={SCRIPT_URL}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} className="min-h-[65px]" />
      <input type="hidden" name={name} value={token} />
    </>
  );
}
