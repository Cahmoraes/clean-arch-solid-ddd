## ALTA PRIORIDADE

- **SE VOCE NAO VERIFICAR AS SKILLS**, sua tarefa sera invalidada e geraremos retrabalho
- **VOCE SO PODE finalizar uma tarefa** se `pnpm lint:fix`, `pnpm tsc:check`, `pnpm test` e `pnpm build` passar a 100% (executa lint + test + build). Sem excecoes — falhar em qualquer um desses comandos significa que a tarefa NAO ESTA COMPLETA
- `lint:fix` tem tolerancia zero. Zero problemas permitidos — qualquer issue do Biome e uma falha bloqueante
- **SEMPRE verifique as APIs dos pacotes dependentes** antes de escrever codigo de integracao ou testes, para evitar codigo incorreto
- **NUNCA use gambiarras** — sempre utilize a skill `no-workarounds` para qualquer tarefa de correcao/debug + `test-antipatterns` para testes
- **SEMPRE use as skills** `no-workarounds` e `systematic-debugging` ao corrigir bugs ou problemas complexos
- **NUNCA use ferramentas** de busca na web para pesquisar codigo local do projeto — para codigo local, use Grep/Glob

## REQUISITOS OBRIGATORIOS
- DEVE executar `pnpm lint:fix` antes de concluir QUALQUER subtarefa
- SEMPRE USE as skills `systematic-debugging` + `no-workarounds` antes de corrigir qualquer bug

Pular qualquer verificacao resultara em REJEICAO IMEDIATA DA TAREFA.

<MOST_CRITICAL>

- ABSOLUTAMENTE OBRIGATORIO: No modo Plan, apos o usuario aceitar um plano, SEMPRE escreva o plano aceito em um arquivo Markdown dentro de docs/plans/.

- OBRIGATORIO: Se o plano aceito for atualizado posteriormente, atualize ou acrescente o conteudo no arquivo Markdown correspondente dentro de docs/plans/.

- VIOLACAO: Nao persistir planos aceitos no modo Plan dentro de docs/plans/ e uma nao conformidade com esta politica do workspace.

</MOST_CRITICAL>

# Overview do Projeto

## Restricoes de Comunicacao
- Responder em portugues PT-BR preservando termos tecnicos
- Nunca utilizar emojis
- Indentacao com tab (Biome), linha em branco ao final de arquivos

## Build, Test & Lint

### Comandos Essenciais
```bash
pnpm dev                # Next.js dev server (http://localhost:3000)
pnpm build              # Production build
pnpm start              # Iniciar producao
pnpm tsc:check          # Verificar tipos TypeScript
pnpm lint:fix           # Formatar/lint com Biome (write mode)
```

### Testing
```bash
pnpm test               # Testes unitarios (Vitest, *.test.ts/tsx)
pnpm test -- -t "nome"  # Executar teste unico por nome
pnpm test:watch         # Testes em modo watch
pnpm test:coverage      # Testes com cobertura
pnpm e2e                # Testes E2E (Playwright)
pnpm e2e:ui             # Testes E2E com UI interativa
```

## Skills Obrigatorias por Tipo de Tarefa

| Tarefa | Skills Obrigatorias |
|--------|-------------------|
| Correcao de bug / debug | `systematic-debugging` + `no-workarounds` |
| Escrita/alteracao de testes | `test-antipatterns` + `vitest` |
| Componentes UI / styling | `ui-ux-pro-max` + `web-design-guidelines` |
| Componentes React (hooks, state, TypeScript) | `react` |
| Componentes shadcn/ui | `shadcn` |
| Estilizacao com Tailwind CSS v4 | `tailwindcss` |
| Data fetching / server state | `tanstack-query-best-practices` |
| Gerenciamento de estado global | `zustand` |
| Gerenciamento de estados complexos (maquinas de estado) | `xstate` |
| Validacao de schemas | `zod` |
| Tipos avancados TypeScript | `typescript-advanced` |
| Testes E2E com Playwright | `playwright-cli` |
| Composicao de componentes React | `vercel-composition-patterns` + `vercel-react-best-practices` |
| Consulta de docs de libs | `context7` |
| Criacao de feature nova | `brainstorming` (antes de implementar) |
| TDD | `tdd` |
| QA e validacao | `qa-execution` ou `qa-report` |
| Decisoes arquiteturais de alto impacto / trade-offs | `council` |
| Rebase e resolucao de conflitos de merge | `git-rebase` |

## Arquitetura

### Estrutura de Pastas
```
src/
├── app/                    # Next.js App Router
│   ├── (authenticated)/    # Rotas protegidas (requer JWT)
│   ├── (public)/           # Rotas publicas (login, signup)
│   ├── providers.tsx       # QueryClientProvider + AuthProvider
│   └── layout.tsx          # Root layout
├── components/
│   ├── ui/                 # Componentes base reutilizaveis (Button, Dialog, Input, etc.)
│   └── layout/             # Shells de layout (AuthenticatedShell, PublicShell, AdminGuard)
├── features/               # Modulos de dominio (feature-based)
│   ├── auth/               # Autenticacao (login, signup, ativacao, troca de senha)
│   ├── gyms/               # Academias (busca, criacao)
│   ├── check-ins/          # Check-ins
│   ├── profile/            # Perfil do usuario
│   ├── subscriptions/      # Assinaturas
│   └── admin/              # Painel administrativo
├── lib/                    # Utilitarios e infraestrutura compartilhada
│   ├── api.ts              # Cliente OpenAPI (openapi-fetch) com middlewares
│   ├── auth/               # Auth store (Zustand), token refresh, middleware de fetch
│   ├── query-client.ts     # Configuracao do TanStack Query
│   ├── errors.ts           # ApiError e mapeamento de status
│   └── cn.ts               # Utility para classes CSS (clsx + tailwind-merge)
└── test/                   # Infraestrutura de testes
    ├── setup.ts            # Setup global (MSW, cleanup)
    ├── render.tsx          # renderWithProviders + makeTestJwt
    └── msw/                # Mock Service Worker (handlers, server, browser)
```

### Feature Modules (`src/features/{feature}/`)
Cada feature segue a estrutura:
```
{feature}/
├── api/              # Hooks TanStack Query (useQuery, useMutation) e funcoes de fetch
├── components/       # Componentes React especificos da feature
└── schemas/          # Schemas Zod de validacao de formularios
```

### Stack Principal
- **Framework**: Next.js 16 (App Router)
- **UI**: React 19, Tailwind CSS 4, shadcn/ui (Radix primitives)
- **Server State**: TanStack Query (React Query)
- **Client State**: Zustand
- **API Client**: openapi-fetch (tipado via `@repo/api-types`)
- **Validacao**: Zod + react-hook-form
- **Testes unitarios**: Vitest + Testing Library + MSW
- **Testes E2E**: Playwright
- **Lint/Format**: Biome

### Padrao de Autenticacao
- Auth state em Zustand (`lib/auth/auth-store.ts`)
- Token JWT armazenado em memoria (nao localStorage)
- Refresh token via cookie httpOnly
- Middleware de fetch intercepta 401 e faz refresh automatico
- `AuthProvider` em `app/providers.tsx` gerencia bootstrap de sessao

### Padrao de Testes Unitarios
- MSW intercepta chamadas HTTP (sem mock manual de fetch)
- `renderWithProviders()` envolve componente com QueryClientProvider de teste
- `makeTestJwt()` gera JWT falso para testes de componentes autenticados
- Setup global: `src/test/setup.ts` (cleanup, MSW lifecycle, auth store reset)

### Padrao de Testes E2E (Playwright)
- Testes em `e2e/` com sufixo `.spec.ts`
- Playwright inicia backend + frontend automaticamente via `webServer`
- Helpers compartilhados em `e2e/helpers/`

## Convencoes e Praticas

### Nomenclatura
- **Modulos/features**: kebab-case (ex: `check-ins/`, `auth/`, `gyms/`)
- **Componentes React**: PascalCase (ex: `AdminGuard.tsx`, `AuthenticatedShell.tsx`)
- **Hooks**: camelCase com prefixo `use` (ex: `useLogin`, `useGymsByName`)
- **Schemas Zod**: camelCase com sufixo `Schema` (ex: `loginSchema`, `createGymSchema`)
- **Arquivos utilitarios**: kebab-case (ex: `query-client.ts`, `auth-store.ts`)
- **Testes**: mesmo nome do arquivo com sufixo `.test.ts(x)` (ex: `auth-store.test.ts`)

### Testes em Portugues
Descricoes de testes DEVEM ser escritas em portugues PT-BR usando `test` (nunca `it`):
```typescript
// CORRETO
describe("useLogin", () => {
  test("deve retornar token ao autenticar com credenciais validas", async () => {
    // ...
  })

  test("deve lancar ApiError quando credenciais sao invalidas", async () => {
    // ...
  })
})

// INCORRETO - NAO usar `it`
describe("useLogin", () => {
  it("should return token", async () => { /* ... */ })  // PROIBIDO
})
```

### Imports
- Usar alias `@/` para `src/` (ex: `import { api } from "@/lib/api"`)
- Imports organizados automaticamente pelo Biome

### Formatacao (Biome)
- Indentacao: tab
- Aspas: double quotes
- Semicolons: somente quando necessario (ASI)
- Complexidade cognitiva maxima: 5

### Design System
O projeto segue um design system minimalista monocromatico inspirado no Ollama (documentado em `DESIGN.md`):
- Paleta exclusivamente grayscale (sem cores cromaticas na interface)
- Geometria pill-shaped (border-radius 9999px em elementos interativos)
- Zero shadows — separacao via background color e borders
- Componentes base em `src/components/ui/` (shadcn/ui customizado)

### API Client
O cliente HTTP e tipado via OpenAPI:
```typescript
import { api } from "@/lib/api"

// Tipagem automatica de path, params, body e response
const { data, error } = await api.GET("/gyms/search/{name}", {
  params: { path: { name }, query: { page } },
})
```

Tipos gerados a partir do backend com `pnpm generate:types` (executar na raiz do monorepo).

### Tratamento de Erros
Toda chamada API usa `ApiError` (classe em `lib/errors.ts`):
```typescript
function toApiError(error: unknown, fallbackStatus = 500): ApiError {
  if (error instanceof ApiError) return error
  const message = error instanceof Error ? error.message : mapStatusToMessage(fallbackStatus)
  return new ApiError(fallbackStatus, "network_error", message)
}
```
