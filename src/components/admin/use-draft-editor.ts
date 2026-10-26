"use client";

import {
  useEffect,
  useEffectEvent,
  useId,
  useState,
  useTransition,
} from "react";

import type { FieldIssue, SaveResult } from "@/content/save-result";

import { fieldId } from "./fields";
import { useUnsavedChanges } from "./unsaved-changes";

/** Por que o último salvamento não deu certo. */
export type SaveFailure =
  "conflict" | "invalid" | "newer-version" | "unexpected";

/** Estado de um editor do painel, devolvido por `useDraftEditor`. */
export type DraftEditor<T> = {
  /** O valor em edição. */
  value: T;
  /** Muda o valor em edição. */
  update: (change: (current: T) => T) => void;
  /** Se há alterações não salvas. */
  dirty: boolean;
  /** Se está salvando agora. */
  pending: boolean;
  /** Hora do último salvamento nesta página, em ISO 8601. */
  savedAt: string | null;
  failure: SaveFailure | null;
  /** Erros de validação, pelo caminho do campo. */
  errors: Readonly<Record<string, string>>;
  /**
   * Prefixo dos `id`s dos campos deste editor (`FieldScope`): o Next mantém
   * até três páginas visitadas no documento, escondidas, e dois editores de
   * bloco não podem repetir os mesmos `id`s.
   */
  fieldScope: string;
  save: () => void;
  /** Volta ao que está salvo. */
  discard: () => void;
};

/** Opções do `useDraftEditor`. */
export type DraftEditorOptions<T> = {
  /** Nome do editor, único na página. */
  name: string;
  /** O valor salvo, como o servidor mandou nesta renderização. */
  serverValue: T;
  /** A versão do valor salvo, como o servidor mandou. */
  serverVersion: string;
  /** Chama a Server Action que grava o valor. */
  save: (version: string, value: T) => Promise<SaveResult<T>>;
  /** Validação local, com o mesmo schema do servidor. */
  validate: (value: T) => FieldIssue[];
};

function byPath(issues: readonly FieldIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const { path, message } of issues) {
    errors[path] ??= message;
  }
  return errors;
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * Estado de um editor do painel: o valor em edição, o que está salvo, a
 * validação e o salvamento com concorrência otimista pela versão da parte
 * editada.
 *
 * - Valida antes de enviar, com o mesmo schema do servidor, e leva o foco ao
 *   primeiro campo com erro. Depois de uma tentativa com erro, a validação
 *   acompanha cada mudança.
 * - Quando o servidor manda uma versão nova da parte (salva aqui ou em outra
 *   aba) e não há alterações pendentes, a tela passa a mostrar a versão nova.
 * - Avisa o `UnsavedChangesProvider` enquanto houver alterações não salvas.
 * - Ctrl+S (ou Cmd+S) salva.
 */
export function useDraftEditor<T>({
  name,
  serverValue,
  serverVersion,
  save,
  validate,
}: DraftEditorOptions<T>): DraftEditor<T> {
  const fieldScope = useId();
  const [value, setValue] = useState(serverValue);
  const [saved, setSaved] = useState({
    value: serverValue,
    version: serverVersion,
  });
  const [seenVersion, setSeenVersion] = useState(serverVersion);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [failure, setFailure] = useState<SaveFailure | null>(null);
  const [validating, setValidating] = useState(false);
  const [serverIssues, setServerIssues] = useState<FieldIssue[]>([]);
  // Um objeto novo a cada pedido: pedir o foco duas vezes no mesmo campo
  // também leva o foco até ele.
  const [focusRequest, setFocusRequest] = useState<{ path: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const dirty = !same(value, saved.value);

  // Uma versão nova vinda do servidor: o padrão do React para ajustar o
  // estado quando uma propriedade muda, durante a renderização.
  if (serverVersion !== seenVersion) {
    setSeenVersion(serverVersion);
    if (!dirty) {
      setValue(serverValue);
      setSaved({ value: serverValue, version: serverVersion });
    }
  }

  const issues = validating ? validate(value) : serverIssues;

  function discard() {
    setValue(saved.value);
    setValidating(false);
    setServerIssues([]);
    setFailure(null);
  }
  useUnsavedChanges(name, dirty, discard);

  useEffect(() => {
    if (focusRequest === null) {
      return;
    }
    const field = document.getElementById(
      fieldId(fieldScope, focusRequest.path),
    );
    // No centro da tela, e não embaixo da barra fixa de salvar.
    field?.scrollIntoView({ block: "center" });
    field?.focus({ preventScroll: true });
  }, [focusRequest, fieldScope]);

  const requestFocus = (found: readonly FieldIssue[]) => {
    const [first] = found;
    if (first !== undefined) {
      setFocusRequest({ path: first.path });
    }
  };

  function saveNow() {
    if (pending || !dirty) {
      return;
    }
    const found = validate(value);
    if (found.length > 0) {
      setValidating(true);
      setFailure("invalid");
      requestFocus(found);
      return;
    }
    const sent = value;
    startTransition(async () => {
      try {
        const result = await save(saved.version, sent);
        if (result.ok) {
          setSaved({ value: result.saved, version: result.version });
          setSavedAt(result.savedAt);
          // O servidor devolve o valor normalizado (sem espaços nas pontas).
          // Se nada mudou durante o envio, a tela passa a mostrar esse valor.
          setValue((current) => (same(current, sent) ? result.saved : current));
          setValidating(false);
          setServerIssues([]);
          setFailure(null);
        } else if (result.reason === "invalid") {
          setServerIssues(result.issues);
          setFailure("invalid");
          requestFocus(result.issues);
        } else {
          setFailure(result.reason);
        }
      } catch (error) {
        // Rede fora do ar, ou uma versão nova do servidor que não conhece mais
        // esta action: recarregar resolve os dois.
        console.error("[painel] falha ao salvar", error);
        setFailure("unexpected");
      }
    });
  }

  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveNow();
    }
  });
  useEffect(() => {
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  return {
    value,
    update: (change) => setValue(change),
    dirty,
    pending,
    savedAt,
    failure,
    errors: byPath(issues),
    fieldScope,
    save: saveNow,
    discard,
  };
}
