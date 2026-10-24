/** Estado do formulário de login, devolvido pela Server Action. */
export type LoginFormState = {
  /** Mensagem de erro da última tentativa, ou `null` antes da primeira. */
  error: string | null;
  /** Usuário digitado, para não ser preciso digitá-lo de novo. */
  username: string;
  /**
   * Conta as respostas do servidor. O token do Turnstile vale uma vez só, e o
   * formulário troca o widget a cada resposta para gerar um novo.
   */
  attempt: number;
};

/** Estado antes da primeira tentativa. */
export const INITIAL_LOGIN_STATE: LoginFormState = {
  error: null,
  username: "",
  attempt: 0,
};
