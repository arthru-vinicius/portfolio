/**
 * Textos do painel. O painel é só em pt-BR (o usuário é o mantenedor), mas os
 * textos ficam juntos aqui, como os dicionários do site, e não soltos nos
 * componentes.
 */
export const adminMessages = {
  title: "Painel do portfólio",
  skipToContent: "Pular para o conteúdo",
  loading: "Carregando…",
  unavailable:
    "O painel está indisponível: falta configuração no servidor. Confira o log.",
  logout: "Sair",
  login: {
    title: "Entrar",
    heading: "Entrar no painel",
    username: "Usuário",
    password: "Senha",
    verification: "Verificação de segurança",
    submit: "Entrar",
    submitting: "Entrando…",
    invalidInput: "Preencha o usuário e a senha e conclua a verificação.",
    turnstileRejected:
      "A verificação de segurança não passou. Ela foi refeita; tente de novo.",
    turnstileUnavailable:
      "Não foi possível fazer a verificação de segurança agora. Tente de novo em instantes.",
    invalidCredentials: "Usuário ou senha incorretos.",
    rateLimited: (minutes: number) =>
      `Muitas tentativas. Tente de novo em ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`,
  },
  home: {
    title: "Situação",
    heading: "Situação do conteúdo",
    sessionUntil: (time: string) => `Sessão válida até ${time}.`,
    draft: "Rascunho",
    noDraft: "Ainda não há rascunho.",
    draftSavedAt: (time: string) => `Salvo em ${time}.`,
    draftFromNewerVersion:
      "O rascunho foi salvo por uma versão mais nova do painel e não pode ser aberto por esta. Ele continua no banco, intacto.",
    published: "Publicado",
    nothingPublished: "Nada foi publicado ainda.",
    publishedAt: (revision: number, time: string) =>
      `Revisão ${revision}, publicada em ${time}.`,
  },
} as const;
