"use client";

import { useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { inputClass, primaryButtonClass } from "@/components/admin/styles";
import type { PublishResult } from "@/content/save-result";
import { adminMessages } from "@/i18n/admin";
import { formatTime } from "@/i18n/format";

import { publishDraft } from "./publish-actions";

const messages = adminMessages.publish;

type Feedback = { tone: "success" | "error"; message: string };

function feedbackFor(result: PublishResult): Feedback {
  if (result.ok) {
    return {
      tone: "success",
      message: messages.published(
        result.revisionId,
        formatTime(result.publishedAt, "pt-BR"),
      ),
    };
  }
  switch (result.reason) {
    case "unchanged":
      return { tone: "error", message: messages.unchanged };
    case "incomplete":
      return { tone: "error", message: messages.incomplete };
    case "conflict":
      return { tone: "error", message: messages.conflict };
    case "newer-version":
      return { tone: "error", message: messages.newerVersion };
    case "resume-failed":
      return { tone: "error", message: messages.resumeFailed };
  }
}

/**
 * Publica o rascunho, depois de confirmar, com uma nota opcional para o
 * histórico.
 *
 * Fica montado mesmo sem nada a publicar: depois de publicar, a página volta
 * do servidor sem o formulário, e o aviso de sucesso precisa continuar ali.
 *
 * @param props.version - Versão do documento que a página abriu: publica
 *   exatamente o que ela mostrava.
 * @param props.canPublish - Se o rascunho tem alterações e passa na
 *   conferência. Sem isso, só os avisos aparecem.
 */
export function PublishForm({
  version,
  canPublish,
}: {
  version: string;
  canPublish: boolean;
}) {
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, startTransition] = useTransition();

  function publish() {
    startTransition(async () => {
      try {
        const result = await publishDraft({ version, note });
        setFeedback(feedbackFor(result));
        if (result.ok) {
          setNote("");
        }
      } catch (error) {
        console.error("[painel] falha ao publicar", error);
        setFeedback({ tone: "error", message: messages.unexpected });
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {canPublish && (
        <>
          <label htmlFor="publish-note" className="font-medium">
            {messages.note}
          </label>
          <input
            id="publish-note"
            type="text"
            value={note}
            maxLength={200}
            onChange={(event) => setNote(event.target.value)}
            aria-describedby="publish-note-hint"
            className={inputClass}
          />
          <p id="publish-note-hint" className="text-sm text-muted">
            {messages.noteHint}
          </p>
          <div>
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                setConfirming(true);
              }}
              disabled={pending}
              className={primaryButtonClass}
            >
              {pending ? messages.publishing : messages.submit}
            </button>
          </div>
        </>
      )}
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
        title={messages.confirmTitle}
        message={messages.confirmMessage}
        confirmLabel={messages.confirm}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          publish();
        }}
      />
    </div>
  );
}
