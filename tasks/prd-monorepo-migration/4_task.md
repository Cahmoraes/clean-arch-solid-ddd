# Tarefa 4.0: Criar app frontend Next.js

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Criar o app `apps/frontend/` com Next.js 15, TypeScript, App Router e Biome (sem ESLint). Adicionar
as dependências `openapi-fetch`, `@tanstack/react-query` e `@repo/api-types`. Criar o cliente HTTP
tipado (`lib/api.ts`) que usa `createClient<paths>` com `@repo/api-types`. O frontend deve compilar
(`pnpm --filter frontend build`) e o Biome deve passar sem erros.

<skills>
### Conformidade com Skills Padrões

- **`tanstack-query-best-practices`** — seguir boas práticas ao configurar o `QueryClientProvider`
- **`no-workarounds`** — não usar `// @ts-ignore` ou supressões de lint para resolver problemas de tipos
</skills>

<requirements>
- `apps/frontend/` criado com Next.js 15, App Router e TypeScript
- ESLint não deve ser instalado (usar Biome)
- `apps/frontend/package.json` deve ter `name: "frontend"` e `@repo/api-types: "workspace:*"`
- `apps/frontend/biome.json` configurado com as mesmas regras do backend
- `createClient<paths>` em `apps/frontend/src/lib/api.ts` usando `@repo/api-types`
- `QueryClientProvider` configurado em `apps/frontend/src/app/providers.tsx`
- `pnpm --filter frontend build` deve passar
- `pnpm --filter frontend lint` (biome) deve passar sem erros
</requirements>

## Subtarefas

- [ ] 4.1 Executar `pnpm create next-app apps/frontend` escolhendo: TypeScript ✓, App Router ✓, sem ESLint, sem Tailwind (por ora), sem `src/` dir (ou com — conforme padrão do projeto)
- [ ] 4.2 Adicionar `"name": "frontend"` ao `apps/frontend/package.json`
- [ ] 4.3 Remover ESLint do `apps/frontend/` se instalado pelo `create-next-app`
- [ ] 4.4 Criar `apps/frontend/biome.json` com as mesmas regras do `apps/backend/biome.json`
- [ ] 4.5 Instalar dependências: `openapi-fetch`, `@tanstack/react-query`
- [ ] 4.6 Adicionar `@repo/api-types: "workspace:*"` às dependências do frontend
- [ ] 4.7 Criar `apps/frontend/src/lib/api.ts` com `createClient<paths>` conforme techspec
- [ ] 4.8 Criar `apps/frontend/src/app/providers.tsx` com `QueryClientProvider`
- [ ] 4.9 Atualizar `apps/frontend/src/app/layout.tsx` para envolver a app com `Providers`
- [ ] 4.10 Executar `pnpm --filter frontend build` e corrigir erros de compilação
- [ ] 4.11 Executar `pnpm --filter frontend lint` (biome) sem erros

## Detalhes de Implementação

Ver seção **"Interfaces Principais — cliente HTTP tipado"** na `techspec.md`.

O cliente HTTP (`src/lib/api.ts`):
```typescript
import createClient from "openapi-fetch"
import type { paths } from "@repo/api-types"

export const api = createClient<paths>({ baseUrl: process.env.NEXT_PUBLIC_API_URL })
```

O `providers.tsx` deve usar `"use client"` e criar um `QueryClient` com `useState` para evitar
instância compartilhada entre requisições SSR.

`NEXT_PUBLIC_API_URL` deve ser declarada em `apps/frontend/.env.local.example`.

## Critérios de Sucesso

- `pnpm --filter frontend build` sem erros
- `pnpm --filter frontend lint` (biome) sem erros
- `apps/frontend/src/lib/api.ts` compila sem erros de tipo com `@repo/api-types`
- `QueryClientProvider` presente no layout raiz do Next.js

## Testes da Tarefa

- [ ] `pnpm --filter frontend build` — build Next.js com sucesso
- [ ] `pnpm --filter frontend lint` — Biome sem erros
- [ ] `pnpm --filter frontend tsc:check` (se script existir) — sem erros de TypeScript

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/frontend/package.json` (novo)
- `apps/frontend/next.config.ts` (novo)
- `apps/frontend/tsconfig.json` (novo)
- `apps/frontend/biome.json` (novo)
- `apps/frontend/src/lib/api.ts` (novo)
- `apps/frontend/src/app/providers.tsx` (novo)
- `apps/frontend/src/app/layout.tsx` (modificado)
- `apps/frontend/.env.local.example` (novo)
