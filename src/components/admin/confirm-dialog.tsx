"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { adminMessages } from "@/i18n/admin";

import {
  dangerButtonClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "./styles";

/** Propriedades do `ConfirmDialog`. */
export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** `danger` para o que apaga ou descarta algo. */
  tone?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Pedido de confirmação num `<dialog>` modal: o foco fica preso nele, Esc
 * cancela e, ao fechar, o foco volta para onde estava. O foco começa em
 * Cancelar, a escolha que não muda nada.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = adminMessages.editor.cancel,
  tone = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog === null) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(event) => {
        // Quem fecha é o `open`; o Esc só avisa.
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-lg border border-control bg-background p-6 text-foreground backdrop:bg-black/60"
    >
      <h2 id={titleId} className="text-lg font-semibold">
        {title}
      </h2>
      <div id={messageId} className="mt-2 text-muted">
        {message}
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          className={secondaryButtonClass}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={tone === "danger" ? dangerButtonClass : primaryButtonClass}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
