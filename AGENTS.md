## ALTA PRIORIDADE

- **SE VOCÊ NÃO VERIFICAR AS SKILLS**, tarefa invalidada, gera retrabalho
- **VOCÊ SÓ PODE finalizar tarefa** se `pnpm biome:fix`, `pnpm tsc:check`, `pnpm test:run` e `pnpm build` passar 100% (lint + test + build). Sem exceção — falhar qualquer um = tarefa NÃO COMPLETA
- `biome:fix` tolerância zero. Zero problemas — qualquer issue golangci-lint = falha bloqueante
- **SEMPRE verifique APIs dos pacotes dependentes** antes de escrever código de integração/testes, evita código errado
- **NUNCA use gambiarras** — use skill `no-workarounds` para correção/debug + `testing-anti-patterns` para testes
- **SEMPRE use skills** `no-workarounds` e `systematic-debugging` ao corrigir bugs/problemas complexos
- **NUNCA use ferramentas** web para código local — use Grep/Glob
- **NUNCA FAÇA COMMITS sem permissão** — sempre pergunte

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

**SEMPRE RESPONDER EM PORTUGUÊS!!**

## Backend Architecture

### Clean Architecture Layers (enforced by dependency-cruiser)

Cada bounded context em `src/{domain}/`, três camadas:

- **`domain/`** — Entities, Value Objects, Domain Events, business errors. Lógica pura, sem imports de application/infra.
- **`application/`** — Use Cases, Repository interfaces, DTOs. Importa só domain.
- **`infra/`** — Controllers, concrete Repositories, Providers. Importa application e domain.

**Bounded contexts**: `user/`, `gym/`, `check-in/`, `session/`, `subscription/`, `shared/`

Cada módulo tem próprio `AGENTS.md` com specs — leia antes de modificar.

### Either Pattern (no exceptions for business logic)

Use Cases retornam `Either<Error, Success>`:

```typescript
return failure(new UserAlreadyExistsError())
return success({ email: user.email })
```

Exceptions só para falhas técnicas (DB connection, etc).

### Inversify IoC — Adding a New Service

1. Define symbols em `src/shared/infra/ioc/module/service-identifier/{domain}-types.ts`
2. Register bindings em `src/shared/infra/ioc/module/{domain}/{domain}-container.ts`
3. Wire bootstrap em `src/bootstrap/setup-{domain}-module.ts`

### Entity Pattern

- Factory `create()` valida, retorna `Either` (async só quando validação exige, ex: bcrypt)
- `restore()` pula validação (load do DB)
- Estende `Observable` para domain event via `this.notify()`

### Controller Pattern

- Implementa `Controller` interface com `@injectable()` decorator
- Register routes no `init()` via `this.httpServer.register()`
- `isProtected: true` para rotas JWT, `onlyAdmin: true` para admin-only
- Route constants em `{domain}/infra/controller/routes/{domain}-routes.ts`

### Repository Provider Pattern

Providers escolhem implementação por env (`DATABASE_PROVIDER` env var):
- Production: `PrismaRepository` ou `SQLiteRepository`
- Development/Test: `InMemoryRepository`

### Domain Events

```typescript
DomainEventPublisher.instance.publish(new UserCreatedEvent(payload))
```

Publica após persistência ok nos Use Cases.

## Testing Conventions

### Unit Tests (`*.test.ts`)

- Use in-memory repositories
- `container.snapshot()` no beforeEach, `container.restore()` no afterEach
- Factory helpers em `test/factory/` (ex: `createAndSaveUser`, `createAndSaveGym`)

### Business Flow Tests (`*.business-flow-test.ts`)

- HTTP tests full com supertest contra in-memory Fastify server
- Rebind repositories para in-memory via `container.rebindSync()`

## Key Conventions

- **Language**: Code em English, comunicação em PT-BR (preserva technical terms)
- **Imports**: `@/` alias para `src/`. Extensão `.js` em imports internos (ESM).
- **File naming**: kebab-case (ex: `create-user.usecase.ts`, `user.repository.ts`)
- **Class naming**: PascalCase — sufixo `UseCase`, `Controller`, `Error`
- **Formatting**: 2-space indent, blank line no fim do arquivo, Biome enforced
- **Commits**: Conventional commits via Commitizen (`pnpm --filter backend commit`)
- **Validation gate**: `biome:fix` + `tsc:check` + `test:run` + `build` todos passam antes de completar tarefa

## Shared API Types

Types gerados do backend OpenAPI spec:

```bash
pnpm generate:types  # Export OpenAPI spec from backend + generate client types
```

Frontend importa types do `@repo/api-types` workspace package.