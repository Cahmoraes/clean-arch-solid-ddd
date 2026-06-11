# Task 9: Integrar RouteGuard no FastifyAdapter e deletar handlers inline

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/backend-deepening-refactors-design.md`
**Depends on:** task-08

## Visão Geral

Substitui os 3 handlers de autenticação/autorização criados inline no `FastifyAdapter` (`AuthenticateHandler`, `AdminRoleCheck`, `CheckSessionRevokedHandler`) por uma única chamada ao `RouteGuard` (criado na task-08), injetado via DI. Deleta os 3 arquivos de handler.

Corrige de quebra o fire-and-forget `void adminRoleCheck.execute(role)` (fastify-adapter.ts:242) — com o guard, a rejeição de acesso interrompe a cadeia explicitamente.

**Comportamento preservado:** todos os business-flow tests de rotas protegidas (401 sem token, 403 member em rota admin, 401 sessão revogada) passam SEM alteração de assertions.

## Arquivos

- Modify: `apps/backend/src/shared/infra/server/fastify-adapter.ts`
- Delete: `apps/backend/src/shared/infra/server/services/authenticate-pre-handler.ts`
- Delete: `apps/backend/src/shared/infra/server/services/admin-role-check.ts`
- Delete: `apps/backend/src/shared/infra/server/services/check-session-revoked.ts`

### Conformidade com as Skills Padrão

- refactoring: Extract Class concluído — adapter HTTP vira pura tradução Fastify ↔ RouteGuard
- no-workarounds: deleção definitiva dos handlers; sem `container.get()` remanescente no fluxo de auth
- test-antipatterns: nenhuma assertion de business-flow muda — comportamento é o critério

## Passos

Todos os comandos rodam a partir da raiz do monorepo. Indentação: tab (Biome).

- **Step 1: Verificar que apenas o FastifyAdapter importa os handlers (pré-condição)**

Run: `grep -rn "authenticate-pre-handler\|admin-role-check\|check-session-revoked" apps/backend/src apps/backend/test --include="*.ts" | grep "import"`
Expected: apenas 3 linhas, todas em `fastify-adapter.ts`. Se houver outro importador, atualizá-lo antes de prosseguir.

- **Step 2: Substituir os imports no FastifyAdapter**

Em `apps/backend/src/shared/infra/server/fastify-adapter.ts`:

```typescript
// REMOVER (linhas ~17, 36-38)
import type { AuthToken } from "@/user/application/auth/auth-token"
import { AdminRoleCheck } from "./services/admin-role-check.js"
import { AuthenticateHandler } from "./services/authenticate-pre-handler.js"
import { CheckSessionRevokedHandler } from "./services/check-session-revoked.js"

// ADICIONAR
import type { RouteGuard } from "./guard/route-guard.js"
```

Os tipos Fastify `onRequestAsyncHookHandler` e `preHandlerAsyncHookHandler` deixam de ser usados após o Step 3 — remover do import de `fastify` se ficarem órfãos (o tipo `onRequestAsyncHookHandler` continua sendo usado pelo novo hook).

- **Step 3: Trocar a injeção de AuthToken por RouteGuard no construtor**

```typescript
// ANTES
	constructor(
		@inject(SHARED_TYPES.Tokens.Auth)
		private readonly authToken: AuthToken,
		@inject(SHARED_TYPES.Logger)
		private readonly logger: Logger,
		@inject(SHARED_TYPES.Queue)
		private readonly queue: Queue,
		@inject(SHARED_TYPES.PinoLogger)
		private readonly pinoLogger: FastifyBaseLogger,
	) {

// DEPOIS
	constructor(
		@inject(SHARED_TYPES.Server.RouteGuard)
		private readonly routeGuard: RouteGuard,
		@inject(SHARED_TYPES.Logger)
		private readonly logger: Logger,
		@inject(SHARED_TYPES.Queue)
		private readonly queue: Queue,
		@inject(SHARED_TYPES.PinoLogger)
		private readonly pinoLogger: FastifyBaseLogger,
	) {
```

E remover o binding de método que ficou órfão:

```typescript
// REMOVER
	private bindMethods(): void {
		this.authenticateOnRequest = this.authenticateOnRequest.bind(this)
	}
```

E a chamada `this.bindMethods()` no construtor.

- **Step 4: Substituir os 3 hooks pelo guard**

Em `register()` (linhas ~144-183), trocar:

```typescript
// ANTES
				{
					schema: fastifySchema,
					validatorCompiler:
						FastifyAdapter.makeValidatorCompiler(zodValidation),
					onRequest: this.authenticateOnRequestOrUndefined(
						handlerOptions.isProtected,
					),
					preHandler: [
						this.onlyAdminPreHandler(handlerOptions.onlyAdmin),
						this.checkSessionRevoked(handlerOptions.isProtected),
					],
					config: {
						rateLimit: this.resolveRateLimitConfig(handlerOptions.rateLimit),
					},
				},

// DEPOIS
				{
					schema: fastifySchema,
					validatorCompiler:
						FastifyAdapter.makeValidatorCompiler(zodValidation),
					onRequest: this.routeGuardOnRequest(handlerOptions),
					config: {
						rateLimit: this.resolveRateLimitConfig(handlerOptions.rateLimit),
					},
				},
```

Remover os métodos antigos (linhas ~228-264 e ~277-287):

```typescript
// REMOVER: authenticateOnRequestOrUndefined()
// REMOVER: onlyAdminPreHandler()
// REMOVER: checkSessionRevoked()
// REMOVER: authenticateOnRequest()
```

Adicionar o novo método (no lugar deles):

```typescript
	private routeGuardOnRequest(
		handlerOptions: HandlerOptions,
	): onRequestAsyncHookHandler | undefined {
		if (!handlerOptions.isProtected) return undefined
		return async (
			request: FastifyRequest,
			reply: FastifyReply,
		): Promise<void> => {
			const result = await this.routeGuard.guard(
				{ authorizationHeader: request.headers.authorization },
				{
					isProtected: handlerOptions.isProtected,
					onlyAdmin: handlerOptions.onlyAdmin,
				},
			)
			if (result.isFailure()) {
				const denied = result.forceFailure().value
				return reply.code(denied.status).send({ message: denied.message })
			}
			const user = result.forceSuccess().value
			if (user) {
				request.user = user
			}
		}
	}
```

> NOTA: `request.user` é tipado via declaration merging em `src/@types/custom.d.ts` com a mesma estrutura de `AuthenticatedUser` (sub.id/email/role/jwi, iat, exp) — a atribuição é compatível.

- **Step 5: Rodar tsc e os testes unitários**

Run: `pnpm --filter backend tsc:check && pnpm --filter backend test:run`
Expected: PASS. Se o tsc apontar imports órfãos no fastify-adapter (`AuthToken`, `preHandlerAsyncHookHandler`), removê-los.

- **Step 6: Rodar TODOS os business-flow tests (gate de comportamento)**

Run: `pnpm --filter backend test:business-flow`
Expected: 100% PASS **sem alterar nenhuma assertion**. Casos críticos cobertos pelos testes existentes:

- `promote-to-admin.business-flow-test.ts`: 401 sem JWT, 403 com token de MEMBER
- `logout.business-flow-test.ts`: 401 ao usar token de sessão revogada ("Session already revoked")
- `my-profile.business-flow-test.ts`: 401 sem token ("Unauthorized")

Se algum desses falhar, o guard divergiu do comportamento dos handlers antigos — investigar com systematic-debugging (provavelmente ordem das checagens: auth → admin → revogação) e corrigir o `JwtRouteGuard`, NÃO os testes.

- **Step 7: Deletar os 3 handlers antigos**

```bash
rm apps/backend/src/shared/infra/server/services/authenticate-pre-handler.ts
rm apps/backend/src/shared/infra/server/services/admin-role-check.ts
rm apps/backend/src/shared/infra/server/services/check-session-revoked.ts
```

Se o diretório `apps/backend/src/shared/infra/server/services/` ficar vazio, removê-lo: `rmdir apps/backend/src/shared/infra/server/services`

- **Step 8: Validação completa**

Run: `pnpm --filter backend biome:fix && pnpm --filter backend tsc:check && pnpm --filter backend test:run && pnpm --filter backend test:business-flow && pnpm --filter backend build && pnpm --filter backend fit:validate-dependencies`
Expected: tudo 100% PASS / zero issues / zero violações.

- **Step 9: Commit**

```bash
git add -A apps/backend/src
git commit -m "refactor(shared): route auth through RouteGuard, remove inline auth handlers from FastifyAdapter"
```

## Critérios de Sucesso

- `FastifyAdapter` injeta `RouteGuard` e não conhece mais nenhuma regra de autenticação/autorização
- Os 3 arquivos de handler deletados; zero `container.get()` no fluxo de auth
- Fire-and-forget `void adminRoleCheck.execute()` eliminado — rejeição interrompe a cadeia explicitamente
- TODOS os business-flow tests passam sem nenhuma alteração de assertion
- Validação completa passa 100%
