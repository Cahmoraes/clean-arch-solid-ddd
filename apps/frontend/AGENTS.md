## ALTA PRIORIDADE

- **SE VOCÊ NÃO VERIFICAR AS SKILLS**, tarefa invalidada, gera retrabalho
- **VOCÊ SÓ PODE finalizar tarefa** se `pnpm lint:fix`, `pnpm tsc:check`, `pnpm test`, `pnpm build` passar 100% (lint + test + build). Sem exceção — falhar qualquer um = tarefa NÃO COMPLETA
- `lint:fix` tolerância zero. Zero problemas — qualquer issue Biome = falha bloqueante
- **SEMPRE verifique APIs dos pacotes dependentes** antes de escrever código de integração/testes, evita código errado
- **NUNCA use gambiarras** — use skill `no-workarounds` para correção/debug + `test-antipatterns` para testes
- **SEMPRE use skills** `no-workarounds` e `systematic-debugging` ao corrigir bugs/problemas complexos
- **NUNCA use ferramentas** web para código local — use `sg` (padrões AST: decorators, generics, shapes), Grep ou Glob. Prefira `sg` a `grep` para buscas estruturais
- **NUNCA FAÇA COMMITS sem permissão** — sempre pergunte

## REQUISITOS OBRIGATÓRIOS
- DEVE rodar `pnpm lint:fix` antes de concluir QUALQUER subtarefa
- SEMPRE USE skills `systematic-debugging` + `no-workarounds` antes de corrigir bug

Pular verificação = REJEIÇÃO IMEDIATA DA TAREFA.

<MOST_CRITICAL>

- ABSOLUTAMENTE OBRIGATÓRIO: modo Plan, após usuário aceitar plano, SEMPRE escreva plano aceito em arquivo Markdown dentro de docs/plans/.

- OBRIGATÓRIO: plano aceito atualizado depois → atualize/acrescente conteúdo no Markdown correspondente em docs/plans/.

- VIOLAÇÃO: não persistir planos aceitos do modo Plan em docs/plans/ = não conformidade com política do workspace.

</MOST_CRITICAL>

# Overview do Projeto

## Restrições de Comunicação
- Responder português PT-BR, preservar termos técnicos
- Nunca emojis
- Indentação tab (Biome), linha em branco ao fim dos arquivos

## Build, Test & Lint

### Comandos Essenciais
```bash
pnpm dev                # Next.js dev server (http://localhost:3000)
pnpm build              # Production build
pnpm start              # Iniciar produção
pnpm tsc:check          # Verificar tipos TypeScript
pnpm lint:fix           # Formatar/lint com Biome (write mode)
```

### Testing
```bash
pnpm test -- --run      # Testes unitários sem watch (Vitest, *.test.ts/tsx)
pnpm test -- -t "nome"  # Executar teste único por nome
pnpm test:watch         # Testes em modo watch
pnpm test:coverage      # Testes com cobertura
pnpm e2e                # Testes E2E (Playwright)
pnpm e2e:ui             # Testes E2E com UI interativa
```

**Atenção**: `pnpm test:run` não existe neste workspace. Para rodar sem watch:
- Da raiz do monorepo: `pnpm --filter frontend test -- --run`
- Dentro de `apps/frontend`: `pnpm test -- --run`

## Skills Obrigatórias por Tipo de Tarefa

| Tarefa | Skills Obrigatórias |
|--------|-------------------|
| Correção de bug / debug | `systematic-debugging` + `no-workarounds` |
| Escrita/alteração de testes | `test-antipatterns` + `vitest` |
| Componentes UI / styling | `ui-ux-pro-max` + `web-design-guidelines` |
| Componentes React (hooks, state, TypeScript) | `react` |
| Componentes shadcn/ui | `shadcn` |
| Estilização com Tailwind CSS v4 | `tailwindcss` |
| Data fetching / server state | `tanstack-query-best-practices` |
| Gerenciamento de estado global | `zustand` |
| Gerenciamento de estados complexos (máquinas de estado) | `xstate` |
| Validação de schemas | `zod` |
| Tipos avançados TypeScript | `typescript-advanced` |
| Testes E2E com Playwright | `playwright-cli` |
| Composição de componentes React | `vercel-composition-patterns` + `vercel-react-best-practices` |
| Consulta de docs de libs | `context7` |
| Criação de feature nova | `brainstorming` (antes de implementar) |
| QA e validação | `qa-execution` ou `qa-report` |
| Decisões arquiteturais de alto impacto / trade-offs | `council` |
| Rebase e resolução de conflitos de merge | `git-rebase` |

## Arquitetura

### Estrutura de Pastas
```
src/
├── app/                    # Next.js App Router
│   ├── (authenticated)/    # Rotas protegidas (requer JWT)
│   ├── (public)/           # Rotas públicas (login, signup)
│   ├── providers.tsx       # QueryClientProvider + AuthProvider
│   └── layout.tsx          # Root layout
├── components/
│   ├── ui/                 # Componentes base reutilizáveis (Button, Dialog, Input, etc.)
│   └── layout/             # Shells de layout (AuthenticatedShell, PublicShell, AdminGuard)
├── features/               # Módulos de domínio (feature-based)
│   ├── auth/               # Autenticação (login, signup, ativação, troca de senha)
│   ├── gyms/               # Academias (busca, criação)
│   ├── check-ins/          # Check-ins
│   ├── profile/            # Perfil do usuário
│   ├── subscriptions/      # Assinaturas
│   └── admin/              # Painel administrativo
├── lib/                    # Utilitários e infraestrutura compartilhada
│   ├── api.ts              # Cliente OpenAPI (openapi-fetch) com middlewares
│   ├── auth/               # Auth store (Zustand), token refresh, middleware de fetch
│   ├── query-client.ts     # Configuração do TanStack Query
│   ├── errors.ts           # ApiError e mapeamento de status
│   └── cn.ts               # Utility para classes CSS (clsx + tailwind-merge)
└── test/                   # Infraestrutura de testes
    ├── setup.ts            # Setup global (MSW, cleanup)
    ├── render.tsx          # renderWithProviders + makeTestJwt
    └── msw/                # Mock Service Worker (handlers, server, browser)
```

### Feature Modules (`src/features/{feature}/`)
Cada feature segue estrutura:
```
{feature}/
├── api/              # Hooks TanStack Query (useQuery, useMutation) e funções de fetch
├── components/       # Componentes React específicos da feature
└── schemas/          # Schemas Zod de validação de formulários
```

### Stack Principal
- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4, shadcn/ui (Radix primitives)
- **Server State**: TanStack Query (React Query)
- **Client State**: Zustand
- **API Client**: openapi-fetch (tipado via `@repo/api-types`)
- **Validação**: Zod + react-hook-form
- **Testes unitários**: Vitest + Testing Library + MSW
- **Testes E2E**: Playwright
- **Lint/Format**: Biome

### Padrão de Autenticação
- Auth state em Zustand (`lib/auth/auth-store.ts`)
- Token JWT em memória (não localStorage)
- Refresh token via cookie httpOnly
- Middleware de fetch intercepta 401 e faz refresh automático
- `AuthProvider` em `app/providers.tsx` gerencia bootstrap de sessão

### Padrão de Testes Unitários
- MSW intercepta chamadas HTTP (sem mock manual de fetch)
- `renderWithProviders()` envolve componente com QueryClientProvider de teste
- `makeTestJwt()` gera JWT falso para testes de componentes autenticados
- Setup global: `src/test/setup.ts` (cleanup, MSW lifecycle, auth store reset)

### Padrão de Testes E2E (Playwright)
- Testes em `e2e/` com sufixo `.spec.ts`
- Playwright inicia backend + frontend automaticamente via `webServer`
- Helpers compartilhados em `e2e/helpers/`

## Convenções e Práticas

### Nomenclatura
- **Módulos/features**: kebab-case (ex: `check-ins/`, `auth/`, `gyms/`)
- **Componentes React**: PascalCase (ex: `AdminGuard.tsx`, `AuthenticatedShell.tsx`)
- **Hooks**: camelCase com prefixo `use` (ex: `useLogin`, `useGymsByName`)
- **Schemas Zod**: camelCase com sufixo `Schema` (ex: `loginSchema`, `createGymSchema`)
- **Arquivos utilitários**: kebab-case (ex: `query-client.ts`, `auth-store.ts`)
- **Testes**: mesmo nome do arquivo com sufixo `.test.ts(x)` (ex: `auth-store.test.ts`)

### Testes em Português
Descrições de testes DEVEM ser português PT-BR usando `test` (nunca `it`):
```typescript
// CORRETO
describe("useLogin", () => {
  test("deve retornar token ao autenticar com credenciais válidas", async () => {
    // ...
  })

  test("deve lançar ApiError quando credenciais são inválidas", async () => {
    // ...
  })
})

// INCORRETO - NÃO usar `it`
describe("useLogin", () => {
  it("should return token", async () => { /* ... */ })  // PROIBIDO
})
```

### Imports
- Alias `@/` para `src/` (ex: `import { api } from "@/lib/api"`)
- Imports organizados automaticamente pelo Biome

### Formatação (Biome)
- Indentação: tab
- Aspas: double quotes
- Semicolons: somente quando necessário (ASI)
- Complexidade cognitiva máxima: 5

### Design System
Projeto segue design system cromático inspirado no Superhumon (doc em [`DESIGN.md`](DESIGN.md)):
- Paleta cromática: indigo navy (`#1b1938`), violet (`#c9b4fa`), teal (`#155555`)
- Tipografia: Inter Variable via `next/font/google`
- Escala gradual border-radius: 4px / 6px / 8px / 12px / 16px / 9999px
- Sombras 3 níveis: flat / sm (1px) / md (8px)
- Sidebar usa `bg-primary` (indigo) como identidade de marca
- Dark mode via `next-themes` com tokens derivados da paleta cromática
- Componentes base em `src/components/ui/` (shadcn/ui customizado)

### API Client
Cliente HTTP tipado via OpenAPI:
```typescript
import { api } from "@/lib/api"

// Tipagem automática de path, params, body e response
const { data, error } = await api.GET("/gyms/search/{name}", {
  params: { path: { name }, query: { page } },
})
```

Tipos gerados do backend com `pnpm generate:types` (rodar na raiz do monorepo).

### Tratamento de Erros
Toda chamada API usa `ApiError` (classe em `lib/errors.ts`):
```typescript
function toApiError(error: unknown, fallbackStatus = 500): ApiError {
  if (error instanceof ApiError) return error
  const message = error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
  return new ApiError(fallbackStatus, "network_error", message)
}
```
