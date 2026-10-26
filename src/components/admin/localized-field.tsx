"use client";

import type { ReactNode } from "react";

import { contentLimits, type LocalizedText } from "@/content/schema";
import { isMissingTranslation } from "@/content/translations";
import { locales, type Locale } from "@/i18n/config";
import { adminMessages } from "@/i18n/admin";

import { FieldError, useFieldId } from "./fields";
import { badgeClass, inputClass } from "./styles";

const messages = adminMessages.editor;

const localeLabels: Record<Locale, string> = {
  "pt-BR": messages.portuguese,
  en: messages.english,
};

/**
 * Tamanho do texto: `line` é uma linha (nomes, títulos), `sentence` é uma
 * frase (resumos curtos, destaques) e `richText` é texto com Markdown.
 */
export type LocalizedFieldKind = "line" | "sentence" | "richText";

const limits: Record<LocalizedFieldKind, number> = {
  line: contentLimits.line,
  sentence: contentLimits.sentence,
  richText: contentLimits.richText,
};

/** Propriedades do `LocalizedField`. */
export type LocalizedFieldProps = {
  /** Caminho do valor; os campos ficam em `<path>.pt-BR` e `<path>.en`. */
  path: string;
  label: string;
  value: LocalizedText;
  onChange: (value: LocalizedText) => void;
  kind?: LocalizedFieldKind;
  hint?: ReactNode;
  /** Erros do editor, pelo caminho do campo. */
  errors?: Readonly<Record<string, string>>;
  /** Texto de exemplo em cada idioma, como o título padrão de um bloco. */
  placeholder?: LocalizedText;
};

/**
 * Campo de texto nos dois idiomas, lado a lado (um embaixo do outro no
 * celular), com o selo "Tradução faltando" quando só um foi preenchido.
 */
export function LocalizedField({
  path,
  label,
  value,
  onChange,
  kind = "line",
  hint,
  errors = {},
  placeholder,
}: LocalizedFieldProps) {
  const idFor = useFieldId();
  const groupId = idFor(path);
  const missing = isMissingTranslation(value);

  return (
    <fieldset
      className="flex min-w-0 flex-col gap-2"
      aria-describedby={hint === undefined ? undefined : `${groupId}-hint`}
    >
      <legend className="mb-2 font-medium">
        {label}
        {missing && (
          <span
            className={`${badgeClass} ml-2 border-warning align-middle font-normal text-warning`}
          >
            {messages.missingTranslation}
          </span>
        )}
      </legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {locales.map((locale) => {
          const id = idFor(`${path}.${locale}`);
          const error = errors[`${path}.${locale}`];
          const shared = {
            id,
            lang: locale,
            value: value[locale],
            maxLength: limits[kind],
            placeholder: placeholder?.[locale],
            "aria-invalid": error === undefined ? undefined : true,
            "aria-describedby": error === undefined ? undefined : `${id}-error`,
            className: inputClass,
          } as const;
          const change = (text: string) =>
            onChange({ ...value, [locale]: text });

          return (
            <div key={locale} className="flex min-w-0 flex-col gap-1">
              <label htmlFor={id} className="text-sm text-muted">
                {localeLabels[locale]}
              </label>
              {kind === "line" ? (
                <input
                  type="text"
                  {...shared}
                  onChange={(event) => change(event.target.value)}
                />
              ) : (
                <textarea
                  rows={kind === "richText" ? 7 : 3}
                  {...shared}
                  className={`${inputClass} resize-y`}
                  onChange={(event) => change(event.target.value)}
                />
              )}
              <FieldError id={`${id}-error`} message={error} />
            </div>
          );
        })}
      </div>
      {hint !== undefined && (
        <p id={`${groupId}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
      <FieldError id={`${groupId}-error`} message={errors[path]} />
    </fieldset>
  );
}
