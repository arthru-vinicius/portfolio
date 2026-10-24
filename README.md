# portfolio

Portfólio profissional do Arthur Vinicius, publicado em **https://arthru.com**: site em
português e inglês, um painel para editar o conteúdo e o currículo em PDF e XLSX gerado a partir
dele.

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
valores padrão bastam.

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento, com o banco local semeado |
| `npm run db:seed` | grava o documento fictício no banco local (`-- --force` sobrescreve) |
| `npm run build` | build de produção |
| `npm run lint` · `npm run typecheck` · `npm test` | ESLint, TypeScript e testes de unidade (Vitest) |
| `npm run format` | formata o código com o Prettier |
| `npm run docker:build` | constrói a imagem como o servidor faz (builder clássico do Docker) |
| `npm run test:e2e` | Playwright contra o container local, com os limites de produção |

## Contrato com o servidor

- O container escuta em `0.0.0.0:3000`, roda como o uid 1001 e grava apenas em `/data`.
- `GET /api/health` responde 200 com o banco aberto e as migrations aplicadas, e 503 caso
  contrário. O corpo traz a versão da imagem e o status do último deploy.
- O site responde igual em todos os endereços configurados, e nenhum domínio fica no código. Só
  o host do `PUBLIC_ORIGIN` pode ser indexado, e só com `ALLOW_INDEXING=true`. As outras
  respostas levam `X-Robots-Tag: noindex`.
- O job de CI se chama `verify` e roda em ARM64, a mesma arquitetura do servidor.

## Desenvolvimento com IA

Este repositório é desenvolvido com agentes de IA (Claude Code), sob as regras do
[`AGENTS.md`](AGENTS.md). Cada mudança chega por pull request, revisado e mesclado pelo
mantenedor; o CI e o deploy com volta automática são a rede de proteção. Os commits feitos com o
agente levam o trailer `Co-Authored-By`.
