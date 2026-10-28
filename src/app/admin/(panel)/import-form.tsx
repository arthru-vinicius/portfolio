"use client";

import { useRef, useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { describeIssuePath } from "@/components/admin/issue-path";
import { inputClass, secondaryButtonClass } from "@/components/admin/styles";
import type { ImportResult } from "@/content/save-result";
import { adminMessages } from "@/i18n/admin";

import { importDocument } from "./content-actions";

const messages = adminMessages.backup;

/** Abaixo do limite de 1 MB das Server Actions, com folga para o envelope. */
const MAX_FILE_BYTES = 900_000;
const ISSUES_SHOWN = 5;

type Feedback =
  | { tone: "success"; message: string }
  | { tone: "error"; message: string; issues?: string[] };

function feedbackFor(result: ImportResult): Feedback {
  if (result.ok) {
    return { tone: "success", message: messages.imported };
  }
  switch (result.reason) {
    case "unreadable":
      return { tone: "error", message: messages.unreadable(result.line) };
    case "newer-version":
      return { tone: "error", message: messages.newerVersion };
    case "conflict":
      return { tone: "error", message: adminMessages.editor.conflict };
    case "invalid": {
      const shown = result.issues
        .slice(0, ISSUES_SHOWN)
        .map(({ path, message }) =>
          path === "" ? message : `${describeIssuePath(path)}: ${message}`,
        );
      const hidden = result.issues.length - shown.length;
      return {
        tone: "error",
        message: messages.invalidDocument,
        issues: hidden > 0 ? [...shown, messages.moreIssues(hidden)] : shown,
      };
    }
  }
}

/**
 * Importa um arquivo de conteúdo, em YAML ou JSON, para o rascunho, depois de
 * confirmar. Nada é publicado.
 *
 * @param props.version - Versão do documento que a página abriu.
 * @param props.replacesDraft - Se já existe um rascunho, que a importação
 *   substitui.
 */
export function ImportForm({
  version,
  replacesDraft,
}: {
  version: string;
  replacesDraft: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pending, startTransition] = useTransition();

  function requestImport() {
    // Lido do campo, e não de um onChange: um arquivo escolhido antes de a
    // página terminar de carregar também vale.
    const chosen = inputRef.current?.files?.[0] ?? null;
    setFile(chosen);
    if (chosen === null) {
      setFeedback({ tone: "error", message: messages.noFile });
      inputRef.current?.focus();
      return;
    }
    if (chosen.size > MAX_FILE_BYTES) {
      setFeedback({ tone: "error", message: messages.tooLarge });
      return;
    }
    setFeedback(null);
    setConfirming(true);
  }

  function runImport(chosen: File) {
    startTransition(async () => {
      try {
        const result = await importDocument({
          version,
          text: await chosen.text(),
        });
        setFeedback(feedbackFor(result));
        if (result.ok && inputRef.current !== null) {
          inputRef.current.value = "";
          setFile(null);
        }
      } catch (error) {
        console.error("[painel] falha ao importar", error);
        setFeedback({
          tone: "error",
          message: adminMessages.editor.unexpected,
        });
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="import-file" className="font-medium">
        {messages.importLabel}
      </label>
      <input
        ref={inputRef}
        id="import-file"
        type="file"
        accept=".yaml,.yml,.json,application/yaml,application/json"
        aria-describedby="import-file-hint"
        className={`${inputClass} file:mr-3 file:rounded file:border-0 file:bg-surface file:px-3 file:py-1.5 file:font-medium file:text-foreground`}
      />
      <p id="import-file-hint" className="text-sm text-muted">
        {messages.importHint}
      </p>
      <div>
        <button
          type="button"
          onClick={requestImport}
          disabled={pending}
          className={secondaryButtonClass}
        >
          {pending ? messages.importing : messages.importSubmit}
        </button>
      </div>
      {feedback?.tone === "success" && (
        <p role="status" className="text-success">
          {feedback.message}
        </p>
      )}
      {feedback?.tone === "error" && (
        <div role="alert" className="flex flex-col gap-2 text-danger">
          <p>{feedback.message}</p>
          {feedback.issues !== undefined && (
            <ul className="list-disc pl-5">
              {feedback.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        title={
          replacesDraft ? messages.confirmTitle : messages.confirmFirstTitle
        }
        message={(replacesDraft
          ? messages.confirmMessage
          : messages.confirmFirstMessage)(file?.name ?? "")}
        confirmLabel={replacesDraft ? messages.confirm : messages.confirmFirst}
        tone={replacesDraft ? "danger" : "default"}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          if (file !== null) {
            runImport(file);
          }
        }}
      />
    </div>
  );
}
