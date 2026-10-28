/** Os temas que o visitante escolhe. `system` segue o sistema operacional. */
export type ThemeChoice = "system" | "light" | "dark";

/** Onde a escolha fica guardada, só no navegador do visitante (sem cookie). */
export const THEME_STORAGE_KEY = "theme";

/** Evento que avisa os componentes de que o tema mudou nesta aba. */
export const THEME_CHANGE_EVENT = "site-theme-change";

/**
 * Script do `<head>` que aplica o tema escolhido antes da primeira pintura:
 * sem ele, a página piscaria no tema do sistema até o React assumir. Fica
 * curto e sem dependências, porque roda antes de tudo; na CSP, entra por
 * hash.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
