# syntax=docker/dockerfile:1.7

###############################################################################
# Imagem multi-stage profissional para a API (Clean Architecture + DDD)
# - pnpm via corepack
# - cache de store do pnpm via BuildKit
# - prisma generate executado no estágio de build
# - runtime mínimo com usuário não-root
###############################################################################

ARG NODE_VERSION=22.20.0
ARG PNPM_VERSION=10.23.0

###############################################################################
# Stage base: habilita corepack/pnpm em uma imagem slim do Node
###############################################################################
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true
ARG PNPM_VERSION
RUN npm install -g corepack@latest \
 && corepack enable \
 && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app

###############################################################################
# Stage deps: instala TODAS as dependências (inclusive dev) para o build
# Usa BuildKit cache mount para acelerar instalações repetidas
###############################################################################
FROM base AS deps
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 \
      make \
      g++ \
      openssl \
      ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store \
 && pnpm install --frozen-lockfile

###############################################################################
# Stage builder: gera Prisma Client e compila a aplicação com tsup
###############################################################################
FROM deps AS builder
COPY tsconfig.json tsup.config.ts prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

RUN DATABASE_URL="postgresql://prisma:prisma@localhost:5432/prisma?schema=public" \
    pnpm prisma:generate \
 && pnpm build

###############################################################################
# Stage prod-deps: instala somente dependências de produção
###############################################################################
FROM base AS prod-deps
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      python3 \
      make \
      g++ \
      openssl \
      ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set store-dir /pnpm/store \
 && pnpm install --prod --frozen-lockfile \
 && pnpm store prune

###############################################################################
# Stage runner: imagem final mínima, sem ferramentas de build
###############################################################################
FROM node:${NODE_VERSION}-bookworm-slim AS runner

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3333 \
    NPM_CONFIG_UPDATE_NOTIFIER=false

# OpenSSL é requerido pelos engines do Prisma; tini garante PID 1 saudável
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      openssl \
      ca-certificates \
      tini \
      curl \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 nodejs \
 && useradd  --system --uid 1001 --gid nodejs --shell /bin/false nodejs

WORKDIR /app

# Copia somente o necessário para executar a aplicação
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder   --chown=nodejs:nodejs /app/build ./build
COPY --from=builder   --chown=nodejs:nodejs /app/src/shared/infra/database/generated ./src/shared/infra/database/generated
COPY --from=builder   --chown=nodejs:nodejs /app/prisma ./prisma
COPY --chown=nodejs:nodejs package.json ./

USER nodejs

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/health" || exit 1

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "./build/main.js"]
