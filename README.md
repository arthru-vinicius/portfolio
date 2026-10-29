# portfolio

Portfólio profissional do Arthur Vinicius, publicado em **https://portfolio.arthru.com**:
site em português e inglês, um painel para editar o conteúdo e o currículo em PDF e DOCX gerado
a partir dele.

> Em construção. O site, o painel e o currículo já funcionam; faltam o acabamento, a otimização
> para buscadores e o lançamento.

## Arquitetura

- **Next.js 16** (App Router e Cache Components), **React 19**, **TypeScript** estrito e
  **Tailwind CSS 4**.
- **Um container Docker** num servidor próprio ARM64, atrás de um Cloudflare Tunnel: nenhuma porta
  aberta no servidor.
- **SQLite** pelo módulo `node:sqlite` do próprio Node, com WAL e migrations aplicadas na subida.
- **Publicar sem deploy:** as páginas leem a última revisão publicada por uma camada em cache, e
  publicar invalida esse cache. O site muda em segundos.
- **Deploy por puxada:** o servidor acompanha a `main` e, quando o check `verify` de um commit fica
  verde, constrói a imagem, troca o container e volta sozinho para a versão anterior se o
  healthcheck falhar. Nenhuma credencial do servidor fica no GitHub.

```
GitHub (main + verify verde) ──▶ servidor: build, troca, rollback
                                              │
visitante ──▶ Cloudflare ──▶ túnel ──▶ container (Next.js + SQLite em /data)
```

## Rodando localmente

Requisitos: Node 22 (ver `.nvmrc`) e, para a imagem e os testes de ponta a ponta, Docker.

```bash
npm ci
npm run dev   # http://localhost:3000, com o banco em .data/portfolio.db
```

Na primeira vez, o `npm run dev` grava no banco local um documento fictício, como rascunho e
como revisão publicada. As variáveis do servidor estão em `.env.example`; fora de produção, os
valores padrão bastam para o site. Abra pelo `localhost`, e não por `127.0.0.1`: o `next dev`
recusa a conexão de recarregamento automático vinda de outra origem.

## Site

- **Endereços:** `/pt/` e `/en/`, a URL canônica de cada idioma, com a barra no fim: o link de
  uma seção fica `/pt/#experiencia`. A raiz `/` leva ao idioma do navegador (`Accept-Language`),
  com um redirecionamento temporário que varia com o cabeçalho, e `/pt` leva a `/pt/` com um
  permanente. Quem acrescenta a barra é o proxy, só nessas páginas: o Next não redireciona nada
  (`skipTrailingSlashRedirect`), para o `/api/health` nunca ser redirecionado. Um endereço que
  não existe dá um 404 nos dois idiomas (`global-not-found`).
- **Conteúdo:** a última revisão publicada, só com os blocos e itens visíveis, na ordem do
  painel. O menu do cabeçalho leva às seções principais (sobre, experiência, projetos, formação
  e prêmios); habilidades, idiomas e blocos livres ficam só na página, e o contato fica com o
  botão "Fale comigo", que no celular vira o último item do menu. Os textos longos aceitam um
  subconjunto de Markdown (parágrafos, listas, negrito, itálico, código e links), que vira
  elemento React, nunca HTML cru, e só aceita links `https:`, `http:` e `mailto:`.
- **Tema:** segue o do sistema, e um botão troca entre sistema, claro e escuro. A escolha fica no
  `localStorage`, sem cookie, e um script curto no `<head>` a aplica antes da primeira pintura.
- **Visual:** quase preto com verde, títulos grandes com degradê, uma rede de partículas atrás do
  topo, a faixa das habilidades e a barra de progresso da leitura. Os efeitos param fora da tela
  e com "reduzir movimento". As fontes (Plus Jakarta Sans e JetBrains Mono, licença OFL) vêm dos
  pacotes do Fontsource e são servidas pelo próprio site: o build não depende do Google Fonts.
- **Pré-visualização:** `/admin/preview/pt` e `/admin/preview/en` mostram o rascunho com os
  mesmos componentes do site, antes de publicar.
- **Foto:** enviada no perfil do painel (`POST /admin/photo`, com sessão e conferência de
  origem). O servidor gira a imagem pela orientação da câmera, descarta os metadados (EXIF, GPS),
  reduz para 480 e 960 px e grava em WebP em `/data/media`, com o resumo SHA-256 do conteúdo no
  nome. Por isso o arquivo nunca muda: `/media/<id>-<largura>.webp` sai com cache de um ano, e
  trocar de foto passa pelo rascunho e pela publicação, como o resto do conteúdo. O `sizes` da
  foto segue a largura dela em cada faixa de tela, e o celular comum baixa a de 480 px.
- **Contato:** formulário com nome, e-mail e mensagem. A Server Action pública confere o limite
  por IP (5 por hora), os campos, um campo-armadilha e o Turnstile, nessa ordem, e entrega a
  mensagem em texto puro ao relay de e-mail, que manda para o dono do site. Fora de produção, ou
  com `MAIL_RELAY_DRY_RUN=true`, o envio só vai para o log; em produção sem o relay, o
  formulário some e fica o e-mail. O Turnstile do formulário só carrega quando ele chega perto
  da tela: o widget baixa centenas de KB, e quem não rola até o contato não paga por eles.
- **Ícones:** `icon.svg`, `favicon.ico` e `apple-icon.png` em `src/app`, pela convenção de
  arquivos do Next.

## Currículo

O currículo sai do mesmo conteúdo do site, em PDF e DOCX, em português e inglês, num formato
pensado para recrutadores e sistemas de triagem (ATS).

- **O que entra:** o que está marcado "No currículo" em cada item (mesmo oculto no site), os
  destaques marcados e o resumo profissional da tela Currículo. As seções seguem a ordem do
  mercado, e não a do site: resumo, experiência, habilidades, projetos, formação, prêmios e
  idiomas. Experiências, cursos e prêmios vêm do mais recente para o mais antigo, e os meses saem
  como `MM/AAAA`.
- **Um modelo, dois arquivos:** `buildResumeModel` monta o currículo de um idioma em texto puro
  (o Markdown vira texto, e os links ficam com o endereço escrito), e `layoutResume` o dispõe em
  seções e linhas. Os dois geradores só desenham esse layout, então o PDF e o DOCX têm o mesmo
  texto, na mesma ordem.
- **PDF** (pdfkit): A4, uma coluna, sem tabela, imagem, cabeçalho ou rodapé de página. Texto real,
  com a Inter embutida (licença OFL, do Fontsource) e os acentos certos ao copiar. Sai marcado
  (tagged), com o idioma, título, autor, assunto e palavras-chave. Um caractere que a fonte não
  tem vira um equivalente, como `→` em `->`.
- **DOCX** (docx): para quem precisa de um arquivo editável ou de um formato que a plataforma da
  vaga aceite. Uma coluna, sem tabela nem caixa de texto, com os estilos do próprio Word (o nome
  em Título 1, as seções em Título 2, listas com marcador de verdade), Calibri, o idioma do texto
  e as propriedades do documento.
- **Quando é gerado:** ao publicar, antes de gravar a revisão; se o gerador falhar, nada é
  publicado. Os quatro arquivos vão para `/data/cv/<revisão>-v<formato>/`, e os da revisão
  anterior são apagados. Se faltarem (uma revisão de antes do currículo, uma versão nova do
  formato), a rota os gera no primeiro pedido.
- **Endereços fixos:** `/cv/curriculo.pdf`, `/cv/curriculo.docx`, `/cv/resume.pdf` e
  `/cv/resume.docx`. A resposta sai com `Cache-Control: no-cache` e a ETag da revisão: o
  navegador e a Cloudflare conferem antes de usar a cópia e nunca servem um currículo velho.
- **No site:** o botão "Baixar currículo", no topo e no rodapé, abre a lista dos arquivos nos dois
  idiomas, com o tamanho de cada um.
- **Telefone:** nunca vai para os arquivos públicos. A versão completa, com o telefone do campo
  privado, sai só no painel.

## Painel

O painel fica em `/admin`, com login por usuário e senha. Sem a configuração completa, ele
responde 503: nenhum segredo tem valor padrão, em nenhum ambiente.

**Para usar no `npm run dev`**, crie um `.env.local` a partir do `.env.example` e preencha:

- `ADMIN_USERNAME`: um nome qualquer;
- `ADMIN_PASSWORD_HASH`: o hash de uma senha local, gerado por
  `npm run --silent admin:hash-password` (a senha é lida sem eco);
- `ADMIN_SESSION_SECRET`: um texto com 32 caracteres ou mais.

O Turnstile do login usa as chaves de teste da Cloudflare, que sempre passam.

**No servidor**, os valores são segredos, gravados pelo mantenedor:

| Segredo | Para quê | Formato e como gerar |
|---|---|---|
| `ADMIN_USERNAME` | usuário do login | texto livre |
| `ADMIN_PASSWORD_HASH` | confere a senha | `scrypt:N:r:p:<sal>:<hash>`, a saída de `npm run --silent admin:hash-password` |
| `ADMIN_SESSION_SECRET` | assina o cookie da sessão | 32 caracteres ou mais, aleatórios (de um gerenciador de senhas). Trocar o valor derruba todas as sessões |
| `TURNSTILE_SECRET_KEY` | confere o Turnstile do login | a secret do widget, no painel da Cloudflare |

Nenhum dos valores pode ter aspas simples nem quebra de linha. Trocar o usuário ou a senha
também derruba as sessões abertas.

**Edição do conteúdo:**

- Cada parte tem a sua tela: o perfil, a lista de blocos (ordem, visibilidade, blocos novos e
  removidos), cada bloco com os itens dele e o currículo. Os textos têm os dois idiomas lado a
  lado, com aviso de tradução faltando.
- Salvar grava o rascunho, que o site não mostra: as páginas leem só a revisão publicada.
- Cada tela guarda a versão da parte que abriu. Se a mesma parte mudou em outra aba, salvar é
  recusado, em vez de apagar a outra alteração; mudar outra parte não atrapalha.
- Sair de uma tela com alterações não salvas pede confirmação. A ordem dos itens muda por
  botões, que funcionam pelo teclado.
- **Publicar**, na visão geral, gera o currículo, grava uma revisão nova e expira o cache das
  páginas (`updateTag`): o site muda na próxima visita, sem deploy. Antes, a publicação confere o rascunho: todo texto
  que vai para o site ou para o currículo precisa dos dois idiomas, os campos principais de cada
  item precisam estar preenchidos e ao menos um bloco precisa estar visível. O que falta aparece
  na visão geral, com link para a tela que corrige. A página publica exatamente a versão que
  mostrava: se o rascunho mudou em outra aba, a publicação é recusada.
- **Currículo:** o resumo profissional e os arquivos do rascunho, gerados na hora para conferir
  antes de publicar (`/admin/cv/<arquivo>`). Ali também sai a versão completa, com o telefone,
  que é entregue só nessa resposta e nunca gravada.
- **Histórico:** as revisões publicadas, da mais recente para a mais antiga, cada uma com
  download em YAML e **Restaurar como rascunho**. Restaurar não publica, e as revisões nunca
  mudam: o banco recusa alterá-las ou apagá-las.
- **Exportar e importar em YAML**, na visão geral. O arquivo exportado, com os campos privados,
  é a cópia do conteúdo fora do servidor, e dá para editá-lo à mão: os textos de várias linhas
  ficam em bloco literal (`|`), e um item novo pode ficar sem `id`, que ele ganha na importação.
  Importar aceita YAML ou JSON, valida o arquivo e substitui o rascunho, sem publicar. O leitor
  usa o YAML 1.2 padrão e recusa tags próprias, alias e mais de um documento por arquivo.

**Proteções:**

- O painel só responde nos hosts de `ADMIN_HOSTS`; nos outros, é 404.
- A sessão é um cookie `__Host-` assinado (HMAC-SHA256), `HttpOnly`, `Secure` e
  `SameSite=Strict`, que vale por 8 horas.
- O login exige o Turnstile e aceita 5 tentativas por IP a cada 15 minutos. A contagem fica no
  banco e sobrevive a um deploy.
- A senha é conferida com `scrypt` (64 MiB por tentativa), em tempo constante. Usuário e senha
  errados dão a mesma resposta.
- O proxy faz a primeira barreira (host, configuração e sessão), e cada página, Server Action e
  route handler confere a sessão de novo. Os testes mantêm a lista de todas as Server Actions e
  dos route handlers do painel e chamam cada um sem sessão.
- Pedidos que chegam por HTTP vão para HTTPS, e as respostas em HTTPS levam HSTS, sem
  `includeSubDomains`.

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento, com o banco local semeado |
| `npm run db:seed` | grava o documento fictício no banco local (`-- --force` sobrescreve) |
| `npm run admin:hash-password` | gera o hash da senha do painel; com a senha real, só o mantenedor roda |
| `npm run build` | build de produção |
| `npm run lint` · `npm run typecheck` · `npm test` | ESLint, TypeScript e testes de unidade (Vitest) |
| `npm run format` | formata o código com o Prettier |
| `npm run docker:build` | constrói a imagem como o servidor faz (builder clássico do Docker) |
| `npm run test:e2e` | Playwright contra o container local, com os limites de produção (o Chromium vem de `npx playwright install chromium`) |

## Contrato com o servidor

- O container escuta em `0.0.0.0:3000`, roda como o uid 1001 e grava apenas em `/data`: o banco,
  as fotos (`/data/media`) e os arquivos do currículo (`/data/cv`, que o app gera de novo se
  sumirem).
- `GET /api/health` responde 200 com o banco aberto e as migrations aplicadas, e 503 caso
  contrário. O corpo traz a versão da imagem e o status do último deploy.
- Nenhum domínio fica no código: as URLs absolutas e a regra de indexação saem do
  `PUBLIC_ORIGIN`. Só o host dele pode ser indexado, e só com `ALLOW_INDEXING=true`. As outras
  respostas levam `X-Robots-Tag: noindex`.
- O job de CI se chama `verify` e roda em ARM64, a mesma arquitetura do servidor.

## Desenvolvimento com IA

Este repositório é desenvolvido com agentes de IA (Claude Code), sob as regras do
[`AGENTS.md`](AGENTS.md). Cada mudança chega por pull request, revisado e mesclado pelo
mantenedor; o CI e o deploy com volta automática são a rede de proteção. Os commits feitos com o
agente levam o trailer `Co-Authored-By`.
