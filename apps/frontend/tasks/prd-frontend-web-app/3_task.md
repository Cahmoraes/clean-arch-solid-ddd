# Tarefa 3.0: Infra de dados e autenticação

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Construir toda a infraestrutura de dados e autenticação que sustenta as features autenticadas: store Zustand de sessão, decoder JWT, mapeador de erros, middleware de fetch com injeção de token e retry-on-401, agendador proativo de refresh, fábrica do QueryClient e middleware Edge de proteção de rotas. Esta task é pré-requisito de todas as features autenticadas (tasks 5.0 a 10.0).

<skills>
### Conformidade com Skills Padrões

- `zustand` — auth store e padrões de estado
- `typescript-advanced` — tipos derivados de `paths` do openapi-fetch, tipos do AuthState
- `tanstack-query-best-practices` — configuração de defaults do QueryClient
- `tdd` — implementar auth-store e token-refresh com testes primeiro
- `test-antipatterns` — usar MSW para mockar HTTP; não mockar React Query
- `no-workarounds` — corrigir causa-raiz em race conditions de refresh
</skills>

<requirements>
- `auth-store.ts` (Zustand): mantém `accessToken`, `expiresAt` e `user` em memória; expõe `setSession` e `clear`
- `jwt.ts`: decodifica payload JWT sem verificar assinatura (apenas extrai `exp`, `sub`, `role`)
- `errors.ts`: classe `ApiError` com `status`, `code`, `userMessage`; mapeamento `status → mensagem amigável` em PT-BR
- `auth-fetch-middleware.ts`: injeta `Authorization: Bearer` na request; em 401 tenta refresh (singleton promise para deduplicar concorrência), replay da request original; falha definitiva limpa store e redireciona para `/login`
- `token-refresh.ts`: agendador proativo que dispara refresh 60s antes do `expiresAt`; singleton promise para deduplicar chamadas concorrentes
- `query-client.ts`: fábrica do `QueryClient` com defaults: `staleTime`, `retry: 1` para queries, `retry: 0` para mutations, `AbortSignal.timeout(15_000)`
- `middleware.ts` (Edge): verifica cookie de refresh; redireciona para `/login` se ausente em rotas `(authenticated)`
- `RootProvider` em `providers.tsx`: no boot, dispara `refreshNow()` se cookie sinalizador existir; exibe skeleton enquanto resolve
</requirements>

## Subtarefas

- [ ] 3.1 Instalar `zustand`
- [ ] 3.2 Criar `src/lib/auth/auth-store.ts` com interface `AuthState` e implementação Zustand
- [ ] 3.3 Criar `src/lib/jwt.ts` com função `decodeJwt(token): { sub, role, exp }` sem verificação de assinatura
- [ ] 3.4 Criar `src/lib/errors.ts` com classe `ApiError` e função `mapStatusToMessage(status): string`
- [ ] 3.5 Criar `src/lib/auth/token-refresh.ts` com `TokenRefreshScheduler` (start, stop, refreshNow); implementar singleton promise para deduplicar refreshes concorrentes
- [ ] 3.6 Criar `src/lib/auth/auth-fetch-middleware.ts`: middleware para `openapi-fetch` que injeta Bearer e faz retry-on-401 usando o singleton de refresh
- [ ] 3.7 Evoluir `src/lib/api.ts` para instanciar `openapi-fetch` com `@repo/api-types` e registrar middleware de auth e de normalização de erros
- [ ] 3.8 Criar `src/lib/query-client.ts` com fábrica do `QueryClient` e defaults conforme spec
- [ ] 3.9 Criar `src/middleware.ts` (Edge Next.js) que protege matcher `/(authenticated)/**` verificando cookie de refresh
- [ ] 3.10 Atualizar `src/app/providers.tsx`: extrair QueryClient para `query-client.ts`, adicionar `AuthProvider` que executa boot refresh
- [ ] 3.11 Adicionar handlers MSW em `src/test/msw/handlers.ts` para: `POST /sessions`, `POST /sessions/refresh`, `POST /sessions/logout`

## Detalhes de Implementação

Ver `techspec.md` → seções **Interfaces Principais**, **Fluxo de dados**, **Pontos de Integração** (Autenticação, Tratamento de erros) e **Riscos Conhecidos** (race condition no refresh, perda de token em hard reload).

## Critérios de Sucesso

- `auth-store` armazena e limpa sessão corretamente
- Middleware de fetch injeta token em todas as requisições autenticadas
- Refresh concorrente (múltiplos 401 simultâneos) resulta em apenas uma chamada a `POST /sessions/refresh`
- Falha no refresh limpa store e redireciona para `/login`
- Agendador dispara refresh 60s antes do `expiresAt` sem chamadas duplicadas
- Middleware Edge redireciona visitantes não autenticados de rotas protegidas

## Testes da Tarefa

- [ ] Teste de unidade: `auth-store` — `setSession` armazena token e claims; `clear` zera tudo
- [ ] Teste de unidade: `jwt.ts` — decodifica corretamente um JWT fake; retorna null para token inválido
- [ ] Teste de unidade: `errors.ts` — `mapStatusToMessage` retorna mensagem amigável para 401, 403, 404, 422, 500
- [ ] Teste de unidade: `token-refresh.ts` — timer dispara refresh 60s antes de `expiresAt`; múltiplas chamadas simultâneas a `refreshNow` resultam em apenas uma requisição (mock MSW)
- [ ] Teste de unidade: `auth-fetch-middleware.ts` — injeta Bearer; em 401 faz refresh e replay; em 401 definitivo chama `auth-store.clear`
- [ ] Teste de integração: `middleware.ts` Edge — requisição sem cookie redireciona para `/login`; com cookie passa adiante

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `apps/frontend/src/lib/auth/auth-store.ts`
- `apps/frontend/src/lib/auth/token-refresh.ts`
- `apps/frontend/src/lib/auth/auth-fetch-middleware.ts`
- `apps/frontend/src/lib/jwt.ts`
- `apps/frontend/src/lib/errors.ts`
- `apps/frontend/src/lib/api.ts`
- `apps/frontend/src/lib/query-client.ts`
- `apps/frontend/src/middleware.ts`
- `apps/frontend/src/app/providers.tsx`
- `apps/frontend/src/test/msw/handlers.ts`
