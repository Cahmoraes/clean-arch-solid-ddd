# Design: Migração para Monorepo

**Data**: 2026-05-02
**Status**: Aprovado

## Problema

O projeto atual é um backend isolado (Clean Architecture + DDD). A necessidade de adicionar um
frontend Next.js exige uma estrutura de monorepo para organizar os dois apps de forma coesa,
compartilhar tipos gerados do OpenAPI e simplificar os scripts de desenvolvimento.

## Abordagem Escolhida

pnpm workspaces + Turborepo — oferece pipeline com caching incremental e execução paralela com
configuração mínima, sem overhead de ferramentas como Nx.

## Estrutura de Diretórios

```
clean-arch-solid-ddd/
├── pnpm-workspace.yaml        # declara workspaces: backend, frontend, packages/*
├── turbo.json                 # pipeline de build/test/lint/dev
├── package.json               # scripts raiz
├── backend/                   # código atual movido para cá
│   ├── src/
│   ├── prisma/
│   ├── package.json
│   └── ...
├── frontend/                  # novo app Next.js
│   ├── src/
│   ├── package.json
│   └── ...
└── packages/
    └── api-types/             # tipos TypeScript gerados do OpenAPI
        ├── package.json       # name: @repo/api-types
        └── index.d.ts         # re-exporta os tipos gerados pelo backend
```

## Configuração do Turborepo

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "persistent": true,
      "cache": false
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    }
  }
}
```

Scripts na raiz:
- `pnpm dev` — backend e frontend em paralelo
- `pnpm build` — `api-types` → `backend` → `frontend` (ordem por dependências)
- `pnpm test` — testes de todos os workspaces

## Estratégia de Tipos Compartilhados

O backend já possui scripts que geram:
- `docs/openapi-spec.json` — especificação OpenAPI
- `src/shared/infra/openapi/generated/api-types.d.ts` — tipos TypeScript

Fluxo no monorepo:
1. Script de geração do backend aponta a saída para `packages/api-types/index.d.ts`
2. `packages/api-types` é publicado internamente como `@repo/api-types`
3. Frontend consome `import type { ... } from '@repo/api-types'`

Isso evita duplicação e mantém a geração centralizada no backend.

## Frontend (Next.js)

- **Framework**: Next.js 15 com App Router + Server Components
- **Data fetching client**: TanStack Query (mutations, cache, revalidação)
- **HTTP client**: `openapi-fetch` com tipagem de `@repo/api-types`
- **Linguagem**: TypeScript
- **Design system**: a ser fornecido pelo time

## Decisões Adiadas

- Configuração do design system (componentes, tokens)
- Deploy e CI/CD do frontend
- Estratégia de autenticação no frontend (cookies JWT vs. session)
