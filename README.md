# portfolio

Portfólio profissional do Arthur Vinicius, publicado em **https://portfolio.arthru.com**:
site em português e inglês, um painel para editar o conteúdo e o currículo em PDF e XLSX gerado
a partir dele.

> Em construção. A estrutura do projeto está pronta; o conteúdo e o design chegam nas próximas
> entregas.

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
valores padrão bastam para o site.

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

**Proteções:**

- O painel só responde nos hosts de `ADMIN_HOSTS`; nos outros, é 404.
- A sessão é um cookie `__Host-` assinado (HMAC-SHA256), `HttpOnly`, `Secure` e
  `SameSite=Strict`, que vale por 8 horas.
- O login exige o Turnstile e aceita 5 tentativas por IP a cada 15 minutos. A contagem fica no
  banco e sobrevive a um deploy.
- A senha é conferida com `scrypt` (64 MiB por tentativa), em tempo constante. Usuário e senha
  errados dão a mesma resposta.
- O proxy faz a primeira barreira (host, configuração e sessão), e cada página e cada Server
  Action confere a sessão de novo. Um teste mantém a lista de todas as Server Actions e chama
  cada uma sem sessão.
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

- O container escuta em `0.0.0.0:3000`, roda como o uid 1001 e grava apenas em `/data`.
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
