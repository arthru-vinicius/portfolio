/**
 * Textos fixos da interface em português, o idioma padrão. O tipo deste objeto
 * é o contrato dos outros dicionários.
 */
export const ptBR = {
  metadata: {
    title: "Portfólio em construção",
    description: "Portfólio de desenvolvimento de software, em construção.",
  },
  placeholder: {
    title: "Portfólio em construção",
    body: "Este site está sendo construído. Volte em breve.",
  },
  /** Títulos padrão das seções; cada bloco pode ter um título próprio. */
  sections: {
    about: "Sobre",
    experience: "Experiência",
    projects: "Projetos",
    skills: "Habilidades",
    education: "Formação",
    awards: "Prêmios",
    languages: "Idiomas",
  },
};

/** Estrutura de um dicionário: as mesmas chaves em todos os idiomas. */
export type Dictionary = typeof ptBR;
