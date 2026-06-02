# Spec: Backend Deepening Refactors

**Data:** 2026-06-01
**Status:** Aprovado (decisões cristalizadas via skill improve-codebase-architecture)
**Glossário:** `apps/backend/CONTEXT.md`
**ADR relacionado:** `apps/backend/docs/adr/adr-001-manter-userquery-e-example-worker-como-material-de-estudo.md`

## Objetivo

Quatro refatorações de aprofundamento arquitetural no `apps/backend`, transformando módulos rasos em profundos: (1) tradução centralizada de erro de negócio → HTTP via categoria semântica; (2) extração da política de autenticação/autorização do FastifyAdapter para um módulo RouteGuard; (3) remoção de métodos mortos das interfaces de Repository; (4) Coordinate compartilhado como única fonte do cálculo de distância.

Nenhuma refatoração adiciona feature nova. O comportamento HTTP observável muda **apenas** onde corrige inconsistências documentadas (seção R1.5).

## R1 — DomainError com categoria semântica (Error Kind)

### R1.1 Classe base

Criar `src/shared/domain/error/domain-error.ts`:

- `ErrorKind` = `'conflict' | 'not-found' | 'unauthorized' | 'forbidden' | 'validation'`
- `abstract class DomainError extends Error` com `abstract readonly kind: ErrorKind`
- Erros de negócio estendem `DomainError`; o compilador força a declaração de `kind`

### R1.2 Tradução kind → HTTP status

Criar `src/shared/infra/controller/factory/error-kind-status.ts` — único módulo que conhece a tabela:

| kind | HTTP status |
|---|---|
| `conflict` | 409 |
| `not-found` | 404 |
| `unauthorized` | 401 |
| `forbidden` | 403 |
| `validation` | 422 |

`BaseController.createResponseByStatus()` verifica `error instanceof DomainError` e usa a tabela. Erros fora da hierarquia (ZodError, Error genérico) caem no fallback existente (400/500).

### R1.3 Tabela definitiva de kinds (44 erros)

**conflict (18):** UserAlreadyExistsError, UserAlreadyAdminError, PasswordUnchangedError, PasswordAlreadySetError, PasswordNotSetError, ExternalProviderNotLinkedError, UserHasAlreadyCheckedInToday, UserIsNotAdminError, GymAlreadyExistsError, GymWithCNPJAlreadyExistsError, DuplicateCheckInError, CheckInTimeExceededError, CheckInAlreadyRejectedError, MaxDistanceError, BillingCustomerNotProvisionedError, DuplicateWebhookEventError, ExternalProviderLinkRequiredError, GoogleAccountAlreadyLinkedError

**not-found (5):** UserNotFoundError, GymNotFoundError, CheckInNotFoundError, NotificationNotFoundError, SubscriptionNotFoundError

**unauthorized (6):** InvalidCredentialsError, InvalidUserTokenError, TokenAlreadyRevokedError, InvalidGoogleTokenError, InvalidResetTokenError, ReauthGrantInvalidError

**forbidden (4):** CannotDeleteSelfError, CannotDemoteSelfError, UserIsSuperAdminError, UserIsNotActiveError

**validation (11):** InvalidEmailError, InvalidNameLengthError, InvalidPhoneNumberError, UserMissingAuthenticationMethodError, InvalidGoogleIdError, InvalidCNPJError, InvalidLatitudeError, InvalidLongitudeError, InvalidDistanceError, InvalidIdError, GoogleEmailNotVerifiedError

**Não migram (erros técnicos, continuam `extends Error`):** ContractError, InvalidTransactionInstance, erros do circuit-breaker.

### R1.4 Política de overrides `mapResponseError()`

Regra: **um override sobrevive somente se produz um body que o default por kind não produz** (campo `code:`, mensagens contextuais/PT-BR).

**Removidos — comportamento idêntico (3):**
- `logout.controller.ts` (401 = unauthorized)
- `delete-user.controller.ts` (403/404 = forbidden/not-found)
- `update-my-profile.controller.ts` (404 = not-found)

**Removidos — corrigem inconsistência (8), ver R1.5:**
- `activate-user.controller.ts`, `suspend-user.controller.ts`, `update-user-profile.controller.ts`, `promote-to-admin.controller.ts`, `demote-from-admin.controller.ts` (mapeavam tudo/NotFound → 422)
- `check-in.controller.ts`, `validate-check-in.controller.ts`, `create-gym.controller.ts` (mapeavam tudo → 409)

**Mantidos intactos — body customizado (6):**
- `authenticate.controller.ts` (mensagem "Credenciais inválidas")
- `authenticate-with-google.controller.ts` (codes: external_account_link_required, …)
- `change-password.controller.ts` (codes: current_password_invalid, password_not_set)
- `create-password-reauth-grant.controller.ts` (codes)
- `define-password.controller.ts` (codes: password_already_set, …)
- `reset-password.controller.ts` (mensagem PT-BR + status 400)

### R1.5 Mudanças de comportamento HTTP aceitas (correções de inconsistência)

| Endpoint/Controller | Erro | Status antes | Status depois |
|---|---|---|---|
| activate-user, suspend-user, update-user-profile, promote-to-admin, demote-from-admin | UserNotFoundError | 422 | 404 |
| promote-to-admin | UserAlreadyAdminError | 422 | 409 |
| demote-from-admin | CannotDemoteSelfError | 422 | 403 |
| demote-from-admin | UserIsNotAdminError | 422 | 409 |
| check-in | UserNotFoundError / GymNotFoundError | 409 | 404 |
| validate-check-in | CheckInNotFoundError | 409 | 404 |
| create-gym | InvalidCNPJError (erro único) | 409 | 422 |

Business-flow tests que assertam os status antigos devem ser atualizados — qualquer outra falha de teste é regressão.

### R1.6 Limpeza final

Após migração completa: remover de `BaseController` os sets `CONFLICT_ERRORS`/`UNAUTHORIZED_ERRORS` e as heurísticas `endsWith("NotFoundError")` / `startsWith("Invalid")`. Mantém-se: tratamento de ZodError (400), arrays de erros de validação (422), hook `mapResponseError()` e fallback 500.

## R2 — RouteGuard

### R2.1 Módulo

Criar `src/shared/infra/server/guard/`:

- `route-guard.ts` — interface `RouteGuard`, tipos `RoutePolicy`, `GuardRequest`, `AuthenticatedUser`, `AccessDenied`
- `jwt-route-guard.ts` — implementação `JwtRouteGuard` com DI (`AuthToken`, `RevokedTokenDAO`, `Logger`)

Interface: `guard(request: GuardRequest, policy: RoutePolicy): Promise<Either<AccessDenied, AuthenticatedUser | null>>`

Comportamento (mesma ordem da cadeia atual):
1. Rota não protegida → `success(null)`
2. Sem token ou token inválido → `failure({ status: 401, message: "Unauthorized" })`
3. `onlyAdmin` e role ≠ ADMIN → `failure({ status: 403, message: "Forbidden" })`
4. Sessão revogada (por jwi ou revokedAfterForUser/iat) → `failure({ status: 401, message: "Session already revoked" })`
5. Tudo ok → `success(authenticatedUser)`

### R2.2 Integração

- Novo symbol `SHARED_TYPES.RouteGuard`, binding `JwtRouteGuard` em `infra-module.ts` (singleton)
- `FastifyAdapter` injeta `RouteGuard`; o hook `onRequest` da rota chama `guard()` e traduz o `Either` para reply
- Deletar: `services/authenticate-pre-handler.ts`, `services/admin-role-check.ts`, `services/check-session-revoked.ts`
- Corrige o fire-and-forget `void adminRoleCheck.execute(role)` (fastify-adapter.ts:242)
- Tipo `TokenPayload` (hoje em authenticate-pre-handler.ts) move para o guard como `AuthenticatedUser`

### R2.3 Comportamento preservado

Todos os business-flow tests de rotas protegidas (401 sem token, 403 member em rota admin, 401 sessão revogada) passam sem alteração de assertions.

## R3 — Limpeza de interfaces de Repository

### R3.1 UserRepository.delete()

Remover de: interface (`user-repository.ts:11`), `PrismaUserRepository` (138-144), `SQLiteUserRepository` (183-192), `InMemoryUserRepository` (64-66), `PgUserRepository` (20-22). Zero callers (soft-delete usa `user.delete()` + `update()`).

### R3.2 SubscriptionRepository.ofId() / ofUserId()

Remover de: interface (`subscription-repository.ts:6-7`), `PrismaSubscriptionRepository` (65-77), `InMemorySubscriptionRepository` (22-28).

Migrar 2 testes que usam `ofUserId()` para `ofCustomerId()`:
- `create-subscription.controller.business-flow-test.ts:79` → `ofCustomerId("cus_existing_billing")`
- `create-subscription.usecase.test.ts:48` → `ofCustomerId(input.customerId)`

### R3.3 Fora de escopo (ADR-001)

`UserQuery` e `src/example-worker/` NÃO são removidos — material de estudo intencional.

## R4 — Coordinate compartilhado

### R4.1 Movimentação

| Artefato | De | Para |
|---|---|---|
| `Coordinate` (+ teste) | `check-in/domain/value-object/` | `shared/domain/value-object/` |
| `InvalidLatitudeError` | `check-in/domain/error/` | `shared/domain/error/` |
| `InvalidLongitudeError` | `check-in/domain/error/` | `shared/domain/error/` |
| `DistanceCalculator` (+ teste) | `check-in/domain/service/` | **DELETADO** |

### R4.2 Novo comportamento

`Coordinate.distanceTo(other: Coordinate): number` — cálculo Haversine (km), única fonte de verdade. `Distance.value` delega para `this._from.distanceTo(this._to)`.

### R4.3 Imports atualizados

- `gym/domain/gym.ts`, `gym/application/repository/gym-repository.ts`, `gym/application/use-case/fetch-nearby-gym.usecase.ts`, `shared/infra/database/repository/prisma/prisma-gym-repository.ts` → importam de `@/shared/domain/...`
- `shared/infra/database/repository/in-memory/in-memory-gym-repository.ts` → usa `Coordinate.distanceTo()` em vez de `DistanceCalculator`
- `check-in/domain/value-object/distance.ts` → importa Coordinate de shared
- Interface local `Coordinate` em `check-in.usecase.ts:43-46` permanece (DTO de input, não a classe)

## Critérios de aceite globais

Validação obrigatória (CLAUDE.md), na raiz do monorepo:

```bash
pnpm --filter backend biome:fix      # zero issues
pnpm --filter backend tsc:check      # zero erros
pnpm --filter backend test:run       # 100% pass
pnpm --filter backend test:business-flow  # 100% pass (com assertions atualizadas conforme R1.5)
pnpm --filter backend build          # sucesso
pnpm --filter backend fit:validate-dependencies  # zero violações
```
