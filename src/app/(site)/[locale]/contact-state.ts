import type { ContactField } from "@/lib/contact/fields";

/** Estado do formulário de contato, devolvido pela Server Action. */
export type ContactFormState = {
  status: "idle" | "sent" | "error";
  /** Mensagem geral do último envio. */
  message: string | null;
  /** Campos com problema, para marcar e levar o foco ao primeiro. */
  invalidFields: ContactField[];
  /** O que foi digitado, para não se perder num erro. */
  values: Record<ContactField, string>;
  /**
   * Conta as respostas do servidor. O token do Turnstile vale uma vez só, e o
   * formulário troca o widget a cada resposta para gerar um novo.
   */
  attempt: number;
};

/** Estado antes do primeiro envio. */
export const INITIAL_CONTACT_STATE: ContactFormState = {
  status: "idle",
  message: null,
  invalidFields: [],
  values: { name: "", email: "", message: "" },
  attempt: 0,
};
