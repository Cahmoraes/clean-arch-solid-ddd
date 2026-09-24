# Overview do Projeto

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
| Correção de bug / debug | `no-workarounds` |
| Escrita/alteração de testes | `test-antipatterns` |
| Componentes shadcn/ui | `shadcn` |
| Estilização com Tailwind CSS v4 | `tailwindcss` |
| Data fetching / server state | `tanstack-query-best-practices` |
| Tipos avançados TypeScript | `typescript-advanced` |
| Testes E2E com Playwright | `playwright-cli` |
| Composição de componentes React | `vercel-composition-patterns` + `vercel-react-best-practices` |
| Consulta de docs de libs | `context7` |
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

Paleta "Noite neon" (`replaced-visual-redesign`): tema escuro — `background` `#0a1424`, `card` `#0d1b2e`, `primary` `#ff3ea5`, `accent` `#3ee0ff`; tema claro — `background` `#f3f6fa`, `primary` `#cc0077`, `accent` `#006c85`.

Fontes: `font-display` = VT323 (peso único 400; títulos, eyebrows, rótulos, botões, KPIs e badges; nunca abaixo de 15px); `font-sans` = Inter (texto corrido, campos, tabelas); `font-mono` = JetBrains Mono (código, ids, coordenadas, timestamps).

Forma: `--radius-xs/sm/md/lg/xl` representam o tamanho do chanfro (2/4/6/10/12px), ativado via `corner-shape: bevel` sob `@supports` em `apps/frontend/src/app/globals.css`; sem suporte do navegador, o canto é reto (0px). `rounded-full` e `rounded-[Npx]` são proibidos em `src/` (guarda `src/test/rounded-residue.test.ts`), exceto a allowlist do globo do clima (`features/weather/components/weather-globe.tsx`, `weather-globe-fallback.tsx`).

Textura: a classe `crt-scanlines` desenha linhas horizontais estáticas atrás do conteúdo, só no tema escuro, restrita a 4 superfícies (`PixelScene`, hero do dashboard, cards de KPI, sidebar) e protegida por `src/test/crt-scanlines-scope.test.ts`.

Regras: nenhum componente declara `corner-shape` por conta própria — só `globals.css`; glow nunca é aplicado a texto.

### Acessibilidade

- **Botão ícone-only:** `Button size="icon"` sem filho textual exige `aria-label`/`aria-labelledby` — não há enforcement de tipo (decisão consciente, ver PRD `acessibilidade-frontend`).

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
