"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createContext,
  use,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type FormEvent,
  type ReactNode,
} from "react";

import { adminMessages } from "@/i18n/admin";

import { ConfirmDialog } from "./confirm-dialog";

const messages = adminMessages.editor;

type UnsavedChanges = {
  /**
   * Marca (ou desmarca) um editor com alterações não salvas, com a função que
   * as descarta.
   */
  setDirty: (editor: string, discard: (() => void) | null) => void;
  /** Se algum editor da página tem alterações não salvas, agora. */
  isDirty: () => boolean;
  /** Pergunta se a pessoa quer sair sem salvar e, se ela confirmar, segue. */
  requestLeave: (proceed: () => void) => void;
  /** Descarta as alterações de todos os editores e segue, sem perguntar. */
  leaveWithoutSaving: (proceed: () => void) => void;
};

const UnsavedChangesContext = createContext<UnsavedChanges>({
  setDirty: () => {},
  isDirty: () => false,
  requestLeave: (proceed) => proceed(),
  leaveWithoutSaving: (proceed) => proceed(),
});

/**
 * Guarda quais editores da página têm alterações não salvas e pergunta antes
 * de sair deles: nos links do painel (`GuardedLink`), no Sair e ao fechar ou
 * recarregar a aba. Confirmar a saída descarta as alterações: o Next mantém a
 * página escondida, e ela não pode voltar com o que a pessoa descartou.
 *
 * O botão Voltar do navegador não passa por aqui: o roteador do Next não
 * permite cancelar essa navegação, e a página volta como estava.
 */
export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  // Os editores com alterações não salvas, e a função que descarta as de
  // cada um. Fica num ref para ser lido e limpo na hora, no mesmo clique, antes
  // de o React desenhar de novo; o estado só liga e desliga o aviso da aba.
  const editorsRef = useRef(new Map<string, () => void>());
  const [dirty, setDirtyFlag] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);

  useEffect(() => {
    if (!dirty) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => {
      if (editorsRef.current.size > 0) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const value = useMemo<UnsavedChanges>(() => {
    const editors = editorsRef.current;
    return {
      setDirty: (editor, discard) => {
        if (discard === null) {
          editors.delete(editor);
        } else {
          editors.set(editor, discard);
        }
        setDirtyFlag(editors.size > 0);
      },
      isDirty: () => editors.size > 0,
      requestLeave: (proceed) => setPendingLeave(() => proceed),
      leaveWithoutSaving: (proceed) => {
        for (const discard of [...editors.values()]) {
          discard();
        }
        editors.clear();
        setDirtyFlag(false);
        proceed();
      },
    };
  }, []);

  return (
    <UnsavedChangesContext value={value}>
      {children}
      <ConfirmDialog
        open={pendingLeave !== null}
        title={messages.leaveTitle}
        message={messages.leaveMessage}
        confirmLabel={messages.leaveConfirm}
        cancelLabel={messages.stay}
        tone="danger"
        onCancel={() => setPendingLeave(null)}
        onConfirm={() => {
          setPendingLeave(null);
          value.leaveWithoutSaving(pendingLeave ?? (() => {}));
        }}
      />
    </UnsavedChangesContext>
  );
}

/**
 * Devolve a função que descarta as alterações da página e segue em frente,
 * sem perguntar. Serve para quando a própria tela já explicou o que vai
 * acontecer, como o Recarregar depois de um conflito.
 *
 * @returns A função; ela recebe o que fazer depois de descartar.
 */
export function useLeaveWithoutSaving(): (proceed: () => void) => void {
  return use(UnsavedChangesContext).leaveWithoutSaving;
}

/**
 * Avisa o `UnsavedChangesProvider` se o editor tem alterações não salvas.
 *
 * @param editor - Nome do editor, único na página.
 * @param dirty - Se há alterações não salvas.
 * @param discard - Descarta as alterações, se a pessoa confirmar a saída.
 */
export function useUnsavedChanges(
  editor: string,
  dirty: boolean,
  discard: () => void,
): void {
  const { setDirty } = use(UnsavedChangesContext);
  // A função muda a cada renderização; o provedor guarda uma que chama sempre
  // a mais recente.
  const discardRef = useRef(discard);
  useLayoutEffect(() => {
    discardRef.current = discard;
  });
  useEffect(() => {
    if (!dirty) {
      return;
    }
    const callLatest = () => discardRef.current();
    setDirty(editor, callLatest);
    return () => setDirty(editor, null);
  }, [editor, dirty, setDirty]);
}

/** Propriedades do `GuardedLink`: as do `Link`, com `href` em texto. */
export type GuardedLinkProps = Omit<
  ComponentProps<typeof Link>,
  "href" | "onNavigate"
> & { href: string };

/** `Link` do painel que pergunta antes de sair de uma página com alterações não salvas. */
export function GuardedLink({ href, ...props }: GuardedLinkProps) {
  const { isDirty, requestLeave } = use(UnsavedChangesContext);
  const router = useRouter();
  return (
    <Link
      href={href}
      onNavigate={(event) => {
        if (isDirty()) {
          event.preventDefault();
          requestLeave(() => router.push(href));
        }
      }}
      {...props}
    />
  );
}

/**
 * Devolve o `onSubmit` de um formulário que sai da página, como o Sair: com
 * alterações não salvas, ele pergunta antes de enviar.
 *
 * @returns O tratador do envio.
 */
export function useGuardedSubmit(): (
  event: FormEvent<HTMLFormElement>,
) => void {
  const { isDirty, requestLeave } = use(UnsavedChangesContext);
  return (event) => {
    if (!isDirty()) {
      return;
    }
    event.preventDefault();
    const form = event.currentTarget;
    // Confirmado, o envio repete, já sem alterações pendentes.
    requestLeave(() => form.requestSubmit());
  };
}
