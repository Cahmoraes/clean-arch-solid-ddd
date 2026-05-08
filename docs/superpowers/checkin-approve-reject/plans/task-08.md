# Task 8: RejectCheckInController + rota [RF-001, RF-002, RF-003]

**Status:** PENDING
**PRD:** `../prd/prd-checkin-approve-reject.md`
**Spec:** `../specs/checkin-approve-reject-design.md`

## Visão Geral

Criar o controller `RejectCheckInController` (PATCH `/check-ins/reject`) seguindo o padrão exato de `ValidateCheckInController`. Adicionar a rota `REJECT` ao objeto `CheckInRoutes`.

**Depende de:** Task 7

## Arquivos

- Modify: `apps/backend/src/check-in/infra/controller/routes/check-in-routes.ts`
- Create: `apps/backend/src/check-in/infra/controller/reject-check-in.controller.ts`

## Passos

- [ ] **Step 1: Adicionar REJECT ao CheckInRoutes**

Em `apps/backend/src/check-in/infra/controller/routes/check-in-routes.ts`:

```typescript
export const CheckInRoutes = {
	CREATE: "/check-ins",
	LIST: "/check-ins",
	METRICS: "/check-ins/metrics/:userId",
	VALIDATE: "/check-ins/validate",
	REJECT: "/check-ins/reject",
} as const

export type CheckInRoutesType =
	(typeof CheckInRoutes)[keyof typeof CheckInRoutes]
```

- [ ] **Step 2: Criar RejectCheckInController**

```typescript
// apps/backend/src/check-in/infra/controller/reject-check-in.controller.ts
import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { ZodError, z } from "zod"
import type { RejectCheckInUseCase } from "@/check-in/application/use-case/reject-check-in.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { CHECKIN_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type {
	HandleCallbackResponse,
	HttpServer,
	Schema,
} from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { CheckInRoutes } from "./routes/check-in-routes"

const rejectCheckInRequestSchema = z.object({
	checkInId: z.string().meta({
		description: "Check-in ID to reject",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

export class RejectCheckInController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(CHECKIN_TYPES.UseCases.RejectCheckIn)
		private readonly rejectCheckInUseCase: RejectCheckInUseCase,
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
			"patch",
			CheckInRoutes.REJECT,
			{
				callback: this.callback,
				isProtected: true,
				onlyAdmin: true,
			},
			makeRejectCheckInSwaggerSchema(),
		)
	}

	protected override mapResponseError(
		error: Error | Error[],
	): HandleCallbackResponse | undefined {
		if (Array.isArray(error) || error instanceof ZodError) {
			return undefined
		}
		return ResponseFactory.create({
			status: HTTP_STATUS.NOT_FOUND,
			message: error.message,
		})
	}

	private async callback(req: FastifyRequest) {
		const parsedRequest = this.parseRequest(
			rejectCheckInRequestSchema,
			req.body,
		)
		if (parsedRequest.isFailure()) {
			return this.createResponseError(parsedRequest)
		}

		const result = await this.rejectCheckInUseCase.execute(
			parsedRequest.value,
		)
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: { rejectedAt: result.value.rejectedAt },
		})
	}
}

function makeRejectCheckInSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["check-ins"],
		summary: "Reject a check-in",
		description:
			"Reject (deny) an existing check-in. Can reject pending or validated check-ins. Requires ADMIN role",
		security: true,
		body: rejectCheckInRequestSchema,
		responses: {
			200: {
				description: "Check-in rejected successfully",
				schema: z.object({
					rejectedAt: z.iso.datetime().meta({
						description: "ISO timestamp of when the check-in was rejected",
						example: "2025-01-15T12:34:56.000Z",
					}),
				}),
			},
			400: {
				description: "Invalid request body",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
			404: {
				description: "Check-in not found",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
		},
	})
}
```

- [ ] **Step 3: Rodar type-check**

```bash
pnpm --filter backend tsc:check
```

Esperado: 0 erros (o símbolo IoC `CHECKIN_TYPES.UseCases.RejectCheckIn` ainda não existe — será criado na Task 10, mas o TypeScript pode já apontar isso).

- [ ] **Step 4: Rodar testes existentes**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes existentes continuam passando.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/check-in/infra/controller/routes/check-in-routes.ts \
        apps/backend/src/check-in/infra/controller/reject-check-in.controller.ts
git commit -m "feat(check-in): add RejectCheckInController PATCH /check-ins/reject
```

## Critérios de Sucesso

- `PATCH /check-ins/reject` registrado com `isProtected: true, onlyAdmin: true`
- Body: `{ checkInId: string }`
- Response 200: `{ rejectedAt: ISOString }`
- Response 404 para check-in não encontrado
- Segue exatamente o padrão de `ValidateCheckInController`
