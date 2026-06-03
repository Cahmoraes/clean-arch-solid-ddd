## ALTA PRIORIDADE

- **SE VOCÊ NÃO VERIFICAR AS SKILLS**, tarefa invalidada, gera retrabalho
- **VOCÊ SÓ PODE finalizar tarefa** se `pnpm biome:fix`, `pnpm tsc:check`, `pnpm test:run` e `pnpm build` passar 100% (lint + test + build). Sem exceção — falhar qualquer um = tarefa NÃO COMPLETA
- `biome:fix` tolerância zero. Zero problemas — qualquer issue Biome = falha bloqueante
- **SEMPRE verifique APIs dos pacotes dependentes** antes de escrever código de integração/testes, evita código errado
- **NUNCA use gambiarras** — use skill `no-workarounds` para correção/debug + `testing-anti-patterns` para testes
- **SEMPRE use skills** `no-workarounds` e `systematic-debugging` ao corrigir bugs/problemas complexos
- **NUNCA use ferramentas** web para código local — use Grep/Glob
- **NUNCA FAÇA COMMITS sem permissão** — sempre pergunte

<MOST_CRITICAL>

- ABSOLUTAMENTE OBRIGATÓRIO: modo Plan, após usuário aceitar plano, SEMPRE escreva plano aceito em Markdown dentro de `docs/plans/`.
- OBRIGATÓRIO: plano aceito atualizado depois → atualize/acrescente no Markdown correspondente em `docs/plans/`.
- VIOLAÇÃO: não persistir planos aceitos = não conformidade com política do workspace.

</MOST_CRITICAL>

## Restrições de Comunicação

- Responder sempre em PT-BR, preservar termos técnicos
- Nunca usar emojis

## Monorepo Structure

pnpm workspace monorepo via Turborepo:

- **`apps/backend`** — Fastify API (Clean Architecture + DDD, TypeScript, Inversify IoC, Prisma ORM)
- **`apps/frontend`** — Next.js 16 app (React 19, TanStack Query, Zustand, Tailwind, shadcn/ui)
- **`packages/api-types`** — Shared OpenAPI-generated types entre frontend e backend

## Build, Test & Lint

### Root (Turborepo)

```bash
pnpm dev          # Start all apps in dev mode
pnpm build        # Build all packages
pnpm test         # Run all tests
pnpm lint         # Run all linters
```

### Backend (`apps/backend`)

```bash
pnpm --filter backend dev                    # Dev with hot-reload (starts Docker services)
pnpm --filter backend build                  # Production build (tsup)
pnpm --filter backend tsc:check              # TypeScript type checking
pnpm --filter backend biome:fix              # Format/lint with Biome (must pass with zero issues)
pnpm --filter backend test:run               # Unit tests (*.test.ts)
pnpm --filter backend test:run -- -t "name"  # Single unit test by name
pnpm --filter backend test:business-flow     # HTTP integration tests (*.business-flow-test.ts)
pnpm --filter backend test:e2e:prisma        # Prisma integration tests
pnpm --filter backend test:fitness           # Architecture fitness function tests
pnpm --filter backend fit:validate-dependencies  # Dependency rule validation (dependency-cruiser)
pnpm --filter backend prisma:migrate:dev     # Run database migrations
pnpm --filter backend docker:up              # Start PostgreSQL + Redis + RabbitMQ
```

### Frontend (`apps/frontend`)

```bash
pnpm --filter frontend dev            # Next.js dev server
pnpm --filter frontend build          # Production build
pnpm --filter frontend tsc:check      # TypeScript type checking
pnpm --filter frontend lint:fix       # Biome lint/format
pnpm --filter frontend test           # Vitest unit tests
pnpm --filter frontend test -- -t "name"  # Single test by name
pnpm --filter frontend e2e            # Playwright E2E tests
```

## Arquitetura e Convenções

> Detalhes completos de arquitetura, padrões e convenções do backend em [`apps/backend/CLAUDE.md`](apps/backend/CLAUDE.md).
> Detalhes do frontend em [`apps/frontend/CLAUDE.md`](apps/frontend/CLAUDE.md).
> Cada bounded context do backend tem `AGENTS.md` próprio — leia antes de modificar.

## Shared API Types

Types gerados do backend OpenAPI spec:

```bash
pnpm generate:types  # Export OpenAPI spec from backend + generate client types
```

Frontend importa types do `@repo/api-types` workspace package.
