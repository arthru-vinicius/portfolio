# AGENTS.md · portfolio (portfolio.arthru.com)

Portfólio pessoal do Arthur Vinicius, publicado em **https://portfolio.arthru.com**. O
projeto é desenvolvido com agentes de IA trabalhando sob as regras deste arquivo, com revisão
humana em todo pull request. As regras valem igualmente para agentes e pessoas.

## Visão geral

| Parte | O que é |
|---|---|
| Site público | Apresentação, experiência, projetos, habilidades, formação e contato, em pt-BR e inglês. |
| Painel (`/admin`) | Área com login onde o conteúdo é organizado em blocos: cada seção é um bloco, e cada experiência, projeto ou curso é um item dentro dele. O painel edita dados, ordem e visibilidade; a apresentação é responsabilidade do código. |
| Currículo | PDF e XLSX gerados a partir do mesmo conteúdo, num formato pensado para recrutadores e sistemas de triagem (ATS). |
| Contato | Formulário protegido por Turnstile; a mensagem é entregue por e-mail sem expor o endereço de destino. |

## Arquitetura

- **Next.js 16** (App Router, saída `standalone`), **React 19**, **TypeScript** estrito,
  **Tailwind CSS 4**.
- **Um container Docker** num servidor próprio (ARM64), atrás de um **Cloudflare Tunnel**:
  sem porta aberta no servidor, TLS e cache de estáticos na borda da Cloudflare.
- **Conteúdo em SQLite**, descrito por um schema único (zod) que tipa o painel, as páginas e
  as exportações. O painel mantém um rascunho e um histórico de revisões publicadas.
- **Publicar** gera o currículo (PDF e XLSX, em `/data/cv`), grava a revisão e invalida o cache
  das páginas: o site muda em segundos, sem novo deploy.
- **Deploy contínuo sem credencial no GitHub:** o servidor acompanha a `main` e, quando o
  check `verify` de um commit fica verde, constrói a imagem, troca o container e volta
  sozinho para a versão anterior se o novo não passar no healthcheck.

```
painel (/admin) ── publica ──▶ SQLite (rascunho, revisões) ──▶ páginas e currículo
                                                                  │
GitHub (main + verify verde) ──▶ servidor: build, troca, rollback │
                                                                  ▼
                              visitante ──▶ Cloudflare ──▶ túnel ──▶ container
```

## Comandos

O `package.json` é a fonte da verdade; estes são os principais.

| Comando | Para quê |
|---|---|
| `npm run dev` | desenvolvimento local, com SQLite local e dados de exemplo |
| `npm run db:seed` | grava o documento fictício no banco local (o `dev` já roda) |
| `npm run typecheck` · `npm run lint` · `npm test` | tipos, lint e testes de unidade |
| `npm run build` | build de produção do Next |
| `npm run docker:build` | build da imagem como o servidor faz (builder clássico, sem BuildKit) |
| `npm run test:e2e` | Playwright contra o container local, com os limites de produção (depois do `docker:build`) |
| `npm run admin:hash-password` | gera o hash da senha do painel; com a senha real, **só o mantenedor roda** |

## Regras

1. **O repositório é público.** Nunca commite segredos (`.env*`, chaves, tokens) nem dado
   pessoal, como telefone, endereço ou e-mail. O conteúdo real mora no banco do servidor; os
   testes usam dados fictícios. Na dúvida, pergunte antes de commitar.
2. **Git só quando o mantenedor pedir.** Fluxo: branch a partir da `main` → PR → o mantenedor
   revisa e mescla. Nada de push direto na `main`, `--force` ou `--no-verify`, e nenhum PR é
   mesclado por quem o abriu. **Mesclar na `main` é publicar:** o servidor implanta sozinho.
3. **Código em inglês** (identificadores, arquivos, pastas, branches). **Texto para humanos em
   português**: comentários, TSDoc, documentação, commits (sem acento) e PRs. Texto exibido no
   site existe em pt-BR e em inglês: o conteúdo vem do painel, e os textos fixos da interface
   vêm dos dicionários de idioma, nunca soltos em componente.
4. **O repositório entrega uma imagem; o servidor é de outro lugar.** O `Dockerfile` e o
   contrato do container (porta, healthcheck, variáveis, diretório de dados) são daqui.
   Servidor, túnel, DNS e configurações da Cloudflare não são alterados por este repositório.
   O banco só muda por migration versionada e compatível com a versão anterior.
5. **Segredos são gravados pelo mantenedor.** Agentes não geram segredo com ferramenta
   (`openssl`, `crypto`: a saída fica no histórico da sessão), não pedem que um segredo seja
   colado no chat e não rodam `admin:hash-password` com uma senha real.
6. **Painel seguro por padrão.** Toda Server Action e todo route handler do painel conferem a
   sessão por conta própria (`requireAdmin()`); layout e proxy não bastam. Server Action nova
   entra na lista de `src/app/admin/server-actions.test.ts`, e route handler novo, na de
   `src/app/admin/route-handlers.test.ts`; os dois chamam cada um sem sessão. O painel só
   responde nos hosts permitidos e falha fechado: sem segredo configurado, ele não abre.
7. **Antes de dizer que terminou:** `typecheck`, `lint`, `test`, `build` e `docker:build`;
   para mudança no servidor, rode o container local e o e2e. Mudança visual é conferida no
   navegador, no celular e no computador, nos dois idiomas e nos dois temas. **Diga o que não
   foi testado.**
8. **Next.js 16 muda rápido.** Antes de usar uma API, leia a documentação da versão instalada
   (`node_modules/next/dist/docs/`), não a memória de treino. Todo export tem TSDoc, e a
   documentação muda no mesmo commit que o código.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
