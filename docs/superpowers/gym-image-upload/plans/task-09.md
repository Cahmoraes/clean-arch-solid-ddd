# Task 9: `GymImageController` + rota `POST /gyms/:gymId/image` + wiring + business-flow [FR-005, FR-007, FR-015]

**Status:** PENDING
**PRD:** `../prd/prd-gym-image-upload.md`
**Spec:** `../specs/gym-image-upload-design.md`
**Depends on:** task-06, task-07, task-08

## Visão Geral

Expõe o upload/troca de imagem via `POST /gyms/:gymId/image` (multipart, admin-only — FR-007, FR-015), validando tipo e tamanho (FR-005). Conecta `SetGymImageUseCase` ao HTTP e registra no IoC o use case, o controller e as implementações das portas (`SharpImageProcessor`, `LocalFileSystemImageStorage`). Depende da task-08 por compartilhar os arquivos de rotas/IoC/bootstrap.

## Arquivos

- Create: `apps/backend/src/gym/infra/controller/gym-image.controller.ts`
- Modify: `apps/backend/src/gym/infra/controller/routes/gym-routes.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/gym-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/gym/gym-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-gym-module.ts`
- Test: `apps/backend/src/gym/infra/controller/gym-image.business-flow-test.ts`

### Conformidade com as Skills Padrão

- use no-workarounds: validação de tipo (415) e tamanho (413) no controller; lógica de processamento/armazenamento no use case + portas.
- use test-antipatterns: business-flow com upload real (multipart) e storage fake (sem poluir disco).

## Passos

- **Step 1: Adicionar a rota `UPLOAD_IMAGE`**

Em `apps/backend/src/gym/infra/controller/routes/gym-routes.ts`:

```typescript
export const GymRoutes = {
	CREATE: "/gyms",
	LIST: "/gyms",
	GET: "/gyms/:gymId",
	UPDATE: "/gyms/:gymId",
	UPLOAD_IMAGE: "/gyms/:gymId/image",
	SEARCH: "/gyms/search/:name",
} as const
```

- **Step 2: Adicionar o símbolo do controller**

Em `apps/backend/src/shared/infra/ioc/module/service-identifier/gym-types.ts`, no bloco `Controllers`, adicione `GymImage`:

```typescript
		FetchGymById: Symbol.for("FetchGymByIdController"),
		GymImage: Symbol.for("GymImageController"),
```

- **Step 3: Escrever o teste business-flow que falha**

Crie `apps/backend/src/gym/infra/controller/gym-image.business-flow-test.ts`:

```typescript
import sharp from "sharp"
import request from "supertest"
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { createAndSaveUser } from "test/factory/create-and-save-user"

import { serverBuild } from "@/bootstrap/server-build"
import type { ImageStorage } from "@/gym/application/storage/image-storage"
import type { AuthenticateUseCase } from "@/session/application/use-case/authenticate.usecase"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, GYM_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { RoleValues } from "@/user/domain/value-object/role"

import { GymRoutes } from "./routes/gym-routes"

function makeFakeStorage() {
	const saved: string[] = []
	const storage: ImageStorage = {
		save: async () => {
			const key = "gyms/fake.webp"
			saved.push(key)
			return { key }
		},
		delete: async () => {},
	}
	return { storage, saved }
}

async function pngBuffer(): Promise<Buffer> {
	return sharp({
		create: {
			width: 600,
			height: 600,
			channels: 3,
			background: { r: 10, g: 20, b: 30 },
		},
	})
		.png()
		.toBuffer()
}

describe("Upload de imagem de Academia (POST /gyms/:gymId/image)", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let gymRepository: InMemoryGymRepository
	let authenticate: AuthenticateUseCase

	beforeEach(async () => {
		container.snapshot()
		gymRepository = new InMemoryGymRepository()
		userRepository = new InMemoryUserRepository()
		await container.unbind(USER_TYPES.Repositories.User)
		container.bind(USER_TYPES.Repositories.User).toConstantValue(userRepository)
		await container.unbind(GYM_TYPES.Repositories.Gym)
		container.bind(GYM_TYPES.Repositories.Gym).toConstantValue(gymRepository)
		await container.unbind(GYM_TYPES.Services.ImageStorage)
		container
			.bind(GYM_TYPES.Services.ImageStorage)
			.toConstantValue(makeFakeStorage().storage)
		authenticate = container.get<AuthenticateUseCase>(
			AUTH_TYPES.UseCases.Authenticate,
		)
		fastifyServer = await serverBuild()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	async function adminToken(): Promise<string> {
		await createAndSaveUser({
			userRepository,
			email: "admin@email.com",
			password: "password",
			role: RoleValues.ADMIN,
		})
		const auth = await authenticate.execute({
			email: "admin@email.com",
			password: "password",
		})
		return auth.forceSuccess().value.token
	}

	test("admin envia imagem e recebe imageKey + url", async () => {
		const token = await adminToken()
		await createAndSaveGym({ gymRepository, id: "gym-1" })

		const response = await request(fastifyServer.server)
			.post(GymRoutes.UPLOAD_IMAGE.replace(":gymId", "gym-1"))
			.auth(token, { type: "bearer" })
			.attach("image", await pngBuffer(), {
				filename: "foto.png",
				contentType: "image/png",
			})

		expect(response.status).toBe(200)
		expect(response.body.imageKey).toBe("gyms/fake.webp")
		expect(response.body.url).toBe("/uploads/gyms/fake.webp")
		const found = await gymRepository.gymOfId("gym-1")
		expect(found?.imageKey).toBe("gyms/fake.webp")
	})

	test("retorna 415 para arquivo que não é imagem", async () => {
		const token = await adminToken()
		await createAndSaveGym({ gymRepository, id: "gym-1" })

		const response = await request(fastifyServer.server)
			.post(GymRoutes.UPLOAD_IMAGE.replace(":gymId", "gym-1"))
			.auth(token, { type: "bearer" })
			.attach("image", Buffer.from("texto"), {
				filename: "doc.txt",
				contentType: "text/plain",
			})

		expect(response.status).toBe(415)
	})

	test("retorna 403 para usuário não-admin", async () => {
		await createAndSaveUser({
			userRepository,
			email: "member@email.com",
			password: "password",
			role: RoleValues.MEMBER,
		})
		const auth = await authenticate.execute({
			email: "member@email.com",
			password: "password",
		})
		const token = auth.forceSuccess().value.token
		await createAndSaveGym({ gymRepository, id: "gym-1" })

		const response = await request(fastifyServer.server)
			.post(GymRoutes.UPLOAD_IMAGE.replace(":gymId", "gym-1"))
			.auth(token, { type: "bearer" })
			.attach("image", await pngBuffer(), {
				filename: "foto.png",
				contentType: "image/png",
			})

		expect(response.status).toBe(403)
	})
})
```

- **Step 4: Rodar o teste e confirmar a falha**

Run: `pnpm --filter backend test:business-flow -- -t "Upload de imagem de Academia"`
Expected: FAIL — controller/rota inexistentes.

- **Step 5: Implementar o `GymImageController`**

Crie `apps/backend/src/gym/infra/controller/gym-image.controller.ts`:

```typescript
import type { FastifyRequest } from "fastify"
import { inject } from "inversify"
import { z } from "zod"
import type { SetGymImageUseCase } from "@/gym/application/use-case/set-gym-image.usecase"
import { BaseController } from "@/shared/infra/controller/base-controller"
import { ResponseFactory } from "@/shared/infra/controller/factory/response-factory"
import { Logger } from "@/shared/infra/decorator/logger"
import { GYM_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import { OpenApiSchemaBuilder } from "@/shared/infra/openapi/openapi-schema-builder.js"
import type { HttpServer, Schema } from "@/shared/infra/server/http-server"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { GymRoutes } from "./routes/gym-routes"

const UNSUPPORTED_MEDIA_TYPE = 415
const PAYLOAD_TOO_LARGE = 413

const gymImageParamsSchema = z.object({
	gymId: z.string().min(1).meta({
		description: "Gym ID",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
})

export class GymImageController extends BaseController {
	constructor(
		@inject(SHARED_TYPES.Server.Fastify)
		private readonly server: HttpServer,
		@inject(GYM_TYPES.UseCases.SetGymImage)
		private readonly setGymImageUseCase: SetGymImageUseCase,
	) {
		super()
		this.bindMethods()
	}

	private bindMethods() {
		this.callback = this.callback.bind(this)
	}

	@Logger({ message: "✅" })
	public async init(): Promise<void> {
		this.server.register(
			"post",
			GymRoutes.UPLOAD_IMAGE,
			{ callback: this.callback, isProtected: true, onlyAdmin: true },
			makeGymImageSwaggerSchema(),
		)
	}

	private async callback(req: FastifyRequest) {
		const parsedParamsOrError = this.parseRequest(
			gymImageParamsSchema,
			req.params,
		)
		if (parsedParamsOrError.isFailure()) {
			return this.createResponseError(parsedParamsOrError)
		}

		const data = await req.file()
		if (!data) {
			return ResponseFactory.BAD_REQUEST({ message: "No image file provided" })
		}
		if (!data.mimetype.startsWith("image/")) {
			return ResponseFactory.create({
				status: UNSUPPORTED_MEDIA_TYPE,
				message: "Unsupported media type",
			})
		}

		let fileBuffer: Buffer
		try {
			fileBuffer = await data.toBuffer()
		} catch {
			return ResponseFactory.create({
				status: PAYLOAD_TOO_LARGE,
				message: "File too large",
			})
		}

		const result = await this.setGymImageUseCase.execute({
			gymId: parsedParamsOrError.value.gymId,
			fileBuffer,
		})
		if (result.isFailure()) {
			return this.createResponseError(result)
		}

		return ResponseFactory.create({
			status: HTTP_STATUS.OK,
			body: {
				imageKey: result.value.imageKey,
				url: `/uploads/${result.value.imageKey}`,
			},
		})
	}
}

function makeGymImageSwaggerSchema(): Schema {
	return OpenApiSchemaBuilder.build({
		tags: ["gyms"],
		summary: "Upload/replace a gym image",
		description:
			"Uploads a gym image (multipart/form-data, field 'image'). Requires ADMIN role",
		security: true,
		params: gymImageParamsSchema,
		responses: {
			200: {
				description: "Image stored",
				schema: z.object({
					imageKey: z.string().meta({ example: "gyms/abc.webp" }),
					url: z.string().meta({ example: "/uploads/gyms/abc.webp" }),
				}),
			},
			404: {
				description: "Gym not found",
				schema: z.object({ message: z.string() }),
			},
			413: {
				description: "File too large",
				schema: z.object({ message: z.string() }),
			},
			415: {
				description: "Unsupported media type",
				schema: z.object({ message: z.string() }),
			},
		},
	})
}
```

- **Step 6: Registrar use case, controller e portas no IoC**

Em `apps/backend/src/shared/infra/ioc/module/gym/gym-module.ts`:

1. Adicione os imports:

```typescript
import { SetGymImageUseCase } from "@/gym/application/use-case/set-gym-image.usecase"
import { GymImageController } from "@/gym/infra/controller/gym-image.controller"
import { LocalFileSystemImageStorage } from "@/shared/infra/storage/local-file-system-image-storage"
import { SharpImageProcessor } from "@/shared/infra/storage/sharp-image-processor"
```

2. Dentro do `ContainerModule`, adicione os bindings:

```typescript
	bind(GYM_TYPES.Controllers.GymImage).to(GymImageController)
	bind(GYM_TYPES.UseCases.SetGymImage).to(SetGymImageUseCase)
	bind(GYM_TYPES.Services.ImageProcessor).to(SharpImageProcessor)
	bind(GYM_TYPES.Services.ImageStorage).toDynamicValue(
		() => new LocalFileSystemImageStorage(),
	)
```

> `LocalFileSystemImageStorage` tem um parâmetro de construtor com valor padrão (`env.UPLOAD_DIR`); por isso usamos `toDynamicValue(() => new LocalFileSystemImageStorage())` em vez de `.to(...)`, evitando que o Inversify tente injetar o parâmetro primitivo.

- **Step 7: Adicionar o controller ao bootstrap**

Em `apps/backend/src/bootstrap/setup-gym-module.ts`, adicione ao array `controllers`:

```typescript
		resolve(GYM_TYPES.Controllers.GymImage),
```

- **Step 8: Rodar o teste e confirmar o sucesso**

Run: `pnpm --filter backend test:business-flow -- -t "Upload de imagem de Academia"`
Expected: PASS (3 testes).

- **Step 9: Tipos + lint + commit**

Run: `pnpm --filter backend tsc:check`
Expected: zero erros.

Run: `pnpm --filter backend biome:fix`
Expected: zero problemas.

```bash
git add apps/backend/src/gym apps/backend/src/shared/infra/ioc/module/gym/gym-module.ts apps/backend/src/shared/infra/ioc/module/service-identifier/gym-types.ts apps/backend/src/bootstrap/setup-gym-module.ts
git commit -m "feat(gym): add POST /gyms/:gymId/image GymImageController with IoC wiring"
```

## Critérios de Sucesso

- `POST /gyms/:gymId/image` aceita imagem multipart, persiste e retorna `{ imageKey, url }` (200). [FR-007]
- Retorna 415 (não-imagem), 403 (não-admin); 413 quando excede 5MB (via `@fastify/multipart`). [FR-005, FR-015]
- Use case, controller e portas registrados no container e bootstrap.
- Business-flow, `tsc:check` e `biome:fix` sem problemas.
