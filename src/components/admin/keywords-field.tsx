"use client";

import { useState, type ReactNode } from "react";

import { contentLimits } from "@/content/schema";
import { adminMessages } from "@/i18n/admin";

import { FieldError, useFieldId } from "./fields";
import { inputClass, secondaryButtonClass } from "./styles";

const messages = adminMessages.editor;

/** Propriedades do `KeywordsField`. */
export type KeywordsFieldProps = {
  /** Caminho da lista; o campo de digitar fica em `<path>`. */
  path: string;
  label: string;
  value: readonly string[];
  onChange: (value: string[]) => void;
  /** Etiquetas já usadas no documento, sugeridas enquanto se digita. */
  suggestions: readonly string[];
  hint?: ReactNode;
  errors?: Readonly<Record<string, string>>;
};

/**
 * Lista de etiquetas, como tecnologias e habilidades. Enter ou vírgula
 * acrescentam o que foi digitado, e colar "Java, Docker" acrescenta as duas.
 * Uma etiqueta que já existe no documento entra com a grafia de lá.
 */
export function KeywordsField({
  path,
  label,
  value,
  onChange,
  suggestions,
  hint = messages.keywordsHint,
  errors = {},
}: KeywordsFieldProps) {
  const [typed, setTyped] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const id = useFieldId()(path);
  const listId = `${id}-suggestions`;
  // O erro da lista (repetição, tamanho) ou o primeiro de uma etiqueta.
  const error =
    errors[path] ??
    Object.entries(errors).find(([key]) => key.startsWith(`${path}.`))?.[1];

  function add(raw: string) {
    const next = [...value];
    let repeated: string | null = null;
    for (const part of raw.split(",")) {
      const keyword = part.trim();
      if (keyword === "") {
        continue;
      }
      const key = keyword.toLowerCase();
      if (next.some((existing) => existing.toLowerCase() === key)) {
        repeated = keyword;
        continue;
      }
      next.push(
        suggestions.find((known) => known.toLowerCase() === key) ?? keyword,
      );
    }
    onChange(next);
    setTyped("");
    setNotice(repeated === null ? null : messages.keywordDuplicate(repeated));
  }

  const available = suggestions.filter(
    (suggestion) =>
      !value.some(
        (keyword) => keyword.toLowerCase() === suggestion.toLowerCase(),
      ),
  );

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label={label}>
          {value.map((keyword) => (
            <li
              key={keyword}
              className="inline-flex items-center gap-1 rounded-full border border-control py-0.5 pr-1 pl-3"
            >
              <span>{keyword}</span>
              <button
                type="button"
                aria-label={messages.keywordRemove(keyword)}
                onClick={() =>
                  onChange(value.filter((existing) => existing !== keyword))
                }
                className="inline-flex size-8 items-center justify-center rounded-full outline-offset-2 hover:bg-surface focus-visible:outline-2 focus-visible:outline-foreground"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  className="size-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          list={listId}
          value={typed}
          maxLength={contentLimits.keyword * 4}
          onChange={(event) => {
            // Colar uma lista separada por vírgulas acrescenta todas de uma vez.
            const text = event.target.value;
            if (text.includes(",")) {
              add(text);
            } else {
              setTyped(text);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add(typed);
            }
          }}
          autoComplete="off"
          aria-invalid={error === undefined ? undefined : true}
          aria-describedby={[`${id}-hint`, error !== undefined && `${id}-error`]
            .filter(Boolean)
            .join(" ")}
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => add(typed)}
          className={secondaryButtonClass}
        >
          {messages.keywordsAdd}
        </button>
      </div>
      <datalist id={listId}>
        {available.map((suggestion) => (
          <option key={suggestion} value={suggestion} />
        ))}
      </datalist>
      <p id={`${id}-hint`} className="text-sm text-muted">
        {hint}
      </p>
      <p role="status" className="text-sm text-muted empty:hidden">
        {notice}
      </p>
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}
