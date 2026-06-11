# Clean Arch SOLID DDD — Monorepo

Monorepo de estudo de Clean Architecture, SOLID e DDD, composto por uma API backend
e uma aplicação web frontend que a consome.

> Execução local-only: este projeto roda inteiramente na sua máquina (via Docker
> Compose para a infraestrutura). Não há deploy em nuvem associado a este repositório.

## Estrutura

Gerenciado com [pnpm workspaces](https://pnpm.io/workspaces) e [Turborepo](https://turbo.build/):

| Pacote | Descrição |
|--------|-----------|
| `apps/backend` | API Fastify — Clean Architecture + DDD, TypeScript, Inversify (IoC), Prisma ORM |
| `apps/frontend` | App web Next.js 16 — React 19, TanStack Query, Zustand, Tailwind, shadcn/ui |
| `packages/api-types` | Types compartilhados gerados a partir do OpenAPI spec do backend |

## Pré-requisitos

- [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io) 11.5.2 (ver `packageManager` no `package.json`)
- [Docker](https://www.docker.com) + Docker Compose (para Postgres, Redis e RabbitMQ locais)

## Infraestrutura local

A infraestrutura sobe via `apps/backend/compose.yaml`:

| Serviço | Porta(s) local |
|---------|----------------|
| PostgreSQL | 5432 |
| Redis | 6379 |
| RabbitMQ | 5672 (AMQP) / 15672 (management UI) |
| Nginx (proxy) | 80 |

## Setup

```sh
# 1. Instalar dependências (a partir da raiz)
pnpm install

# 2. Criar os arquivos de ambiente a partir dos exemplos
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.local.example apps/frontend/.env.local

# 3. Subir a infraestrutura local (Postgres + Redis + RabbitMQ + Nginx)
pnpm --filter backend docker:up

# 4. Rodar as migrações do banco
pnpm --filter backend prisma:migrate:dev
```

> O script `dev` do backend já executa `docker:up` e aguarda Postgres/RabbitMQ
> ficarem prontos automaticamente, então no fluxo normal o passo 3 é opcional.

## Desenvolvimento

```sh
# Rodar tudo (backend + frontend) via Turborepo
pnpm dev

# Ou individualmente
pnpm --filter backend dev    # API em http://localhost:3333 (sobe a infra automaticamente)
pnpm --filter frontend dev   # Web em http://localhost:3000
```

## Comandos úteis (raiz)

```sh
pnpm build            # Build de todos os pacotes
pnpm test             # Testes de todos os pacotes
pnpm lint             # Lint de todos os pacotes
pnpm generate:types   # Exporta o OpenAPI do backend e gera os types do client
```

Detalhes específicos de cada app estão nos READMEs de `apps/backend` e `apps/frontend`.

## Licença

MIT — desenvolvido por Caique Vinícius de Moraes.
