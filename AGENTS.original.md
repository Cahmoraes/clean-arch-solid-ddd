## ALTA PRIORIDADE

- **SE VOCÊ NÃO VERIFICAR AS SKILLS**, sua tarefa será invalidada e geraremos retrabalho
- **VOCÊ SÓ PODE finalizar uma tarefa** se `pnpm biome:fix`, `pnpm tsc:check`, `pnpm test:run` e `pnpm build` passar a 100% (executa lint + test + build). Sem exceções — falhar em qualquer um desses comandos significa que a tarefa NÃO ESTÁ COMPLETA
- `biome:fix` tem tolerância zero. Zero problemas permitidos — qualquer issue do golangci-lint é uma falha bloqueante
- **SEMPRE verifique as APIs dos pacotes dependentes** antes de escrever código de integração ou testes, para evitar código incorreto
- **NUNCA use gambiarras** — sempre utilize a skill `no-workarounds` para qualquer tarefa de correção/debug + `testing-anti-patterns` para testes
- **SEMPRE use as skills** `no-workarounds` e `systematic-debugging` ao corrigir bugs ou problemas complexos
- **NUNCA use ferramentas** de busca na web para pesquisar código local do projeto — para código local, use Grep/Glob
- **NUNCA FAÇA COMMITS sem pedir permissão** sempre pergunte se o usuário deseja realizar commit

## Monorepo Structure

pnpm workspace monorepo managed by Turborepo:

- **`apps/backend`** — Fastify API (Clean Architecture + DDD, TypeScript, Inversify IoC, Prisma ORM)
- **`apps/frontend`** — Next.js 16 app (React 19, TanStack Query, Zustand, Tailwind, shadcn/ui)
- **`packages/api-types`** — Shared OpenAPI-generated types between frontend and backend

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

Each bounded context lives in `src/{domain}/` with three layers:

- **`domain/`** — Entities, Value Objects, Domain Events, business errors. Pure logic, no imports from application or infra.
- **`application/`** — Use Cases, Repository interfaces, DTOs. Imports domain only.
- **`infra/`** — Controllers, concrete Repositories, Providers. Imports application and domain.

**Bounded contexts**: `user/`, `gym/`, `check-in/`, `session/`, `subscription/`, `shared/`

Each module has its own `AGENTS.md` with detailed specs — read it before modifying that module.

### Either Pattern (no exceptions for business logic)

Use Cases return `Either<Error, Success>`:

```typescript
return failure(new UserAlreadyExistsError())
return success({ email: user.email })
```

Exceptions are only for technical failures (DB connection, etc).

### Inversify IoC — Adding a New Service

1. Define symbols in `src/shared/infra/ioc/module/service-identifier/{domain}-types.ts`
2. Register bindings in `src/shared/infra/ioc/module/{domain}/{domain}-container.ts`
3. Wire in bootstrap at `src/bootstrap/setup-{domain}-module.ts`

### Entity Pattern

- Factory method `create()` validates and returns `Either` (async only when validation requires it, e.g., bcrypt)
- `restore()` bypasses validation (loading from DB)
- Extend `Observable` for domain event publishing via `this.notify()`

### Controller Pattern

- Implement `Controller` interface with `@injectable()` decorator
- Register routes in `init()` method via `this.httpServer.register()`
- Use `isProtected: true` for JWT-secured routes, `onlyAdmin: true` for admin-only
- Route constants in `{domain}/infra/controller/routes/{domain}-routes.ts`

### Repository Provider Pattern

Providers select implementation based on environment (`DATABASE_PROVIDER` env var):
- Production: `PrismaRepository` or `SQLiteRepository`
- Development/Test: `InMemoryRepository`

### Domain Events

```typescript
DomainEventPublisher.instance.publish(new UserCreatedEvent(payload))
```

Publish after successful persistence in Use Cases.

## Testing Conventions

### Unit Tests (`*.test.ts`)

- Use in-memory repositories
- `container.snapshot()` in beforeEach, `container.restore()` in afterEach
- Factory helpers in `test/factory/` (e.g., `createAndSaveUser`, `createAndSaveGym`)

### Business Flow Tests (`*.business-flow-test.ts`)

- Full HTTP tests with supertest against in-memory Fastify server
- Rebind repositories to in-memory implementations via `container.rebindSync()`

## Key Conventions

- **Language**: Code in English, communication in PT-BR (preserve technical terms)
- **Imports**: Use `@/` alias for `src/`. Use `.js` extension in internal imports (ESM).
- **File naming**: kebab-case (e.g., `create-user.usecase.ts`, `user.repository.ts`)
- **Class naming**: PascalCase — `UseCase` suffix, `Controller` suffix, `Error` suffix
- **Formatting**: 2-space indentation, blank line at end of files, Biome enforced
- **Commits**: Conventional commits via Commitizen (`pnpm --filter backend commit`)
- **Validation gate**: `biome:fix` + `tsc:check` + `test:run` + `build` must all pass before completing any task

## Shared API Types

Types are generated from backend OpenAPI spec:

```bash
pnpm generate:types  # Export OpenAPI spec from backend + generate client types
```

Frontend imports types from `@repo/api-types` workspace package.
