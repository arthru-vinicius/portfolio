"use client";

import type { ReactNode } from "react";

import { adminMessages } from "@/i18n/admin";

import {
  cardClass,
  dangerButtonClass,
  iconButtonClass,
  secondaryButtonClass,
} from "./styles";

const messages = adminMessages.editor;

// Os botões de texto das linhas de item são mais baixos que os da tela, mas
// continuam com 44 px de altura.
const compact = "px-3";

function ArrowIcon({ direction }: { direction: "up" | "down" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className={`size-5 ${direction === "down" ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 16V4M5 9l5-5 5 5" />
    </svg>
  );
}

/**
 * Leva o foco ao primeiro elemento da lista que existir e estiver ligado.
 * Serve para depois de remover um item: o botão Remover sai da página junto
 * com ele, e sem isto o foco cairia no começo do documento.
 *
 * @param ids - Os `id`s, na ordem de preferência.
 */
export function focusFirstAvailable(ids: readonly string[]): void {
  // Espera o React tirar o item da página.
  requestAnimationFrame(() => {
    for (const id of ids) {
      const element = document.getElementById(id);
      if (
        element !== null &&
        !(element instanceof HTMLButtonElement && element.disabled)
      ) {
        element.focus();
        return;
      }
    }
  });
}

/**
 * Os `id`s para onde levar o foco quando um item sai da lista: os botões do
 * item vizinho (o seguinte, ou o anterior) ou, sem vizinho, a reserva.
 *
 * @param prefix - Prefixo dos `id`s dos botões dos itens, como `item-`.
 * @param ids - Os ids dos itens, na ordem, antes da remoção.
 * @param removedIndex - A posição do item removido.
 * @param fallback - O `id` da reserva, como o botão de adicionar.
 * @returns Os `id`s, na ordem de preferência.
 */
export function focusTargetsAfterRemoval(
  prefix: string,
  ids: readonly string[],
  removedIndex: number,
  fallback: string,
): string[] {
  const neighbor = ids[removedIndex + 1] ?? ids[removedIndex - 1];
  return neighbor === undefined
    ? [fallback]
    : [
        `${prefix}${neighbor}-toggle`,
        `${prefix}${neighbor}-up`,
        `${prefix}${neighbor}-down`,
        `${prefix}${neighbor}-remove`,
        fallback,
      ];
}

/** Propriedades do `ItemControls`. */
export type ItemControlsProps = {
  /** Base dos `id`s dos botões, única na página. */
  id: string;
  /** Nome do item, para os rótulos ("Mover NukaBoost para cima"). */
  name: string;
  index: number;
  total: number;
  onMove: (offset: -1 | 1) => void;
  onDuplicate?: () => void;
  onRemove: () => void;
};

/**
 * Botões de um item de lista: subir, descer, duplicar e remover. Depois de
 * mover, o foco continua no botão usado, e dá para seguir movendo pelo
 * teclado.
 */
export function ItemControls({
  id,
  name,
  index,
  total,
  onMove,
  onDuplicate,
  onRemove,
}: ItemControlsProps) {
  function move(offset: -1 | 1) {
    onMove(offset);
    // O React move o elemento no DOM, e o navegador tira o foco dele. Se o
    // item chegou na ponta, o botão usado fica desligado e o foco vai para o
    // outro.
    requestAnimationFrame(() => {
      const used = document.getElementById(
        `${id}-${offset < 0 ? "up" : "down"}`,
      );
      const other = document.getElementById(
        `${id}-${offset < 0 ? "down" : "up"}`,
      );
      const target =
        used instanceof HTMLButtonElement && !used.disabled ? used : other;
      target?.focus();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        id={`${id}-up`}
        type="button"
        aria-label={messages.moveUp(name)}
        title={messages.moveUp(name)}
        disabled={index === 0}
        onClick={() => move(-1)}
        className={iconButtonClass}
      >
        <ArrowIcon direction="up" />
      </button>
      <button
        id={`${id}-down`}
        type="button"
        aria-label={messages.moveDown(name)}
        title={messages.moveDown(name)}
        disabled={index === total - 1}
        onClick={() => move(1)}
        className={iconButtonClass}
      >
        <ArrowIcon direction="down" />
      </button>
      {onDuplicate !== undefined && (
        <button
          type="button"
          aria-label={messages.duplicateLabel(name)}
          onClick={onDuplicate}
          className={`${secondaryButtonClass} ${compact}`}
        >
          {messages.duplicate}
        </button>
      )}
      <button
        id={`${id}-remove`}
        type="button"
        aria-label={messages.removeLabel(name)}
        onClick={onRemove}
        className={`${dangerButtonClass} ${compact}`}
      >
        {messages.remove}
      </button>
    </div>
  );
}

/** Propriedades do `ItemCard`. */
export type ItemCardProps = {
  /** Base dos `id`s, única na página. */
  id: string;
  title: string;
  /** Linha abaixo do título, como o cargo de uma experiência. */
  subtitle?: string;
  /** Selos de estado ("Oculto no site", "No currículo"). */
  badges?: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  controls: ReactNode;
  children: ReactNode;
};

/**
 * Cartão de um item de lista, que abre e fecha o formulário dele. Fechado, o
 * formulário continua na página (escondido), e as alterações dele continuam
 * valendo.
 */
export function ItemCard({
  id,
  title,
  subtitle,
  badges,
  expanded,
  onToggle,
  controls,
  children,
}: ItemCardProps) {
  const panelId = `${id}-panel`;
  return (
    <li className={cardClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="font-medium">
            <button
              id={`${id}-toggle`}
              type="button"
              aria-expanded={expanded}
              aria-controls={panelId}
              aria-label={
                expanded ? messages.collapse(title) : messages.expand(title)
              }
              onClick={onToggle}
              className="flex min-h-11 w-full items-center gap-2 rounded-md text-left outline-offset-2 focus-visible:outline-2 focus-visible:outline-foreground"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className={`size-5 shrink-0 transition-transform motion-reduce:transition-none ${expanded ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M8 5l5 5-5 5" />
              </svg>
              <span className="min-w-0 break-words">{title}</span>
            </button>
          </h3>
          {(subtitle !== undefined || badges !== undefined) && (
            <div className="flex flex-wrap items-center gap-2 pl-7 text-sm text-muted">
              {subtitle !== undefined && subtitle !== "" && (
                <span>{subtitle}</span>
              )}
              {badges}
            </div>
          )}
        </div>
        {controls}
      </div>
      <div
        id={panelId}
        hidden={!expanded}
        className="mt-5 flex flex-col gap-6 border-t border-control pt-5"
      >
        {children}
      </div>
    </li>
  );
}
