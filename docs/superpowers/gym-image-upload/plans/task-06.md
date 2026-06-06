# Task 6: `SetGymImageUseCase` + teste unitário [FR-007, FR-008]

**Status:** PENDING
**PRD:** `../prd/prd-gym-image-upload.md`
**Spec:** `../specs/gym-image-upload-design.md`
**Depends on:** task-02, task-05

## Visão Geral

Cria o caso de uso que define/substitui a imagem de uma academia (FR-007): processa o buffer recebido via `ImageProcessor`, grava via `ImageStorage`, persiste a nova `imageKey` no `Gym` e remove a imagem anterior após a atualização (FR-008). Também adiciona os service identifiers do IoC consumidos pelo caso de uso.

## Arquivos

- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/gym-types.ts`
- Create: `apps/backend/src/gym/application/use-case/set-gym-image.usecase.ts`
- Test: `apps/backend/src/gym/application/use-case/set-gym-image.usecase.test.ts`

### Conformidade com as Skills Padrão

- use no-workarounds: remove a imagem antiga só após o `update` persistir (ordem correta); processamento isolado atrás das portas.
- use test-antipatterns: mocks simples das portas; cada teste cobre um caminho (sucesso, troca, not-found, imagem inválida).

## Passos

- **Step 1: Adicionar os service identifiers ao `GYM_TYPES`**

Em `apps/backend/src/shared/infra/ioc/module/service-identifier/gym-types.ts`:

1. Adicione `SetGymImage` em `UseCases`:

```typescript
	UseCases: {
		CreateGym: Symbol.for("CreateGymUseCase"),
		UpdateGym: Symbol.for("UpdateGymUseCase"),
		DeleteGym: Symbol.for("DeleteGymUseCase"),
		SearchGym: Symbol.for("SearchGymUseCase"),
		FetchNearbyGym: Symbol.for("FetchNearbyGymUseCase"),
		FetchAllGyms: Symbol.for("FetchAllGymsUseCase"),
		FetchGymById: Symbol.for("FetchGymByIdUseCase"),
		SetGymImage: Symbol.for("SetGymImageUseCase"),
	},
```

2. Adicione um bloco `Services` (após `Controllers`):

```typescript
	Services: {
		ImageProcessor: Symbol.for("ImageProcessor"),
		ImageStorage: Symbol.for("ImageStorage"),
	},
```

- **Step 2: Escrever o teste que falha**

Crie `apps/backend/src/gym/application/use-case/set-gym-image.usecase.test.ts`:

```typescript
import { Gym } from "@/gym/domain/gym"
import type {
	ImageProcessor,
	ProcessedImage,
} from "@/gym/application/storage/image-processor"
import type { ImageStorage } from "@/gym/application/storage/image-storage"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { GymNotFoundError } from "../error/gym-not-found-error"
import { InvalidImageError } from "../error/invalid-image-error"
import { SetGymImageUseCase } from "./set-gym-image.usecase"

function makeProcessor(
	impl?: () => Promise<ProcessedImage>,
): ImageProcessor {
	return {
		process:
			impl ??
			(async () => ({
				buffer: Buffer.from("webp"),
				extension: "webp",
				contentType: "image/webp",
			})),
	}
}

function makeStorage() {
	const deleted: string[] = []
	let counter = 0
	const storage: ImageStorage = {
		save: async () => ({ key: `gyms/new-${++counter}.webp` }),
		delete: async (key: string) => {
			deleted.push(key)
		},
	}
	return { storage, deleted }
}

describe("SetGymImageUseCase", () => {
	test("processa, grava e persiste a nova imageKey", async () => {
		const gymRepository = new InMemoryGymRepository()
		await gymRepository.save(
			Gym.restore({
				id: "gym-1",
				title: "Academia",
				latitude: 0,
				longitude: 0,
				cnpj: "11.222.333/0001-81",
				address: "Rua A, 1",
			}),
		)
		const { storage } = makeStorage()
		const sut = new SetGymImageUseCase(gymRepository, makeProcessor(), storage)

		const result = await sut.execute({
			gymId: "gym-1",
			fileBuffer: Buffer.from("raw"),
		})

		expect(result.forceSuccess().value.imageKey).toBe("gyms/new-1.webp")
		const found = await gymRepository.gymOfId("gym-1")
		expect(found?.imageKey).toBe("gyms/new-1.webp")
	})

	test("remove a imagem anterior ao substituir", async () => {
		const gymRepository = new InMemoryGymRepository()
		await gymRepository.save(
			Gym.restore({
				id: "gym-1",
				title: "Academia",
				latitude: 0,
				longitude: 0,
				cnpj: "11.222.333/0001-81",
				address: "Rua A, 1",
				imageKey: "gyms/old.webp",
			}),
		)
		const { storage, deleted } = makeStorage()
		const sut = new SetGymImageUseCase(gymRepository, makeProcessor(), storage)

		await sut.execute({ gymId: "gym-1", fileBuffer: Buffer.from("raw") })

		expect(deleted).toContain("gyms/old.webp")
	})

	test("retorna GymNotFoundError quando a academia não existe", async () => {
		const gymRepository = new InMemoryGymRepository()
		const { storage } = makeStorage()
		const sut = new SetGymImageUseCase(gymRepository, makeProcessor(), storage)

		const result = await sut.execute({
			gymId: "inexistente",
			fileBuffer: Buffer.from("raw"),
		})

		expect(result.value).toBeInstanceOf(GymNotFoundError)
	})

	test("retorna InvalidImageError e não grava quando o processamento falha", async () => {
		const gymRepository = new InMemoryGymRepository()
		await gymRepository.save(
			Gym.restore({
				id: "gym-1",
				title: "Academia",
				latitude: 0,
				longitude: 0,
				cnpj: "11.222.333/0001-81",
				address: "Rua A, 1",
			}),
		)
		const { storage, deleted } = makeStorage()
		const failingProcessor = makeProcessor(async () => {
			throw new Error("sharp boom")
		})
		const sut = new SetGymImageUseCase(gymRepository, failingProcessor, storage)

		const result = await sut.execute({
			gymId: "gym-1",
			fileBuffer: Buffer.from("raw"),
		})

		expect(result.value).toBeInstanceOf(InvalidImageError)
		expect(deleted).toHaveLength(0)
		const found = await gymRepository.gymOfId("gym-1")
		expect(found?.imageKey).toBeUndefined()
	})
})
```

- **Step 3: Rodar o teste e confirmar a falha**

Run: `pnpm --filter backend test:run -- -t "SetGymImageUseCase"`
Expected: FAIL — módulo `./set-gym-image.usecase` não existe.

- **Step 4: Implementar o caso de uso**

Crie `apps/backend/src/gym/application/use-case/set-gym-image.usecase.ts`:

```typescript
import { inject, injectable } from "inversify"

import { Gym } from "@/gym/domain/gym"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { GYM_TYPES } from "@/shared/infra/ioc/types"

import { GymNotFoundError } from "../error/gym-not-found-error"
import { InvalidImageError } from "../error/invalid-image-error"
import type { GymRepository } from "../repository/gym-repository"
import type {
	ImageProcessor,
	ProcessedImage,
} from "../storage/image-processor"
import type { ImageStorage } from "../storage/image-storage"

export interface SetGymImageUseCaseInput {
	gymId: string
	fileBuffer: Buffer
}

export interface SetGymImageResponse {
	imageKey: string
}

export type SetGymImageUseCaseOutput = Either<
	GymNotFoundError | InvalidImageError,
	SetGymImageResponse
>

@injectable()
export class SetGymImageUseCase {
	constructor(
		@inject(GYM_TYPES.Repositories.Gym)
		private readonly gymRepository: GymRepository,
		@inject(GYM_TYPES.Services.ImageProcessor)
		private readonly imageProcessor: ImageProcessor,
		@inject(GYM_TYPES.Services.ImageStorage)
		private readonly imageStorage: ImageStorage,
	) {}

	public async execute(
		input: SetGymImageUseCaseInput,
	): Promise<SetGymImageUseCaseOutput> {
		const gym = await this.gymRepository.gymOfId(input.gymId)
		if (!gym) return failure(new GymNotFoundError())

		const processedOrError = await this.processImage(input.fileBuffer)
		if (processedOrError.isFailure()) return failure(processedOrError.value)

		const { key } = await this.imageStorage.save(
			processedOrError.value.buffer,
			processedOrError.value.extension,
		)
		const previousKey = gym.imageKey

		await this.gymRepository.update(
			Gym.restore({
				id: gym.id,
				title: gym.title,
				description: gym.description,
				phone: gym.phone,
				latitude: gym.latitude,
				longitude: gym.longitude,
				cnpj: gym.cnpj,
				address: gym.address,
				imageKey: key,
			}),
		)

		if (previousKey) await this.imageStorage.delete(previousKey)
		return success({ imageKey: key })
	}

	private async processImage(
		buffer: Buffer,
	): Promise<Either<InvalidImageError, ProcessedImage>> {
		try {
			const processed = await this.imageProcessor.process(buffer)
			return success(processed)
		} catch {
			return failure(new InvalidImageError())
		}
	}
}
```

- **Step 5: Rodar o teste e confirmar o sucesso**

Run: `pnpm --filter backend test:run -- -t "SetGymImageUseCase"`
Expected: PASS (4 testes).

- **Step 6: Verificar tipos + lint + commit**

Run: `pnpm --filter backend tsc:check`
Expected: zero erros.

Run: `pnpm --filter backend biome:fix`
Expected: zero problemas.

```bash
git add apps/backend/src/gym/application/use-case/set-gym-image.usecase.ts apps/backend/src/gym/application/use-case/set-gym-image.usecase.test.ts apps/backend/src/shared/infra/ioc/module/service-identifier/gym-types.ts
git commit -m "feat(gym): add SetGymImageUseCase with old-image cleanup"
```

## Critérios de Sucesso

- `SetGymImageUseCase` processa, grava e persiste a nova `imageKey`; remove a anterior. [FR-007, FR-008]
- Retorna `GymNotFoundError` (academia inexistente) e `InvalidImageError` (processamento falho, sem gravar).
- `GYM_TYPES.UseCases.SetGymImage` e `GYM_TYPES.Services.*` existem. Testes, `tsc:check` e `biome:fix` sem problemas.
