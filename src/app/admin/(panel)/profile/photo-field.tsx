"use client";

import { useId, useRef, useState } from "react";

import {
  dangerButtonClass,
  secondaryButtonClass,
} from "@/components/admin/styles";
import type { ProfilePhoto } from "@/content/schema";
import { adminMessages } from "@/i18n/admin";
import type { PhotoUploadResult } from "@/lib/media/photo";

const messages = adminMessages.profile;

type Status =
  | { tone: "idle" }
  | { tone: "busy" }
  | { tone: "success" | "error"; message: string };

function errorFor(result: Exclude<PhotoUploadResult, { ok: true }>): string {
  switch (result.reason) {
    case "too-large":
      return messages.photoTooLarge;
    case "invalid-image":
      return messages.photoInvalid;
    case "forbidden":
    case "unavailable":
      return messages.photoUnavailable;
  }
}

/**
 * Foto do perfil: mostra a atual, envia uma nova e remove. Enviar grava o
 * arquivo no servidor e devolve o id; a foto entra no rascunho quando o
 * perfil é salvo, como qualquer outro campo.
 *
 * @param props.value - A foto do perfil, se houver.
 * @param props.onChange - Recebe a foto nova, ou `undefined` ao remover.
 */
export function PhotoField({
  value,
  onChange,
}: {
  value: ProfilePhoto | undefined;
  onChange: (photo: ProfilePhoto | undefined) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const hintId = useId();
  const [status, setStatus] = useState<Status>({ tone: "idle" });

  async function upload(file: File) {
    setStatus({ tone: "busy" });
    try {
      const response = await fetch("/admin/photo", {
        method: "POST",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      const result = (await response.json()) as PhotoUploadResult;
      if (result.ok) {
        onChange(result.photo);
        setStatus({ tone: "success", message: messages.photoUploaded });
      } else {
        setStatus({ tone: "error", message: errorFor(result) });
      }
    } catch (error) {
      console.error("[painel] falha ao enviar a foto", error);
      setStatus({ tone: "error", message: messages.photoUnavailable });
    } finally {
      if (inputRef.current !== null) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="size-32 shrink-0 overflow-hidden rounded-lg border border-control bg-surface">
        {value === undefined ? null : (
          // A prévia usa o arquivo menor que o servidor já gerou.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/media/${value.id}-480.webp`}
            alt={messages.photoPreview}
            width={128}
            height={128}
            className="size-full object-cover"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <label htmlFor={inputId} className="font-medium">
          {messages.photoChoose}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-describedby={hintId}
          disabled={status.tone === "busy"}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file !== undefined) {
              void upload(file);
            }
          }}
          className={`${secondaryButtonClass} w-full justify-start file:mr-3 file:rounded file:border-0 file:bg-surface file:px-3 file:py-1.5 file:font-medium file:text-foreground`}
        />
        <p id={hintId} className="text-sm text-muted">
          {value === undefined ? `${messages.photoNone} ` : ""}
          {messages.photoHint}
        </p>
        {value !== undefined && (
          <div>
            <button
              type="button"
              onClick={() => {
                onChange(undefined);
                setStatus({ tone: "idle" });
              }}
              className={dangerButtonClass}
            >
              {messages.photoRemove}
            </button>
          </div>
        )}
        {status.tone === "busy" && (
          <p role="status" className="text-muted">
            {messages.photoUploading}
          </p>
        )}
        {status.tone === "success" && (
          <p role="status" className="text-success">
            {status.message}
          </p>
        )}
        {status.tone === "error" && (
          <p role="alert" className="text-danger">
            {status.message}
          </p>
        )}
      </div>
    </div>
  );
}
