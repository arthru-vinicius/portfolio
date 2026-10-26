/**
 * Classes compartilhadas pelos componentes do painel, para os controles terem a
 * mesma cara em todas as telas. Os alvos têm pelo menos 44 px de altura.
 */

const focusRing =
  "outline-offset-2 focus-visible:outline-2 focus-visible:outline-foreground";

/** Campo de texto, área de texto e lista de opções. */
export const inputClass = `w-full rounded-md border border-control bg-background px-3 py-2.5 text-base ${focusRing} disabled:opacity-60`;

/** Botão principal da tela, como Salvar. */
export const primaryButtonClass = `inline-flex min-h-11 items-center justify-center rounded-md bg-foreground px-4 py-2.5 font-medium text-background ${focusRing} disabled:opacity-60`;

/** Botão secundário, com borda. */
export const secondaryButtonClass = `inline-flex min-h-11 items-center justify-center rounded-md border border-control px-4 py-2.5 font-medium hover:bg-surface ${focusRing} disabled:opacity-60`;

/** Botão de ação destrutiva, como Remover. */
export const dangerButtonClass = `inline-flex min-h-11 items-center justify-center rounded-md border border-danger px-4 py-2.5 font-medium text-danger hover:bg-surface ${focusRing} disabled:opacity-60`;

/** Botão quadrado só com ícone (o nome acessível vem do `aria-label`). */
export const iconButtonClass = `inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-control hover:bg-surface ${focusRing} disabled:opacity-40 disabled:hover:bg-transparent`;

/** Link com cara de link. */
export const linkClass = `font-medium underline underline-offset-4 ${focusRing}`;

/** Cartão com borda, para agrupar campos ou itens. */
export const cardClass = "rounded-lg border border-control p-4 sm:p-5";

/** Selo de estado, como "Oculto no site". */
export const badgeClass =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm";
