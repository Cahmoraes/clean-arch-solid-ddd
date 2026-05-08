# Task 9: FetchCheckInsUseCase + ListCheckInsController: status no DTO e filtro rejected [RF-013, RF-014]

**Status:** PENDING
**PRD:** `../prd/prd-checkin-approve-reject.md`
**Spec:** `../specs/checkin-approve-reject-design.md`

## Visão Geral

Atualizar `FetchCheckInsUseCase` para incluir `status` e `rejectedAt` no DTO de saída. Atualizar `ListCheckInsController` para aceitar `"rejected"` no filtro de status e retornar os novos campos no schema OpenAPI.

**Depende de:** Task 3, Task 4

## Arquivos

- Modify: `apps/backend/src/check-in/application/use-case/fetch-check-ins.usecase.ts`
- Modify: `apps/backend/src/check-in/infra/controller/list-check-ins.controller.ts`

## Passos

- [ ] **Step 1: Atualizar FetchCheckInsUseCase**

Substituir o conteúdo completo de `apps/backend/src/check-in/application/use-case/fetch-check-ins.usecase.ts`:

```typescript
import { inject, injectable } from "inversify"

import type {
	CheckInStatus,
	FindManyOutput,
} from "@/check-in/application/repository/check-in-repository"
import { CHECKIN_TYPES } from "@/shared/infra/ioc/types"

import type { CheckInRepository } from "../repository/check-in-repository"

export interface FetchCheckInsUseCaseInput {
	page: number
	status?: CheckInStatus
}

export interface CheckInDTO {
	id: string
	userId: string
	gymId: string
	createdAt: string
	validatedAt: string | null
	rejectedAt: string | null
	status: "pending" | "validated" | "rejected"
	latitude: number
	longitude: number
}

export interface FetchCheckInsUseCaseOutput {
	items: CheckInDTO[]
	page: number
	total: number
}

@injectable()
export class FetchCheckInsUseCase {
	constructor(
		@inject(CHECKIN_TYPES.Repositories.CheckIn)
		private readonly checkInRepository: CheckInRepository,
	) {}

	public async execute(
		input: FetchCheckInsUseCaseInput,
	): Promise<FetchCheckInsUseCaseOutput> {
		const result: FindManyOutput = await this.checkInRepository.findMany({
			page: input.page,
			status: input.status,
		})
		return {
			items: this.toDTO(result.items),
			page: input.page,
			total: result.total,
		}
	}

	private toDTO(items: FindManyOutput["items"]): CheckInDTO[] {
		return items.map((checkIn) => ({
			id: checkIn.id,
			userId: checkIn.userId,
			gymId: checkIn.gymId,
			createdAt: checkIn.createdAt.toISOString(),
			validatedAt: checkIn.validatedAt?.toISOString() ?? null,
			rejectedAt: checkIn.rejectedAt?.toISOString() ?? null,
			status: checkIn.status,
			latitude: checkIn.latitude,
			longitude: checkIn.longitude,
		}))
	}
}
```

- [ ] **Step 2: Atualizar ListCheckInsController — filtro e schema OpenAPI**

Substituir o conteúdo completo de `apps/backend/src/check-in/infra/controller/list-check-ins.controller.ts`:

```typescript
import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import type { FetchCheckInsUseCase } from "@/check-in/application/use-case/fetch-check-ins.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { CHECKIN_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { CheckInRoutes } from "./routes/check-in-routes"

const listCheckInsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1).meta({
		description: "Page number",
		example: 1,
	}),
	status: z
		.enum(["pending", "validated", "rejected"])
		.optional()
		.meta({
			description: "Filter by status",
			example: "pending",
		}),
})

export class ListCheckInsController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(CHECKIN_TYPES.UseCases.FetchCheckIns)
		private readonly fetchCheckIns: FetchCheckInsUseCase,
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
	async init() {
		this.server.register(
			"get",
			CheckInRoutes.LIST,
			{
				callback: this.callback,
				isProtected: true,
				onlyAdmin: true,
			},
			makeListCheckInsSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedQuery = this.parseRequest(listCheckInsQuerySchema, req.query)
		if (parsedQuery.isFailure()) {
			return this.createResponseError(parsedQuery)
		}

		const result = await this.fetchCheckIns.execute({
			page: parsedQuery.value.page,
			status: parsedQuery.value.status,
		})
		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: result,
		})
	}
}

function makeListCheckInsSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["check-ins"],
		summary: "List check-ins",
		description:
			"List all check-ins with optional status filter. Requires ADMIN role",
		security: true,
		querystring: listCheckInsQuerySchema,
		responses: {
			200: {
				description: "Check-ins list retrieved successfully",
				schema: z.object({
					items: z.array(
						z.object({
							id: z.string().meta({ description: "Check-in ID" }),
							userId: z.string().meta({ description: "User ID" }),
							gymId: z.string().meta({ description: "Gym ID" }),
							createdAt: z.string().meta({ description: "Creation date (ISO)" }),
							validatedAt: z
								.string()
								.nullable()
								.meta({ description: "Validation date (ISO) or null" }),
							rejectedAt: z
								.string()
								.nullable()
								.meta({ description: "Rejection date (ISO) or null" }),
							status: z
								.enum(["pending", "validated", "rejected"])
								.meta({ description: "Computed check-in status" }),
							latitude: z.number().meta({ description: "Latitude" }),
							longitude: z.number().meta({ description: "Longitude" }),
						}),
					),
					page: z.number().meta({ description: "Current page" }),
					total: z.number().meta({ description: "Total items" }),
				}),
			},
			400: {
				description: "Invalid query params",
				schema: z.object({
					message: z.string().meta({ description: "Error message" }),
				}),
			},
		},
	})
}
```

- [ ] **Step 3: Rodar testes**

```bash
pnpm --filter backend test:run
```

Esperado: todos os testes passam.

- [ ] **Step 4: Type-check**

```bash
pnpm --filter backend tsc:check
```

Esperado: 0 erros.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/check-in/application/use-case/fetch-check-ins.usecase.ts \
        apps/backend/src/check-in/infra/controller/list-check-ins.controller.ts
git commit -m "feat(check-in): add status and rejectedAt to DTO, support rejected filter
```

## Critérios de Sucesso

- `CheckInDTO` inclui `status` e `rejectedAt`
- `GET /check-ins?status=rejected` retorna apenas check-ins rejeitados
- Schema OpenAPI documenta os novos campos
- Todos os testes passam
