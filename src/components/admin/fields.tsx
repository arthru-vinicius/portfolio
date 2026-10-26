"use client";

import { createContext, use, type ReactNode } from "react";

import { adminMessages } from "@/i18n/admin";

import { inputClass } from "./styles";

/**
 * Campos de formulário do painel. Cada campo tem rótulo, dica e erro ligados
 * por `aria-describedby`, e o erro marca o campo com `aria-invalid`.
 *
 * O `id` de cada campo segue o caminho do valor no que está sendo editado (por
 * exemplo, `links.0.url`), com o prefixo do editor (`FieldScope`): é assim
 * que o editor encontra o campo de um erro para levar o foco até ele.
 */

const FieldScopeContext = createContext("");

/**
 * Dá aos campos de dentro o prefixo de `id` de um editor.
 *
 * @param props.scope - O prefixo, como o `fieldScope` do `useDraftEditor`.
 */
export function FieldScope({
  scope,
  children,
}: {
  scope: string;
  children: ReactNode;
}) {
  return <FieldScopeContext value={scope}>{children}</FieldScopeContext>;
}

/**
 * Monta o `id` de um campo a partir do prefixo do editor e do caminho do
 * valor.
 *
 * @param scope - O prefixo do editor.
 * @param path - Caminho, como `links.0.url`.
 * @returns O `id` do campo.
 */
export function fieldId(scope: string, path: string): string {
  return `${scope}field-${path}`;
}

/**
 * Devolve a função que monta os `id`s dos campos do editor em volta.
 *
 * @returns A função, que recebe o caminho do valor.
 */
export function useFieldId(): (path: string) => string {
  const scope = use(FieldScopeContext);
  return (path) => fieldId(scope, path);
}

/** Junta os `id`s não vazios para o `aria-describedby`. */
function describedBy(
  ...ids: (string | false | undefined)[]
): string | undefined {
  const present = ids.filter(Boolean);
  return present.length > 0 ? present.join(" ") : undefined;
}

/** Primeira letra maiúscula, como o resto das frases do painel. */
function sentence(message: string): string {
  return message.charAt(0).toUpperCase() + message.slice(1);
}

/** Propriedades comuns aos campos. */
type FieldBase = {
  /** Caminho do valor, que vira o `id` do campo. */
  path: string;
  label: string;
  hint?: ReactNode;
  error?: string;
};

/**
 * Mensagem de erro de um campo.
 *
 * @param props.id - `id` do parágrafo, citado no `aria-describedby` do campo.
 * @param props.message - O erro, ou nada.
 */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (message === undefined) {
    return null;
  }
  return (
    <p id={id} className="text-sm text-danger">
      {sentence(message)}
    </p>
  );
}

function FieldHint({ id, hint }: { id: string; hint?: ReactNode }) {
  if (hint === undefined) {
    return null;
  }
  return (
    <p id={id} className="text-sm text-muted">
      {hint}
    </p>
  );
}

/** Propriedades do `TextField`. */
export type TextFieldProps = FieldBase & {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "url" | "email" | "tel";
  maxLength?: number;
  autoComplete?: string;
  placeholder?: string;
  lang?: string;
  disabled?: boolean;
};

/** Campo de uma linha. */
export function TextField({
  path,
  label,
  hint,
  error,
  value,
  onChange,
  type = "text",
  ...inputProps
}: TextFieldProps) {
  const id = useFieldId()(path);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={describedBy(
          hint !== undefined && `${id}-hint`,
          error !== undefined && `${id}-error`,
        )}
        spellCheck={type === "text" ? undefined : false}
        className={inputClass}
        {...inputProps}
      />
      <FieldHint id={`${id}-hint`} hint={hint} />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

/** Propriedades do `CheckboxField`. */
export type CheckboxFieldProps = Omit<FieldBase, "error"> & {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** Caixa de marcar, com o rótulo ao lado. */
export function CheckboxField({
  path,
  label,
  hint,
  checked,
  onChange,
}: CheckboxFieldProps) {
  const id = useFieldId()(path);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex min-h-11 items-center gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={hint === undefined ? undefined : `${id}-hint`}
          className="size-5 shrink-0 accent-foreground outline-offset-2 focus-visible:outline-2 focus-visible:outline-foreground"
        />
        <label htmlFor={id} className="font-medium">
          {label}
        </label>
      </div>
      <FieldHint id={`${id}-hint`} hint={hint} />
    </div>
  );
}

/** Propriedades do `SelectField`. */
export type SelectFieldProps<T extends string> = FieldBase & {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
};

/** Lista de opções. */
export function SelectField<T extends string>({
  path,
  label,
  hint,
  error,
  value,
  onChange,
  options,
}: SelectFieldProps<T>) {
  const id = useFieldId()(path);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          const chosen = options.find(
            (option) => option.value === event.target.value,
          );
          if (chosen !== undefined) {
            onChange(chosen.value);
          }
        }}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={describedBy(
          hint !== undefined && `${id}-hint`,
          error !== undefined && `${id}-error`,
        )}
        className={inputClass}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldHint id={`${id}-hint`} hint={hint} />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

/** Propriedades do `MonthField`. */
export type MonthFieldProps = FieldBase & {
  /** Mês em `AAAA-MM`. */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

/**
 * Campo de mês. Nos navegadores sem seletor de mês, vira um campo de texto, e
 * a dica do formato continua valendo.
 */
export function MonthField({
  path,
  label,
  hint,
  error,
  value,
  onChange,
  disabled,
}: MonthFieldProps) {
  const id = useFieldId()(path);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
      <input
        id={id}
        type="month"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={adminMessages.editor.monthPlaceholder}
        pattern="\d{4}-\d{2}"
        disabled={disabled}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={describedBy(
          hint !== undefined && `${id}-hint`,
          error !== undefined && `${id}-error`,
        )}
        className={inputClass}
      />
      <FieldHint id={`${id}-hint`} hint={hint} />
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}
