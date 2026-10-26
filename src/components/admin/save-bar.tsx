"use client";

import { useState } from "react";

import { adminMessages } from "@/i18n/admin";
import { formatTime } from "@/i18n/format";

import { ConfirmDialog } from "./confirm-dialog";
import { primaryButtonClass, secondaryButtonClass } from "./styles";
import { useLeaveWithoutSaving } from "./unsaved-changes";
import type { DraftEditor, SaveFailure } from "./use-draft-editor";

const messages = adminMessages.editor;

const inactive = "aria-disabled:cursor-not-allowed aria-disabled:opacity-60";

const failureMessages: Record<SaveFailure, string> = {
  conflict: messages.conflict,
  invalid: messages.invalid,
  "newer-version": messages.newerVersion,
  unexpected: messages.unexpected,
};

/**
 * Barra fixa no fim da tela, com a situação do salvamento e os botões Salvar e
 * Descartar. A situação é anunciada aos leitores de tela, e os erros, como
 * alerta.
 *
 * @param props.editor - O editor da página (`useDraftEditor`).
 */
export function SaveBar<T>({ editor }: { editor: DraftEditor<T> }) {
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const leaveWithoutSaving = useLeaveWithoutSaving();
  const { dirty, pending, savedAt, failure } = editor;

  let status = "";
  if (pending) {
    status = messages.saving;
  } else if (dirty) {
    status = messages.unsaved;
  } else if (savedAt !== null) {
    status = messages.savedAt(formatTime(savedAt, "pt-BR"));
  }

  return (
    <div className="sticky bottom-0 z-10 -mx-6 mt-10 border-t border-control bg-background px-6 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-muted">
          {status}
        </p>
        {/* `aria-disabled`, e não `disabled`: um botão desligado perde o foco,
            e quem salvou pelo teclado ficaria sem saber onde está. */}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              if (dirty && !pending) {
                setConfirmingDiscard(true);
              }
            }}
            aria-disabled={!dirty || pending}
            className={`${secondaryButtonClass} ${inactive}`}
          >
            {messages.discard}
          </button>
          <button
            type="button"
            onClick={editor.save}
            aria-disabled={!dirty || pending}
            className={`${primaryButtonClass} ${inactive}`}
          >
            {pending ? messages.saving : messages.save}
          </button>
        </div>
      </div>
      {failure !== null && (
        <div
          role="alert"
          className="mt-3 flex flex-wrap items-center gap-3 text-danger"
        >
          <p>{failureMessages[failure]}</p>
          {(failure === "conflict" || failure === "newer-version") && (
            <button
              type="button"
              // A mensagem já disse que o que foi feito aqui não foi salvo; o
              // aviso do navegador seria uma segunda pergunta.
              onClick={() => leaveWithoutSaving(() => window.location.reload())}
              className={secondaryButtonClass}
            >
              {messages.reload}
            </button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmingDiscard}
        title={messages.discardTitle}
        message={messages.discardMessage}
        confirmLabel={messages.discardConfirm}
        tone="danger"
        onCancel={() => setConfirmingDiscard(false)}
        onConfirm={() => {
          setConfirmingDiscard(false);
          editor.discard();
        }}
      />
    </div>
  );
}
