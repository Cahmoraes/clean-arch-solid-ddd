# Frontend — Clean Arch SOLID DDD

App web em [Next.js](https://nextjs.org) 16 (App Router) que consome a API do backend.
Faz parte do monorepo — veja o [README raiz](../../README.md) para o setup completo.

> Execução local-only: roda na sua máquina e aponta para o backend local
> (`http://localhost:3333`). Não há deploy em nuvem associado a este projeto.

## Tecnologias

- Next.js 16 (App Router) + React 19
- TanStack Query (data fetching/cache)
- Zustand (estado global)
- Tailwind CSS + shadcn/ui
- Biome (lint/format)
- Vitest (unit) + Playwright (E2E)

## Pré-requisitos

- Backend rodando em `http://localhost:3333` (veja `apps/backend`)
- Dependências instaladas a partir da raiz (`pnpm install`)
- Arquivo `.env.local` criado a partir de `.env.local.example`

```sh
cp .env.local.example .env.local
```

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_API_URL` | URL da API backend (padrão `http://localhost:3333`) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client ID do Google OAuth |

## Desenvolvimento

```sh
# A partir da raiz do monorepo
pnpm --filter frontend dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## Scripts

```sh
pnpm --filter frontend build      # Build de produção
pnpm --filter frontend tsc:check  # Type checking
pnpm --filter frontend lint:fix   # Lint/format com Biome
pnpm --filter frontend test       # Testes unitários (Vitest)
pnpm --filter frontend e2e        # Testes E2E (Playwright)
```
