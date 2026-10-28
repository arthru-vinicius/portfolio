"use client";

import { useSyncExternalStore } from "react";

import { fillTemplate } from "@/i18n/template";

import { MoonIcon, SunIcon, SystemThemeIcon } from "./icons";
import {
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  type ThemeChoice,
} from "./theme";

const NEXT: Readonly<Record<ThemeChoice, ThemeChoice>> = {
  system: "light",
  light: "dark",
  dark: "system",
};

function subscribe(onChange: () => void): () => void {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  // Outra aba do site trocou o tema.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readTheme(): ThemeChoice {
  const value = document.documentElement.getAttribute("data-theme");
  return value === "light" || value === "dark" ? value : "system";
}

function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  try {
    if (choice === "system") {
      root.removeAttribute("data-theme");
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      root.setAttribute("data-theme", choice);
      localStorage.setItem(THEME_STORAGE_KEY, choice);
    }
  } catch {
    // Sem `localStorage` (janela privada, dados bloqueados), o tema vale só
    // até sair da página.
    if (choice === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", choice);
    }
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/**
 * Botão que troca o tema em ciclo: sistema, claro, escuro. O nome acessível
 * diz o tema atual e o próximo.
 *
 * No servidor o tema é sempre o do sistema; o script do `<head>` aplica a
 * escolha guardada antes da primeira pintura, e o botão a lê ao montar.
 *
 * @param props.labels - O nome de cada tema e o modelo do rótulo do botão.
 */
export function ThemeToggle({
  labels,
}: {
  labels: Readonly<Record<ThemeChoice, string>> & { toggle: string };
}) {
  const theme = useSyncExternalStore<ThemeChoice>(
    subscribe,
    readTheme,
    () => "system",
  );
  const next = NEXT[theme];
  const label = fillTemplate(labels.toggle, {
    current: labels[theme],
    next: labels[next],
  });
  const Icon =
    theme === "light" ? SunIcon : theme === "dark" ? MoonIcon : SystemThemeIcon;

  return (
    <button
      type="button"
      // O próximo sai do documento, e não do render: dois cliques antes de o
      // React redesenhar ainda andam duas casas no ciclo.
      onClick={() => applyTheme(NEXT[readTheme()])}
      aria-label={label}
      title={label}
      className="inline-flex size-11 items-center justify-center rounded-full text-lg text-ink transition-colors hover:bg-card-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <Icon />
    </button>
  );
}
