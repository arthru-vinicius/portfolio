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
    siteDescription:
      "Portfólio de {name}, {headline} em {location}: experiência, projetos e currículo em PDF e DOCX.",
    /** Texto alternativo da imagem de compartilhamento (Open Graph). */
    imageAlt: "{name}, {headline}, em {location}",
    /** O rótulo pequeno no alto da imagem de compartilhamento. */
    imageLabel: "Portfólio",
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
    photoAlt: "Foto de {name}",
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
      "Mande uma mensagem pelo formulário, escreva direto para o e-mail ou me encontre nas redes.",
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
  contactForm: {
    title: "Mande uma mensagem",
    name: "Nome",
    email: "Seu e-mail",
    message: "Mensagem",
    honeypot: "Deixe este campo vazio",
    verification: "Verificação de segurança",
    submit: "Enviar mensagem",
    sending: "Enviando…",
    sent: "Mensagem enviada. Respondo no seu e-mail assim que puder.",
    invalid: "Confira os campos marcados.",
    nameError: "Escreva o seu nome, com até 100 caracteres.",
    emailError: "Use um e-mail válido, como nome@exemplo.com.",
    messageError: "Escreva a mensagem, com até 5.000 caracteres.",
    rateLimited: {
      one: "Muitas mensagens em pouco tempo. Tente de novo em {n} minuto.",
      other: "Muitas mensagens em pouco tempo. Tente de novo em {n} minutos.",
    },
    turnstileRejected: "A verificação de segurança falhou. Tente de novo.",
    unavailable:
      "Não foi possível enviar agora. Tente de novo mais tarde ou escreva direto para o e-mail ao lado.",
  },
  workModes: {
    onsite: "Presencial",
    hybrid: "Híbrido",
    remote: "Remoto",
  },
  /**
   * O currículo em PDF e DOCX. Os títulos das seções são os que o mercado usa
   * e os sistemas de triagem (ATS) reconhecem; título criativo atrapalha.
   */
  resume: {
    sections: {
      summary: "Resumo",
      experience: "Experiência profissional",
      skills: "Habilidades",
      projects: "Projetos",
      education: "Formação acadêmica",
      awards: "Prêmios",
      languages: "Idiomas",
    },
    documentTitle: "{name} – Currículo",
    /** Nome do arquivo baixado, depois do nome da pessoa: `ana-exemplo-curriculo.pdf`. */
    fileName: "curriculo",
    present: "atual",
    period: "{start} – {end}",
    expectedEnd: "conclusão prevista em {date}",
    inProgress: "em andamento",
    technologies: "Tecnologias",
    code: "Código",
    website: "Site",
    /** O link do próprio portfólio, no Markdown e no JSON do currículo. */
    portfolio: "Portfólio",
  },
  /** O botão "Baixar currículo", no topo e no rodapé do site. */
  resumeDownload: {
    button: "Baixar currículo",
    /** O grupo dos arquivos deste idioma, escrito no próprio idioma. */
    language: "Em português",
    pdf: "PDF",
    docx: "Word (DOCX)",
  },
  /**
   * O `/llms.txt`, o resumo do site para assistentes de IA. Ele sai com os
   * títulos em inglês, e cada arquivo leva o nome escrito no idioma dele.
   */
  llms: {
    intro: "{headline} em {location}.",
    resumeHeading: "Currículo",
    pagesHeading: "Portfólio",
    profilesHeading: "Perfis",
    contactHeading: "Contato",
    email: "E-mail",
    contactSection: "Seção de contato do portfólio",
    home: "Portfólio em português",
    md: "Currículo em Markdown, em português",
    mdNote: "o mesmo texto do PDF, sem o layout",
    json: "Currículo em JSON Resume, em português",
    jsonNote: "dados no padrão do jsonresume.org",
    pdf: "Currículo em PDF, em português",
    docx: "Currículo em Word (DOCX), em português",
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
