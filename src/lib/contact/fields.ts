/**
 * Os campos do formulário de contato e os limites deles. Ficam num módulo
 * próprio, sem nada do servidor, porque o formulário (no navegador) e a
 * validação (no servidor) usam os mesmos valores.
 */

/** Limites dos campos, os mesmos do formulário e do relay de e-mail. */
export const contactLimits = { name: 100, email: 254, message: 5000 } as const;

/** Um campo do formulário que o visitante preenche. */
export type ContactField = "name" | "email" | "message";
