/**
 * Textos fixos da interface em português, o idioma padrão. O tipo deste objeto
 * é o contrato dos outros dicionários.
 *
 * Toda folha é texto. Onde entra um valor, o texto traz `{nome}`, preenchido
 * por `fillTemplate`; onde há plural, as formas `one` e `other` das
 * `Intl.PluralRules`.
 */
export const ptBR = {
  metadata: {
    title: "Portfólio em construção",
    description: "Portfólio de desenvolvimento de software, em construção.",
    siteDescription: "Portfólio de {name}: {headline} em {location}.",
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
    contact: "Contato",
  },
  /** Âncoras das seções na URL, como `/pt#experiencia`. */
  anchors: {
    about: "sobre",
    experience: "experiencia",
    projects: "projetos",
    skills: "habilidades",
    education: "formacao",
    awards: "premios",
    languages: "idiomas",
    contact: "contato",
  },
  /** O que cada seção conta, acima do título. */
  counts: {
    experience: { one: "{n} experiência", other: "{n} experiências" },
    projects: { one: "{n} projeto", other: "{n} projetos" },
    skills: { one: "{n} habilidade", other: "{n} habilidades" },
    education: { one: "{n} curso", other: "{n} cursos" },
    awards: { one: "{n} prêmio", other: "{n} prêmios" },
    languages: { one: "{n} idioma", other: "{n} idiomas" },
  },
  site: {
    skipToContent: "Pular para o conteúdo",
    navigation: "Seções do site",
    menu: "Menu",
    contactCta: "Fale comigo",
    seeProjects: "Ver projetos",
    present: "atual",
    expectedEnd: "previsão: {date}",
    period: "{start} — {end}",
    technologies: "Tecnologias",
    highlights: "Destaques",
    details: "Mais detalhes",
    code: "Código",
    website: "Site",
    companyWebsite: "Site da {company}",
    opensInNewTab: "(abre em outra aba)",
    contactText:
      "Para falar comigo, escreva para o e-mail abaixo ou me encontre nas redes.",
    emailLabel: "E-mail",
    linksLabel: "Redes",
    footerNote: "Feito com Next.js, num servidor próprio.",
    backToTop: "Voltar ao topo",
  },
  /** Nome de cada tipo de link do perfil; o tipo "outro" usa o nome dado no painel. */
  links: {
    linkedin: "LinkedIn",
    github: "GitHub",
    website: "Site",
    x: "X",
    bluesky: "Bluesky",
    instagram: "Instagram",
    youtube: "YouTube",
  },
  workModes: {
    onsite: "Presencial",
    hybrid: "Híbrido",
    remote: "Remoto",
  },
  theme: {
    system: "Tema do sistema",
    light: "Tema claro",
    dark: "Tema escuro",
    toggle: "{current}. Trocar para: {next}",
  },
  language: {
    label: "Idioma",
    switchTo: "Read in English",
    short: "EN",
  },
  notFound: {
    title: "Página não encontrada",
    body: "O endereço não existe ou mudou.",
    home: "Ir para o início",
  },
};

/** Estrutura de um dicionário: as mesmas chaves em todos os idiomas. */
export type Dictionary = typeof ptBR;
