# Task 2: Correção BOLA/IDOR no MetricsController

**Status:** DONE
**PRD:** N/A
**Spec:** `../../../../apps/backend/reports/security-review-2026-05-18.md`

## Visão Geral

O endpoint `GET /check-ins/metrics/:userId` está protegido por JWT mas não verifica se o usuário autenticado é o dono dos dados (ou um ADMIN). Qualquer usuário MEMBER pode consultar a contagem de check-ins de qualquer outro usuário fornecendo o UUID alvo na rota.

O padrão de correção já existe no codebase: `UserProfileController` e `MyCheckInsController` fazem `requesterId !== targetId && !isAdmin → FORBIDDEN`. Esta tarefa replica esse padrão no `MetricsController`.

## Arquivos

- Modify: `apps/backend/src/check-in/infra/controller/metrics.controller.ts`
- Modify: `apps/backend/src/check-in/infra/controller/check-in-metrics.business-flow-test.ts`

### Conformidade com as Skills Padrão

- test-driven-development: escrever testes falhando antes de implementar
- no-workarounds: implementar verificação real de ownership, não apenas ocultar o endpoint

## Passos

- [ ] **Step 1: Escrever o teste falhando — MEMBER tentando acessar métricas de outro usuário**

Abra `apps/backend/src/check-in/infra/controller/check-in-metrics.business-flow-test.ts` e adicione o seguinte describe block ao final do arquivo, dentro do `describe` principal (antes do fechamento `}`):

```typescript
describe("Controle de acesso", () => {
  let attackerToken: string
  const victimId = "victim-user-id"

  beforeEach(async () => {
    await createAndSaveUser({
      userRepository,
      id: victimId,
      email: "victim@user.test",
      password: "any_password",
    })
    await createAndSaveUser({
      userRepository,
      id: "attacker-user-id",
      email: "attacker@user.test",
      password: "any_password",
    })
    const attackerResult = await authenticate.execute({
      email: "attacker@user.test",
      password: "any_password",
    })
    attackerToken = attackerResult.force.success().value.token
  })

  test("Deve retornar 403 quando MEMBER tenta acessar métricas de outro usuário", async () => {
    const response = await request(fastifyServer.server)
      .get(metricsUrl(victimId))
      .set("Authorization", `Bearer ${attackerToken}`)

    expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
  })

  test("ADMIN deve poder acessar métricas de qualquer usuário", async () => {
    const adminRepository = userRepository
    await createAndSaveUser({
      userRepository: adminRepository,
      id: "admin-user-id",
      email: "admin@user.test",
      password: "any_password",
      role: "ADMIN",
    })
    const adminResult = await authenticate.execute({
      email: "admin@user.test",
      password: "any_password",
    })
    const adminToken = adminResult.force.success().value.token

    const response = await request(fastifyServer.server)
      .get(metricsUrl(victimId))
      .set("Authorization", `Bearer ${adminToken}`)

    expect(response.status).toBe(HTTP_STATUS.OK)
  })
})
```

> Nota: `createAndSaveUser` já aceita `role: "ADMIN"` (ver `test/factory/create-and-save-user.ts`). O import de `HTTP_STATUS` já está no arquivo.

- [ ] **Step 2: Executar para confirmar que os novos testes falham**

```bash
pnpm --filter backend test:run -- -t "Controle de acesso"
```

Esperado:
```
✗ Deve retornar 403 quando MEMBER tenta acessar métricas de outro usuário
  → Expected: 403, Received: 200

✗ ADMIN deve poder acessar métricas de qualquer usuário
  → Expected: 200, Received: 200  (este pode passar já — o BOLA só faz diferença para MEMBER)
```

> Se o teste de ADMIN já passar (esperado: sempre retorna 200 independente de role), está correto — ele confirma que o ADMIN não deve ser bloqueado após a correção.

- [ ] **Step 3: Implementar o ownership check no MetricsController**

Substitua o método `callback` em `apps/backend/src/check-in/infra/controller/metrics.controller.ts`:

**Antes:**
```typescript
private async callback(req: FastifyRequest) {
  const parsedRequest = this.parseRequest(metricsRequestSchema, req.params)
  if (parsedRequest.isFailure()) {
    return this.createResponseError(parsedRequest)
  }

  const metrics = await this.userMetricsUseCase.execute(parsedRequest.value)
  return ResponseFactory.create({
    status: HTTP_STATUS.OK,
    body: metrics,
  })
}
```

**Depois:**
```typescript
private async callback(req: FastifyRequest) {
  const parsedRequest = this.parseRequest(metricsRequestSchema, req.params)
  if (parsedRequest.isFailure()) {
    return this.createResponseError(parsedRequest)
  }

  const requesterId = req.user.sub.id
  const targetId = parsedRequest.value.userId
  const isAdmin = req.user.sub.role === "ADMIN"
  if (requesterId !== targetId && !isAdmin) {
    return ResponseFactory.FORBIDDEN({ message: "Forbidden" })
  }

  const metrics = await this.userMetricsUseCase.execute(parsedRequest.value)
  return ResponseFactory.create({
    status: HTTP_STATUS.OK,
    body: metrics,
  })
}
```

O arquivo resultante completo de `metrics.controller.ts`:

```typescript
import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import type { UserMetricsUseCase } from "@/user/application/use-case/user-metrics.usecase"
import { CheckInRoutes } from "./routes/check-in-routes"

const metricsRequestSchema = z.object({
	userId: z.string().meta({
		description: "User ID to get metrics for",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

export class MetricsController extends BaseController {
	constructor(
		@inject(USER_TYPES.UseCases.UserMetrics)
		private readonly userMetricsUseCase: UserMetricsUseCase,
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods() {
		this.callback = this.callback.bind(this)
	}

	@Logger({
		message: "✅",
	})
	public async init(): Promise<void> {
		this.server.register(
			"get",
			CheckInRoutes.METRICS,
			{
				callback: this.callback,
				isProtected: true,
			},
			makeMetricsSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedRequest = this.parseRequest(metricsRequestSchema, req.params)
		if (parsedRequest.isFailure()) {
			return this.createResponseError(parsedRequest)
		}

		const requesterId = req.user.sub.id
		const targetId = parsedRequest.value.userId
		const isAdmin = req.user.sub.role === "ADMIN"
		if (requesterId !== targetId && !isAdmin) {
			return ResponseFactory.FORBIDDEN({ message: "Forbidden" })
		}

		const metrics = await this.userMetricsUseCase.execute(parsedRequest.value)
		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: metrics,
		})
	}
}

function makeMetricsSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["check-ins"],
		summary: "Get user check-in metrics",
		description: "Get check-in metrics (total count) for a specific user",
		security: true,
		params: metricsRequestSchema,
		responses: {
			200: {
				description: "User metrics retrieved successfully",
				schema: z.object({
					checkInsCount: z
						.number()
						.meta({ description: "Total number of check-ins", example: 42 }),
				}),
			},
			400: {
				description: "Invalid params",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
			403: {
				description: "Forbidden — user can only access their own metrics",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
		},
	})
}
```

- [ ] **Step 4: Executar todos os testes do check-in para confirmar que passam**

```bash
pnpm --filter backend test:run -- --reporter=verbose check-in-metrics
```

Esperado:
```
✓ Check-in Metrics (GET /check-ins/metrics/:userId)
  ✓ Deve retornar 0 quando o usuário não tem check-ins
  ✓ Deve retornar a contagem total quando o usuário tem múltiplos check-ins
  ✓ Deve retornar 401 quando o JWT não é fornecido
  ✓ Controle de acesso
    ✓ Deve retornar 403 quando MEMBER tenta acessar métricas de outro usuário
    ✓ ADMIN deve poder acessar métricas de qualquer usuário
```

- [ ] **Step 5: Executar lint e type check**

```bash
pnpm --filter backend biome:fix && pnpm --filter backend tsc:check
```

Esperado: zero erros em ambos.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/check-in/infra/controller/metrics.controller.ts \
        apps/backend/src/check-in/infra/controller/check-in-metrics.business-flow-test.ts
git commit -m "security: enforce ownership check on GET /check-ins/metrics/:userId

Add BOLA/IDOR fix: only the owner or an ADMIN can query check-in
metrics for a given userId. Mirrors the pattern used in
UserProfileController and MyCheckInsController.

Closes OWASP A01:2021 – Broken Access Control finding.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `GET /check-ins/metrics/<other-user-id>` com token de MEMBER → `403 Forbidden`
- `GET /check-ins/metrics/<own-user-id>` com token de MEMBER → `200 OK`
- `GET /check-ins/metrics/<any-user-id>` com token de ADMIN → `200 OK`
- `GET /check-ins/metrics/<userId>` sem token → `401 Unauthorized`
- `pnpm --filter backend test:run` passa 100%
- `pnpm --filter backend biome:fix` e `pnpm --filter backend tsc:check` sem erros
