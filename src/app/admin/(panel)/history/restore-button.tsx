"use client";

import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { secondaryButtonClass } from "@/components/admin/styles";
import type { RestoreResult } from "@/content/save-result";
import { adminMessages } from "@/i18n/admin";

import { restoreRevision } from "../content-actions";

const messages = adminMessages.history;

type Feedback = { tone: "success" | "error"; message: string };

function feedbackFor(result: RestoreResult, revisionId: number): Feedback {
  if (result.ok) {
    return { tone: "success", message: messages.restored(revisionId) };
  }
  switch (result.reason) {
    case "conflict":
      return { tone: "error", message: adminMessages.editor.conflict };
    case "newer-version":
      return { tone: "error", message: adminMessages.editor.newerVersion };
    case "not-found":
      return { tone: "error", message: messages.notFound };
    case "invalid":
      return { tone: "error", message: adminMessages.editor.unexpected };
  }
}

/**
 * Restaura uma revisão publicada como rascunho, depois de confirmar. Nada é
 * publicado.
 *
 * @param props.revisionId - A revisão a restaurar.
 * @param props.version - Versão do documento que a página abriu.
 * @param props.replacesDraft - Se já existe um rascunho, que a restauração
 *   substitui.
 */
export function RestoreButton({
  revisionId,
  version,
  replacesDraft,
}: {
  revisionId: number;
  version: string;
  replacesDraft: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, startTransition] = useTransition();

  function restore() {
    startTransition(async () => {
      try {
        const result = await restoreRevision({ version, revisionId });
        setFeedback(feedbackFor(result, revisionId));
      } catch (error) {
        console.error("[painel] falha ao restaurar", error);
        setFeedback({
          tone: "error",
          message: adminMessages.editor.unexpected,
        });
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <button
          type="button"
          onClick={() => {
            setFeedback(null);
            setConfirming(true);
          }}
          disabled={pending}
          aria-label={messages.restoreLabel(revisionId)}
          className={secondaryButtonClass}
        >
          {pending ? messages.restoring : messages.restore}
        </button>
      </div>
      {feedback?.tone === "success" && (
        <p role="status" className="text-success">
          {feedback.message}
        </p>
      )}
      {feedback?.tone === "error" && (
        <p role="alert" className="text-danger">
          {feedback.message}
        </p>
      )}
      <ConfirmDialog
        open={confirming}
        title={messages.confirmTitle(revisionId)}
        message={messages.confirmMessage}
        confirmLabel={messages.confirm}
        tone={replacesDraft ? "danger" : "default"}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          restore();
        }}
      />
    </div>
  );
}
