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
    "O painel está indisponível no momento. Tente de novo mais tarde.",
  logout: "Sair",
  nav: {
    label: "Seções do painel",
    home: "Visão geral",
    profile: "Perfil",
    blocks: "Blocos",
    resume: "Currículo",
    history: "Histórico",
  },
  login: {
    title: "Entrar",
    heading: "Entrar no painel",
    username: "Usuário",
    password: "Senha",
    verification: "Verificação de segurança",
    submit: "Entrar",
    submitting: "Entrando…",
    invalidInput: "Preencha o usuário e a senha e conclua a verificação.",
    turnstileRejected: "A verificação de segurança falhou. Tente de novo.",
    turnstileUnavailable:
      "Não foi possível fazer a verificação de segurança agora. Tente de novo em instantes.",
    invalidCredentials: "Usuário ou senha incorretos.",
    rateLimited: (minutes: number) =>
      `Muitas tentativas. Tente de novo em ${minutes} ${minutes === 1 ? "minuto" : "minutos"}.`,
  },
  home: {
    title: "Visão geral",
    heading: "Visão geral",
    draft: "Rascunho",
    noDraft: "Ainda não há rascunho.",
    draftSavedAt: (time: string) => `Salvo em ${time}.`,
    draftFromNewerVersion:
      "Este rascunho foi salvo por uma versão mais recente do painel e não abre nesta. Nada foi perdido.",
    draftUnpublished: "Tem alterações que ainda não foram publicadas.",
    draftSameAsPublished: "Igual ao que está publicado.",
    published: "Publicado",
    nothingPublished: "Nada foi publicado ainda.",
    publishedAt: (revision: number, time: string) =>
      `Revisão ${revision}, publicada em ${time}.`,
    gettingStarted:
      "Para começar, importe um arquivo de conteúdo ou preencha o perfil e os blocos.",
  },
  publish: {
    heading: "Publicar",
    description:
      "Publicar coloca o rascunho no ar: o site muda na próxima visita, sem deploy. Cada publicação fica no histórico.",
    nothingToPublish: "Não há alterações para publicar.",
    problemsIntro: (count: number) =>
      count === 1
        ? "Falta corrigir 1 ponto antes de publicar:"
        : `Falta corrigir ${count} pontos antes de publicar:`,
    moreProblems: (count: number) =>
      `E mais ${count} ${count === 1 ? "ponto" : "pontos"}.`,
    note: "Nota (opcional)",
    noteHint: "Aparece no histórico, como “Inglês revisado”.",
    submit: "Publicar",
    publishing: "Publicando…",
    confirmTitle: "Publicar o rascunho?",
    confirmMessage:
      "O site passa a mostrar o conteúdo do rascunho. A publicação anterior continua no histórico.",
    confirm: "Publicar",
    published: (revision: number, time: string) =>
      `Revisão ${revision} publicada às ${time}.`,
    unchanged: "O rascunho já é igual ao que está publicado.",
    incomplete:
      "O rascunho mudou e tem pontos a corrigir. Recarregue a página para ver a lista.",
    conflict:
      "O rascunho mudou em outra aba ou janela. Recarregue a página para publicar a versão mais recente.",
    newerVersion:
      "O rascunho foi salvo por uma versão mais recente do painel e não pode ser publicado por esta.",
    resumeFailed:
      "Não foi possível gerar o currículo, e nada foi publicado. Tente de novo; se continuar, confira os logs do servidor.",
    unexpected:
      "Não foi possível publicar agora. Confira a conexão e tente de novo.",
  },
  preview: {
    title: "Pré-visualização",
    links: "Pré-visualizar o rascunho:",
    portuguese: "em português",
    english: "em inglês",
    banner:
      "Pré-visualização do rascunho: o site só mostra isto depois de publicar.",
    back: "Voltar ao painel",
    switchToPortuguese: "Ver em português",
    switchToEnglish: "Ver em inglês",
  },
  problems: {
    profile: "Perfil",
    resume: "Currículo",
    blocks: "Blocos",
  },
  history: {
    title: "Histórico",
    heading: "Histórico",
    intro:
      "Cada publicação fica guardada aqui. Restaurar uma revisão a transforma no rascunho, para revisar e publicar de novo; o site só muda quando você publicar.",
    empty: "Nada foi publicado ainda.",
    revision: (revision: number) => `Revisão ${revision}`,
    publishedAt: (time: string) => `Publicada em ${time}`,
    live: "No ar",
    newerVersion:
      "Salva por uma versão mais recente do painel: não abre nesta.",
    download: "Baixar (YAML)",
    downloadLabel: (revision: number) => `Baixar (YAML): revisão ${revision}`,
    restore: "Restaurar como rascunho",
    restoreLabel: (revision: number) =>
      `Restaurar como rascunho: revisão ${revision}`,
    restoring: "Restaurando…",
    confirmTitle: (revision: number) => `Restaurar a revisão ${revision}?`,
    confirmMessage:
      "O rascunho atual será trocado por esta revisão. O que está publicado continua no ar até a próxima publicação.",
    confirm: "Restaurar",
    restored: (revision: number) =>
      `A revisão ${revision} virou o rascunho. Revise e publique quando quiser.`,
    notFound: "Esta revisão não existe mais.",
    limit: (count: number) =>
      `Mostrando as ${count} publicações mais recentes.`,
  },
  backup: {
    heading: "Cópia de segurança",
    description:
      "O arquivo exportado é a cópia do conteúdo fora do servidor. Exporte depois de mudanças grandes.",
    export: "Exportar conteúdo (YAML)",
    importLabel: "Importar conteúdo (YAML ou JSON)",
    importHint:
      "Substitui o rascunho pelo conteúdo do arquivo. Item escrito sem id ganha um. O site só muda quando você publicar.",
    importSubmit: "Importar",
    importing: "Importando…",
    confirmTitle: "Substituir o rascunho?",
    confirmMessage: (fileName: string) =>
      `O rascunho atual será trocado pelo conteúdo de ${fileName}. O que está publicado continua no ar.`,
    confirm: "Substituir rascunho",
    confirmFirstTitle: "Importar o conteúdo?",
    confirmFirstMessage: (fileName: string) =>
      `O conteúdo de ${fileName} vira o rascunho. O site só muda quando você publicar.`,
    confirmFirst: "Importar",
    imported: "Conteúdo importado. Revise o rascunho antes de publicar.",
    noFile: "Escolha um arquivo YAML ou JSON.",
    tooLarge: "O arquivo passa de 1 MB, mais do que cabe num portfólio.",
    unreadable: (line?: number) =>
      line === undefined
        ? "O arquivo não é um YAML válido."
        : `O arquivo não é um YAML válido. Confira a linha ${line}.`,
    fileHeader: [
      "Conteúdo do portfólio, exportado pelo painel. Tem os campos privados, como o telefone:",
      "não publique este arquivo. Para voltar com ele, use Importar, na visão geral do painel.",
      "Item novo pode ficar sem id: ele ganha um na importação.",
    ],
    invalidDocument: "O arquivo não segue o formato do conteúdo do portfólio:",
    newerVersion:
      "O arquivo foi exportado por uma versão mais recente do painel e não pode ser importado nesta.",
    moreIssues: (count: number) =>
      `E mais ${count} ${count === 1 ? "problema" : "problemas"}.`,
  },
  editor: {
    unsaved: "Alterações não salvas",
    saving: "Salvando…",
    savedAt: (time: string) => `Salvo às ${time}`,
    save: "Salvar",
    discard: "Descartar alterações",
    discardTitle: "Descartar as alterações?",
    discardMessage: "A página volta a mostrar o que está salvo.",
    discardConfirm: "Descartar",
    conflict:
      "O conteúdo foi alterado em outra aba ou janela. Recarregue a página para continuar; o que foi feito aqui não foi salvo.",
    reload: "Recarregar",
    invalid: "Corrija os campos marcados para salvar.",
    newerVersion:
      "O rascunho foi salvo por uma versão mais recente do painel. Recarregue a página.",
    unexpected:
      "Não foi possível salvar agora. Confira a conexão e tente de novo.",
    leaveTitle: "Sair sem salvar?",
    leaveMessage: "As alterações desta página ainda não foram salvas.",
    leaveConfirm: "Sair sem salvar",
    stay: "Continuar editando",
    cancel: "Cancelar",
    moveUp: (name: string) => `Mover ${name} para cima`,
    moveDown: (name: string) => `Mover ${name} para baixo`,
    moved: (name: string, position: number, total: number) =>
      `${name} está agora na posição ${position} de ${total}.`,
    duplicate: "Duplicar",
    duplicateLabel: (name: string) => `Duplicar ${name}`,
    remove: "Remover",
    removeLabel: (name: string) => `Remover ${name}`,
    removeTitle: (name: string) => `Remover ${name}?`,
    removeItemMessage:
      "O item sai do rascunho quando você salvar. O que está publicado continua no ar até a próxima publicação.",
    edit: "Editar",
    editLabel: (name: string) => `Editar ${name}`,
    expand: (name: string) => `Abrir ${name}`,
    collapse: (name: string) => `Fechar ${name}`,
    visible: "Visível no site",
    inResume: "No currículo",
    inResumeHint: "Entra no currículo em PDF e DOCX.",
    hidden: "Oculto no site",
    missingTranslation: "Tradução faltando",
    portuguese: "Português",
    english: "Inglês",
    markdownHint:
      "Aceita **negrito**, *itálico*, `código`, [links](https://exemplo.com) e listas com “- ” no começo da linha. Separe os parágrafos com uma linha em branco.",
    keywordsHint:
      "Escreva e tecle Enter. Use a grafia do mercado, como “TypeScript” e “PostgreSQL”.",
    keywordsAdd: "Adicionar",
    keywordRemove: (keyword: string) => `Remover ${keyword}`,
    keywordDuplicate: (keyword: string) => `${keyword} já está na lista.`,
    monthPlaceholder: "AAAA-MM",
  },
  fields: {
    fullName: "Nome completo",
    fullNameHint: "Vai para o currículo.",
    displayName: "Nome de exibição",
    displayNameHint: "Aparece no topo do site.",
    headline: "Título profissional",
    location: "Local",
    publicEmail: "E-mail público",
    publicEmailHint:
      "Vai para o currículo. No site, o contato é pelo formulário.",
    phone: "Telefone",
    phoneHint:
      "Fica só no painel: nunca aparece no site nem no currículo público.",
    links: "Links",
    linkKind: "Tipo",
    linkUrl: "Endereço",
    linkLabel: "Nome do link",
    addLink: "Adicionar link",
    blockTitle: "Título no site",
    blockTitleHint: (defaultTitle: string) =>
      `Deixe vazio para usar “${defaultTitle}”.`,
    body: "Texto",
    title: "Título",
    company: "Empresa",
    companyUrl: "Site da empresa",
    role: "Cargo",
    workMode: "Modo de trabalho",
    start: "Início",
    end: "Fim",
    currentJob: "É o emprego atual",
    summary: "Resumo",
    projectSummaryHint: "Uma frase, que aparece no cartão do projeto.",
    highlights: "Destaques",
    highlightsHint:
      "Comece cada destaque por um verbo no passado. Os marcados entram no currículo.",
    highlight: (position: number) => `Destaque ${position}`,
    addHighlight: "Adicionar destaque",
    technologies: "Tecnologias",
    name: "Nome",
    description: "Descrição",
    repositoryUrl: "Código",
    repositoryUrlHint: "Deixe vazio se o código não for público.",
    websiteUrl: "Site",
    skills: "Habilidades",
    degree: "Curso",
    institution: "Instituição",
    inProgress: "Em andamento",
    expectedEnd: "Previsão de conclusão",
    notes: "Observações",
    issuer: "Quem concedeu",
    date: "Data",
    level: "Nível",
    resumeSummary: "Resumo profissional",
    resumeSummaryHint:
      "De 3 a 4 linhas, mais direto que o “Sobre”. Abre o currículo.",
  },
  workModes: {
    none: "Não informar",
    onsite: "Presencial",
    hybrid: "Híbrido",
    remote: "Remoto",
  },
  linkKinds: {
    linkedin: "LinkedIn",
    github: "GitHub",
    website: "Site",
    x: "X",
    bluesky: "Bluesky",
    instagram: "Instagram",
    youtube: "YouTube",
    other: "Outro",
  },
  blockTypes: {
    about: "Sobre",
    experience: "Experiência",
    projects: "Projetos",
    skills: "Habilidades",
    education: "Formação",
    awards: "Prêmios",
    languages: "Idiomas",
    text: "Texto livre",
  },
  items: {
    experience: {
      add: "Adicionar experiência",
      untitled: "Experiência sem nome",
    },
    projects: { add: "Adicionar projeto", untitled: "Projeto sem nome" },
    skills: { add: "Adicionar grupo", untitled: "Grupo sem nome" },
    education: { add: "Adicionar curso", untitled: "Curso sem nome" },
    awards: { add: "Adicionar prêmio", untitled: "Prêmio sem nome" },
    languages: { add: "Adicionar idioma", untitled: "Idioma sem nome" },
  },
  profile: {
    title: "Perfil",
    heading: "Perfil",
    intro:
      "Quem você é e como entrar em contato. O nome de exibição e o título abrem o site.",
    identity: "Identidade",
    photo: "Foto",
    photoHint:
      "JPEG, PNG ou WebP, até 15 MB. O servidor apaga os dados da câmera (como o local), reduz o tamanho e guarda em WebP.",
    photoPreview: "Prévia da foto do perfil",
    photoNone: "Sem foto: o topo do site ocupa a largura toda com o texto.",
    photoChoose: "Escolher foto",
    photoUploading: "Enviando a foto…",
    photoUploaded:
      "Foto enviada. Salve o perfil para ela entrar no rascunho e publique para ir ao site.",
    photoRemove: "Remover foto",
    photoTooLarge: "A foto passa de 15 MB. Escolha um arquivo menor.",
    photoInvalid: "O arquivo não é uma imagem que o servidor consiga ler.",
    photoUnavailable:
      "Não foi possível enviar a foto agora. Confira a conexão e tente de novo.",
    contact: "Contato",
    private: "Só no painel",
  },
  blocks: {
    title: "Blocos",
    heading: "Blocos",
    intro:
      "Cada bloco é uma seção do site, nesta ordem. Um bloco oculto continua no rascunho, mas não aparece no site.",
    empty: "Nenhum bloco ainda. Adicione o primeiro abaixo.",
    itemCount: (total: number, visible: number) =>
      total === 0
        ? "Sem itens"
        : `${total} ${total === 1 ? "item" : "itens"}, ${visible} ${visible === 1 ? "visível" : "visíveis"}`,
    customTitle: (title: string) => `No site: “${title}”`,
    newBlock: "Novo",
    saveToEdit: "Salve para editar",
    added: (name: string) =>
      `${name} entrou no fim da lista. Salve para editar o conteúdo.`,
    addType: "Tipo de bloco",
    add: "Adicionar bloco",
    removeBlockMessage: (items: number) =>
      items === 0
        ? "O bloco sai do rascunho quando você salvar. O que está publicado continua no ar até a próxima publicação."
        : `O bloco e ${items === 1 ? "o item dele saem" : `os ${items} itens dele saem`} do rascunho quando você salvar. O que está publicado continua no ar até a próxima publicação.`,
    backToList: "Blocos",
    breadcrumb: "Caminho",
    settings: "Bloco",
    items: "Itens",
    notFound: "Este bloco não existe mais no rascunho.",
  },
  resume: {
    title: "Currículo",
    heading: "Currículo",
    intro:
      "O currículo sai do mesmo conteúdo do site, em PDF e DOCX para quem lê, e em Markdown e JSON Resume para assistentes de IA e sistemas de triagem. O que entra nele é marcado em cada item, em “No currículo”.",
    downloadsHeading: "Baixar o rascunho",
    downloadsIntro:
      "Gerados agora, a partir do rascunho salvo, para conferir antes de publicar. O site passa a oferecer os arquivos novos quando você publica.",
    portuguese: "Português",
    english: "Inglês",
    publicVersion: "Sem telefone, como no site",
    fullVersion: "Completo, com telefone",
    fullVersionHint:
      "A versão completa é gerada só para você baixar e nunca vai para o site.",
    noPhone:
      "Para gerar a versão completa, com telefone, preencha o telefone no Perfil.",
    /** Acrescentado ao nome do arquivo, como `ana-curriculo-rascunho.pdf`. */
    draftSuffix: "rascunho",
    fullSuffix: "completo",
    /** O nome de cada formato, nos botões dos arquivos do rascunho. */
    formats: {
      pdf: "PDF",
      docx: "DOCX",
      md: "Markdown",
      json: "JSON Resume",
    },
  },
} as const;
