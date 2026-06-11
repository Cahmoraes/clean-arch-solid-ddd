# Tech Spec - Frontend Web App (GymPass-like)

## Resumo Executivo

A aplicação será construída sobre o Next.js 16 (App Router) + React 19 já instalados em `apps/frontend`, adotando uma estratégia **híbrida de renderização**: React Server Components (RSC) para superfícies públicas (landing, páginas estáticas) e Client Components para o restante da experiência autenticada. O consumo do backend será feito através de um cliente tipado central (`openapi-fetch` + `@repo/api-types`) orquestrado por TanStack Query (server state) e Zustand (UI state mínima). Autenticação é **híbrida**: o backend já emite refresh-token em cookie httpOnly e devolve `accessToken` no body — o access token é mantido **em memória** num store dedicado e renovado de forma proativa antes da expiração através de um interceptor de fetch.

A camada visual usa **Tailwind CSS v4** + **shadcn/ui** (Radix primitives) customizados ao `DESIGN.md` (paleta monocromática, geometria pill-shaped, SF Pro Rounded, sem sombras nem gradientes). Formulários utilizam React Hook Form + Zod (resolver). A estratégia de testes combina Vitest + Testing Library (unit/integration) e Playwright (E2E) cobrindo os fluxos críticos do PRD (onboarding, check-in, administração).

## Arquitetura do Sistema

### Visão Geral dos Componentes

A organização adota uma arquitetura **feature-sliced** dentro de `apps/frontend/src`:

- `src/app/` (existente, modificado) — App Router. Layouts, route groups `(public)` e `(authenticated)`, route handlers utilitários (proxy de logout/refresh quando necessário), página raiz (landing).
- `src/features/` (novo) — pastas por domínio funcional do PRD: `auth`, `profile`, `gyms`, `check-ins`, `subscriptions`, `admin`. Cada feature contém: `api/` (queries/mutations TanStack Query tipadas), `components/` (UI específica), `schemas/` (Zod), `hooks/` (uso composto).
- `src/lib/` (modificado) — infraestrutura compartilhada:
  - `api.ts` (existente, evoluído) — instância `openapi-fetch` com middleware de auth e error normalization.
  - `auth/` (novo) — `auth-store.ts` (Zustand) com access token + claims; `token-refresh.ts` (agendador proativo); `auth-fetch-middleware.ts` (injeção do `Authorization` e retry-on-401).
  - `query-client.ts` (novo) — fábrica do `QueryClient` com defaults compartilhados (extraído de `providers.tsx`).
  - `errors.ts` (novo) — `ApiError`, mapeamento `status → mensagem amigável` (alimenta RF-24).
  - `jwt.ts` (novo) — decodificação de payload JWT (sem verificar assinatura — apenas para hint de role/exp).
- `src/components/ui/` (novo) — primitivos shadcn/ui customizados (Button, Input, Dialog, Toast, Tabs, DropdownMenu, Pagination, Skeleton, EmptyState).
- `src/components/layout/` (novo) — shells de página: `PublicShell`, `AuthenticatedShell` (com header, navegação, menu de usuário responsivo).
- `src/middleware.ts` (novo) — middleware Edge do Next.js que protege route groups autenticados verificando a presença de cookie de refresh; redireciona não-autenticados para `/login` (RF-08).
- `src/test/` (novo) — setup Vitest, MSW handlers de API, helpers de render com providers.

**Fluxo de dados**:

1. Componente cliente invoca `useQuery`/`useMutation` (do TanStack Query) das pastas `features/<x>/api/`.
2. Essas hooks chamam funções tipadas baseadas em `openapi-fetch` (`api.GET("/users/me", …)` etc.).
3. O middleware de fetch injeta `Authorization: Bearer <accessToken>` lido do `auth-store`.
4. Em `401`, o middleware tenta `POST /sessions/refresh` (cookie httpOnly viaja sozinho) — sucesso atualiza o store e replays a request original; falha definitiva limpa o store, invalida queries e redireciona para `/login` (RF-07).
5. Erros normalizados (via `errors.ts`) viram mensagens amigáveis em toasts/alerts.

## Design de Implementação

### Interfaces Principais

```ts
// src/lib/auth/auth-store.ts
interface AuthState {
  accessToken: string | null
  expiresAt: number | null   // ms epoch
  user: { id: string; role: "MEMBER" | "ADMIN" } | null
  setSession(token: string): void
  clear(): void
}

// src/lib/api.ts (cliente tipado central)
type Api = ReturnType<typeof createClient<paths>>
export const api: Api // singleton com middleware de auth/erro

// src/lib/auth/token-refresh.ts
interface TokenRefreshScheduler {
  start(): void          // arma timer para 60s antes de exp
  stop(): void
  refreshNow(): Promise<void>
}

// src/features/<domain>/api (padrão)
export function useGymsByName(name: string, page: number)
  : UseQueryResult<GymsListResponse>
export function useCreateCheckIn()
  : UseMutationResult<CheckIn, ApiError, CreateCheckInInput>

// src/lib/errors.ts
class ApiError extends Error {
  constructor(public status: number, public code: string,
              public userMessage: string, public details?: unknown)
}
```

### Modelos de Dados

Tipos de payload (request/response) **não são redefinidos** — usam-se diretamente os exportados de `@repo/api-types` via helpers do `openapi-fetch`:

```ts
type Paths = paths
type LoginBody = Paths["/sessions"]["post"]["requestBody"]["content"]["application/json"]
type Me = Paths["/users/me"]["get"]["responses"]["200"]["content"]["application/json"]
```

Modelos de domínio do frontend (apenas quando agregam UI):

- `Session` = `{ accessToken: string; expiresAt: number; user: { id; role } }` (derivado do JWT decodificado).
- `Paginated<T>` = `{ items: T[]; page: number; total: number }` (helper para listas).
- `FormStatus` = união discriminada `{ status: "idle" | "submitting" | "error" | "success"; error?: ApiError }`.

Schemas Zod por feature espelham as restrições do backend (ex: `loginSchema`, `signupSchema`, `changePasswordSchema`, `createGymSchema`) e alimentam tanto validação client-side quanto inferência de tipos.

### Endpoints de API (consumidos)

Todos do backend já existente, sem mudanças:

- `POST /users` — cadastro (RF-01)
- `PATCH /users/activate` ou equivalente — ativação por token (RF-02) [usar conforme spec]
- `POST /sessions` — login (RF-03), persiste refresh em cookie httpOnly
- `POST /sessions/refresh` — refresh proativo (RF-06)
- `POST /sessions/logout` — logout (RF-04)
- `PATCH /users/me/change-password` — alteração de senha (RF-05)
- `GET /users/me`, `GET /users/me/metrics` — perfil e métricas (RF-09–RF-11)
- `GET /users/{userId}` — perfil público (RF-12)
- `GET /users` (paginado) — admin (RF-21)
- `GET /gyms`, `GET /gyms/search/{name}` — listagem/busca (RF-13)
- `GET /gyms/{id}` (se existente na spec) — detalhes (RF-14)
- `POST /gyms` — cadastro admin (RF-15)
- `POST /check-ins`, `GET /check-ins` (paginado) — criar/listar (RF-16, RF-17)
- `PATCH /check-ins/validate` — validação admin (RF-18)
- `POST /subscriptions` — assinatura demo (RF-19, RF-20)

### Rotas do App Router

- `(public)/page.tsx` — landing (RSC)
- `(public)/login`, `(public)/cadastro`, `(public)/ativar/[token]`
- `(authenticated)/perfil`, `(authenticated)/perfil/senha`
- `(authenticated)/academias`, `(authenticated)/academias/[id]`
- `(authenticated)/check-ins` (histórico)
- `(authenticated)/assinatura`
- `(authenticated)/admin/usuarios`, `(authenticated)/admin/academias/nova`, `(authenticated)/admin/check-ins`
- Todos sob `(authenticated)` carregam `AuthenticatedShell`; rotas `admin/*` aplicam guarda extra de role no layout.

## Pontos de Integração

- **Backend HTTP**: única integração externa. Base URL via `NEXT_PUBLIC_API_URL` (já configurado).
- **Autenticação**:
  - Refresh token vive em cookie httpOnly emitido pelo backend (não acessado pelo JS).
  - Access token em memória; perdido em hard reload — recuperado por `POST /sessions/refresh` no boot do app (provider raiz dispara `refreshNow()` se cookie indicar sessão).
  - Timeout: requisições com `AbortSignal.timeout(15_000)`; retry de leitura via React Query (max 1) — mutações nunca retentadas automaticamente para preservar idempotência.
- **Tratamento de erros**: middleware converte `error` do `openapi-fetch` em `ApiError` com `userMessage` traduzida; consumidor decide entre toast inline ou `error boundary` da rota.

## Abordagem de Testes

### Testes Unidade

- **Vitest + @testing-library/react + jsdom**.
- Alvos: `auth-store`, `token-refresh` (timers fakes), `jwt` decoder, `errors` mapper, schemas Zod, hooks de feature críticas (ex: `useCreateCheckIn`).
- **Mocks**: apenas o transporte HTTP via **MSW**; não mockar React Query nem componentes próprios.
- Cenários: login feliz/erro 401, refresh agendado dispara antes do `expiresAt`, refresh falha 401 limpa store e dispara redirect, role admin oculta/exibe ações.

### Testes de Integração

- Render de telas reais (login, busca de academias, check-in, dashboard admin) com providers (`QueryClientProvider`, `MemoryRouter` equivalente do App Router via `next-router-mock`/wrapper) e MSW devolvendo respostas tipadas a partir do `paths`.
- Foco em estados de loading/empty/error (RF-23 a RF-25) e proteção de rotas/role.

### Testes de E2E

- **Playwright** rodando contra backend real (`apps/backend` em modo dev) via Turborepo.
- Fluxos: (1) onboarding completo (cadastro → ativação → login → primeiro check-in); (2) admin valida check-in; (3) renovação transparente de sessão (espera além do `expiresAt` mockado curto e confirma que continua autenticado).
- Configuração de ambiente: `playwright.config.ts` com `webServer` levantando `pnpm --filter frontend dev` e `pnpm --filter backend dev` quando rodado localmente.

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. **Infra de UI** — Tailwind v4 + tokens do `DESIGN.md` em `globals.css`; instalar shadcn/ui e gerar primitivos base (Button, Input, Dialog, Toast, Skeleton, EmptyState). Sem dependências de domínio.
2. **Infra de dados/auth** — `auth-store` (Zustand), `jwt`, `errors`, `auth-fetch-middleware`, `token-refresh`, fábrica do `QueryClient`, `middleware.ts` de proteção de rotas. Pré-requisito de toda feature autenticada.
3. **Auth (F1)** — telas públicas `login`, `cadastro`, `ativar/[token]`, `change-password`, fluxo de logout. Desbloqueia tudo mais.
4. **Shell autenticado + Perfil/Métricas (F2)** — `AuthenticatedShell`, navegação responsiva, página `/perfil` consumindo `/users/me` e `/users/me/metrics`.
5. **Academias (F3)** — busca, listagem, detalhes; admin: cadastro de academia.
6. **Check-ins (F4)** — criação a partir de detalhes, histórico paginado, validação admin.
7. **Assinatura (F5)** — fluxo demo com aviso de não-cobrança.
8. **Admin (F6)** — dashboard de usuários, agrupando ações já criadas.
9. **Polimento de feedback (F7)** — auditoria de loading/empty/error em todas as telas, toasts globais, error boundaries.
10. **Testes E2E + acessibilidade** — varredura final com Playwright e checklist de acessibilidade do PRD.

### Dependências Técnicas

- Backend `apps/backend` rodando para integração e E2E (já existente).
- `@repo/api-types` regenerado quando spec mudar (já em workspace).
- Adições de runtime: `tailwindcss@^4`, `@tailwindcss/postcss`, `zustand`, `react-hook-form`, `zod`, `@hookform/resolvers`, primitivos `@radix-ui/*` que o shadcn introduzir, `clsx`, `tailwind-merge`, `lucide-react` (ícones), `sonner` (toasts).
- Adições de dev: `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `msw`, `@playwright/test`.

## Monitoramento e Observabilidade

Como aplicação web cliente, não expomos métricas Prometheus diretamente. A estratégia é:

- **Logs estruturados no console** em desenvolvimento (`console.debug` filtrável por flag `NEXT_PUBLIC_LOG_LEVEL`).
- **Eventos de erro** capturados em `error.tsx` por route group; estrutura preparada para plugar Sentry/Datadog em entrega futura (sem instalar nesta entrega).
- **Métricas Web Vitals** via `reportWebVitals` do Next.js encaminhadas para `console` por padrão (hook isolado em `lib/observability.ts` para troca futura).
- **Auditoria de sessão**: `auth-store` emite eventos (`login`, `refresh`, `logout`, `forced-logout`) em um `EventTarget` interno consumível por testes e por futuro provedor de telemetria.

## Considerações Técnicas

### Decisões Principais

- **Auth híbrida (token em memória + cookie httpOnly de refresh)**: alinhada ao que o backend já entrega (cookie httpOnly + token no body). Evita XSS contra refresh sem forçar BFF (que duplicaria roteamento). Trade-off: hard reload exige um round-trip de refresh — aceitável.
- **TanStack Query como server-state store**: já instalado; cobre cache, invalidação, retries e estados (loading/empty/error) que o RF-23–25 exige sem reinventar.
- **Tailwind v4 + shadcn/ui**: máxima velocidade para entregar primitivos acessíveis (Radix) com customização total ao `DESIGN.md`. Alternativa rejeitada: CSS Modules puros — mais código por componente, menos accessibility out-of-the-box.
- **React Hook Form + Zod**: padrão maduro com baixo re-render; Zod schemas reutilizáveis em mutations e Server Actions futuras. Alternativa rejeitada: TanStack Form (menor adoção/comunidade hoje).
- **Zustand para UI state**: leve, sem boilerplate, sem Context drilling. Alternativa rejeitada: Context puro (rerenders amplos).
- **Renderização híbrida (RSC público + Client autenticado)**: mantém landing rápida/SEO-friendly e simplifica o gerenciamento de auth em memória nas áreas autenticadas. Alternativa rejeitada: tudo com Server Actions (forçaria sessão server-side e duplicaria fluxo de auth).
- **Role gating combinado (JWT + /users/me)**: JWT permite UI imediata sem round-trip extra; `/users/me` confirma e protege contra adulteração visual. Backend continua sendo a única fonte real de autorização.

### Riscos Conhecidos

- **Race condition no refresh** quando várias requisições recebem 401 simultaneamente. Mitigação: singleton promise no `token-refresh` (deduplicação de chamadas concorrentes).
- **Perda de access token em hard reload** prejudicaria UX se backend estiver lento. Mitigação: `RootProvider` aciona refresh apenas se cookie de sessão existir (heurística via cookie não-httpOnly opcional sinalizador) e exibe skeleton enquanto resolve.
- **Compatibilidade Next.js 16**: APIs podem divergir do conhecimento do agente (ver `apps/frontend/AGENTS.md`). Mitigação: consultar `node_modules/next/dist/docs/` antes de implementar middleware/route handlers/Server Actions.
- **shadcn/ui + Tailwind v4**: o gerador padrão pode ainda referenciar Tailwind v3. Mitigação: validar templates e ajustar config (PostCSS, `@import "tailwindcss"`) — pesquisar antes de instalar.
- **Acessibilidade vs paleta monocromática**: contraste em estados disabled/placeholder requer atenção. Mitigação: validar com `axe-core` no Playwright em telas críticas.

### Conformidade com Skills Padrões

Skills de `.github/skills` aplicáveis a esta tech spec:

- `tanstack-query-best-practices` — orientação para queries/mutations e invalidação.
- `tanstack-router-best-practices` — referência geral de roteamento (parcialmente aplicável; usaremos App Router do Next).
- `vercel-react-best-practices`, `vercel-composition-patterns` — composição RSC/Client.
- `zod` — schemas e inferência de tipos.
- `zustand` — auth store e UI state.
- `vitest` — setup de testes unitários.
- `ui-ux-pro-max` — aderência ao `DESIGN.md` (shadcn/ui).
- `typescript-advanced` — uso intensivo dos tipos derivados de `paths`.
- `tdd` — quando implementar componentes críticos de auth/check-in.
- `test-antipatterns` — disciplina ao usar MSW em vez de mocks de hooks.
- `no-workarounds` — preferir corrigir causa-raiz em integrações com Next 16/Tailwind 4.
- `playwright-cli` — validações E2E. Utilizar para testes E2E com frontend.

### Arquivos relevantes e dependentes

Existentes (modificados):

- `apps/frontend/package.json` — adicionar deps listadas em "Dependências Técnicas".
- `apps/frontend/src/app/layout.tsx` — fontes (SF Pro Rounded fallback), classes Tailwind base, integração de Toaster.
- `apps/frontend/src/app/providers.tsx` — extrair `QueryClient` para `lib/query-client.ts`, adicionar `AuthProvider` (boot refresh) e `Toaster`.
- `apps/frontend/src/app/page.tsx` — substituir scaffold por landing.
- `apps/frontend/src/app/globals.css` — tokens do `DESIGN.md` + diretivas Tailwind v4.
- `apps/frontend/src/lib/api.ts` — instalar middlewares de auth e error.
- `apps/frontend/next.config.ts` — eventuais headers de segurança.
- `apps/frontend/biome.json` — ignorar gerados/Playwright se necessário.
- `apps/frontend/tsconfig.json` — paths para `@/features/*`, `@/lib/*`, `@/components/*`.

Novos (alto nível, lista não exaustiva):

- `apps/frontend/src/middleware.ts`
- `apps/frontend/src/lib/{auth/*,errors.ts,jwt.ts,query-client.ts,observability.ts}`
- `apps/frontend/src/components/{ui/*,layout/*}`
- `apps/frontend/src/features/{auth,profile,gyms,check-ins,subscriptions,admin}/{api,components,schemas,hooks}`
- `apps/frontend/src/app/(public)/{page.tsx,login,cadastro,ativar}` e `(authenticated)/{perfil,academias,check-ins,assinatura,admin}`
- `apps/frontend/src/test/{setup.ts,msw/handlers.ts,render.tsx}`
- `apps/frontend/playwright.config.ts`, `apps/frontend/e2e/*.spec.ts`
- `apps/frontend/vitest.config.ts`

Dependentes (consumidos, não modificados): `packages/api-types/index.d.ts`, `apps/backend/docs/openapi-spec.json`, `apps/backend/docs/openapi-client-usage.md`.
