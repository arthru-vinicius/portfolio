# Imagem de produção do portfolio.
#
# O servidor constrói esta imagem com o builder clássico do Docker (sem
# BuildKit), em ARM64. Por isso nada de RUN --mount, COPY --link, COPY --chmod,
# heredoc em RUN nem diretiva de sintaxe. Para reproduzir: npm run docker:build.
#
# Três estágios: dependências, build e execução. Só o último vai para a imagem.

# Versão maior e distribuição fixas: o servidor constrói com --pull, e uma tag
# solta trocaria a base sem aviso.
FROM node:22-trixie-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Nenhuma dependência usada no build precisa de script de instalação, e
# ignorá-los fecha uma porta de ataque pela cadeia de dependências.
RUN npm ci --ignore-scripts --no-audit --no-fund

FROM node:22-trixie-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# public/ pode não existir no repositório, mas o estágio final copia a pasta.
RUN mkdir -p public && npm run build

FROM node:22-trixie-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Usuário do exemplo oficial do Next. O diretório /data do servidor pertence a
# este uid, e só ele grava no banco.
RUN groupadd --gid 1001 nodejs \
 && useradd --uid 1001 --gid nodejs --no-create-home --shell /usr/sbin/nologin nextjs

# O standalone já inclui a pasta migrations/, rastreada a partir de
# src/lib/db/database.ts. O .next precisa ser do usuário do app, porque o Next
# grava cache nele em tempo de execução.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Por último, porque muda a cada commit: assim não invalida as camadas acima.
ARG GIT_SHA=unknown
ENV GIT_SHA=${GIT_SHA}

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
