# Review: Task 3.0 — Infra de dados e autenticação

**Revisor**: AI Code Reviewer (executar-task pipeline)
**Data**: 2025-11-28
**Arquivo da task**: 3_task.md
**Status**: APROVADO

## Resumo

A camada de infraestrutura de autenticação e dados foi entregue conforme PRD/TechSpec. Foram implementados:
auth-store Zustand com decodificação JWT, mapeador de erros (PT-BR), agendador proativo de refresh com singleton
para deduplicar concorrência, middleware de fetch para `openapi-fetch` (Bearer + retry-on-401 + replay),
fábrica de `QueryClient`, middleware Edge do Next.js para proteção de rotas autenticadas, schemas Zod de DTOs e
boot refresh no `RootProvider`. Todas as 11 subtarefas e os 6 testes obrigatórios estão entregues e verdes.

## Arquivos Revisados

| Arquivo | Status | Problemas |
|---------|--------|-----------|
| apps/frontend/src/lib/jwt.ts | ✅ OK | 0 |
| apps/frontend/src/lib/errors.ts | ✅ OK | 0 |
| apps/frontend/src/lib/auth/auth-store.ts | ✅ OK | 0 |
| apps/frontend/src/lib/auth/token-refresh.ts | ✅ OK | 0 |
| apps/frontend/src/lib/auth/auth-fetch-middleware.ts | ✅ OK | 0 |
| apps/frontend/src/lib/auth/schemas.ts | ✅ OK | 0 |
| apps/frontend/src/lib/api.ts | ✅ OK | 0 |
| apps/frontend/src/lib/query-client.ts | ✅ OK | 0 |
| apps/frontend/src/middleware.ts | ✅ OK | 0 |
| apps/frontend/src/app/providers.tsx | ✅ OK | 0 |
| apps/frontend/src/test/msw/handlers.ts | ✅ OK | 0 |
| apps/frontend/src/test/setup.ts | ✅ OK | 0 |
| apps/frontend/src/lib/jwt.test.ts | ✅ OK | 0 |
| apps/frontend/src/lib/errors.test.ts | ✅ OK | 0 |
| apps/frontend/src/lib/auth/auth-store.test.ts | ✅ OK | 0 |
| apps/frontend/src/lib/auth/token-refresh.test.ts | ✅ OK | 0 |
| apps/frontend/src/lib/auth/auth-fetch-middleware.test.ts | ✅ OK | 0 |
| apps/frontend/src/middleware.test.ts | ✅ OK | 0 |

## Critérios de Sucesso

- [x] `auth-store` armazena e limpa sessão corretamente — coberto por `auth-store.test.ts` (3 cenários).
- [x] Middleware de fetch injeta token em todas as requisições autenticadas — `auth-fetch-middleware.test.ts` afirma `Bearer` no header e ausência em `/sessions`.
- [x] Refresh concorrente resulta em apenas uma chamada — `token-refresh.test.ts` valida deduplicação via singleton promise.
- [x] Falha no refresh limpa store e dispara `onForcedLogout` — `token-refresh.test.ts` e `auth-fetch-middleware.test.ts`.
- [x] Agendador dispara refresh 60s antes de `expiresAt` sem chamadas duplicadas — `token-refresh.test.ts` com timers fakes.
- [x] Middleware Edge redireciona não-autenticados de rotas protegidas — `middleware.test.ts` cobre redirect com `redirect=` e fallback de cookie.

## Verificações Executadas

- `pnpm test` — **53 testes passando (13 arquivos)**.
- `pnpm tsc:check` — sem erros.
- `pnpm lint` (Biome) — sem erros.

## Conformidade com Skills

- **zustand**: store funcional, sem getters/setters extras, derivados via decodificação.
- **typescript-advanced**: `ApiClient = Client<paths>` derivado dos tipos do `@repo/api-types`.
- **tanstack-query-best-practices**: `createQueryClient` com `staleTime`, `retry: 1` (queries) / `retry: 0` (mutations).
- **tdd**: tests preceberam/acompanharam implementação para `auth-store`, `token-refresh`, `auth-fetch-middleware`, `jwt`, `errors`, `middleware`.
- **test-antipatterns**: HTTP mockado via MSW; nenhum mock de hooks ou React Query.
- **no-workarounds**: race condition resolvida por singleton promise (não por debounce arbitrário); replay de request usa clone do `Request` original capturado no `onRequest`.

## Riscos Mitigados

- **Race condition de refresh** — singleton promise em `TokenRefreshScheduler.refreshNow`; teste explícito com 3 chamadas simultâneas.
- **Perda de access token em hard reload** — `AuthProvider` consulta cookie sinalizador (`has_session`) e dispara `refreshNow()` no boot, exibindo skeleton até resolução.
- **Body de Request consumido no replay** — `onRequest` faz `request.clone()` antes do envio e usa o clone para o replay com novo token.

## Problemas Encontrados

Nenhum bloqueador. A spec do `/sessions/refresh` em `@repo/api-types` declara apenas `{ message: string }` como
resposta (descrição diz "New JWT access token"); por compatibilidade defensiva, `refreshAccessToken` aceita
`token`, `accessToken` ou `message` como portador do novo JWT. Quando a spec for refinada no backend, o trecho
pode ser estreitado.

## Conclusão

Task 3.0 entregue, testada e aprovada. Pronta para destravar tasks 5.0–10.0 (features autenticadas).
