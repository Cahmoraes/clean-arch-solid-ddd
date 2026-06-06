# Task 4: `UpdateGymUseCase` + teste unitário [FR-006, FR-009]

**Status:** DONE
**PRD:** `../prd/prd-gym-image-upload.md`
**Spec:** `../specs/gym-image-upload-design.md`
**Depends on:** task-02

## Visão Geral

Cria o caso de uso de atualização dos dados cadastrais de uma academia existente (FR-006), independente da imagem (FR-009). Preserva o `imageKey` atual ao atualizar os dados (a troca de imagem é feita por outro caso de uso). Valida CNPJ duplicado em outra academia.

## Arquivos

- Create: `apps/backend/src/gym/application/use-case/update-gym.usecase.ts`
- Test: `apps/backend/src/gym/application/use-case/update-gym.usecase.test.ts`

### Conformidade com as Skills Padrão

- use no-workarounds: usa `repository.update` (não `save`); reconstrói o agregado com validação via `Gym.create`.
- use test-antipatterns: cada teste cobre um comportamento (sucesso, not-found, conflito de CNPJ, preservação de imageKey).

## Passos

- **Step 1: Escrever o teste que falha**

Crie `apps/backend/src/gym/application/use-case/update-gym.usecase.test.ts`:

```typescript
import { Gym } from "@/gym/domain/gym"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { GymNotFoundError } from "../error/gym-not-found-error"
import { GymWithCNPJAlreadyExistsError } from "../error/gym-with-cnpj-already-exists-error"
import { UpdateGymUseCase } from "./update-gym.usecase"

function makeSut() {
	const gymRepository = new InMemoryGymRepository()
	const sut = new UpdateGymUseCase(gymRepository)
	return { gymRepository, sut }
}

describe("UpdateGymUseCase", () => {
	test("atualiza os dados cadastrais de uma academia existente", async () => {
		const { gymRepository, sut } = makeSut()
		await gymRepository.save(
			Gym.restore({
				id: "gym-1",
				title: "Nome Antigo",
				latitude: 0,
				longitude: 0,
				cnpj: "11.222.333/0001-81",
				address: "Rua A, 1",
				imageKey: "gyms/atual.webp",
			}),
		)

		const result = await sut.execute({
			gymId: "gym-1",
			cnpj: "11.222.333/0001-81",
			title: "Nome Novo",
			description: "Atualizada",
			phone: "11999999999",
			latitude: -23.5,
			longitude: -46.6,
			address: "Rua B, 2",
		})

		expect(result.isSuccess()).toBe(true)
		const found = await gymRepository.gymOfId("gym-1")
		expect(found?.title).toBe("Nome Novo")
		expect(found?.address).toBe("Rua B, 2")
	})

	test("preserva o imageKey existente ao atualizar dados", async () => {
		const { gymRepository, sut } = makeSut()
		await gymRepository.save(
			Gym.restore({
				id: "gym-1",
				title: "Nome",
				latitude: 0,
				longitude: 0,
				cnpj: "11.222.333/0001-81",
				address: "Rua A, 1",
				imageKey: "gyms/atual.webp",
			}),
		)

		await sut.execute({
			gymId: "gym-1",
			cnpj: "11.222.333/0001-81",
			title: "Nome Editado",
			latitude: 0,
			longitude: 0,
			address: "Rua A, 1",
		})

		const found = await gymRepository.gymOfId("gym-1")
		expect(found?.imageKey).toBe("gyms/atual.webp")
	})

	test("retorna GymNotFoundError quando a academia não existe", async () => {
		const { sut } = makeSut()
		const result = await sut.execute({
			gymId: "inexistente",
			cnpj: "11.222.333/0001-81",
			title: "Qualquer",
			latitude: 0,
			longitude: 0,
			address: "Rua A, 1",
		})
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(GymNotFoundError)
	})

	test("retorna conflito quando o CNPJ pertence a outra academia", async () => {
		const { gymRepository, sut } = makeSut()
		await gymRepository.save(
			Gym.restore({
				id: "gym-1",
				title: "Academia 1",
				latitude: 0,
				longitude: 0,
				cnpj: "11.222.333/0001-81",
				address: "Rua A, 1",
			}),
		)
		await gymRepository.save(
			Gym.restore({
				id: "gym-2",
				title: "Academia 2",
				latitude: 0,
				longitude: 0,
				cnpj: "11.444.777/0001-61",
				address: "Rua B, 2",
			}),
		)

		const result = await sut.execute({
			gymId: "gym-2",
			cnpj: "11.222.333/0001-81",
			title: "Academia 2",
			latitude: 0,
			longitude: 0,
			address: "Rua B, 2",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(GymWithCNPJAlreadyExistsError)
	})
})
```

- **Step 2: Rodar o teste e confirmar a falha**

Run: `pnpm --filter backend test:run -- -t "UpdateGymUseCase"`
Expected: FAIL — módulo `./update-gym.usecase` não existe.

- **Step 3: Implementar o caso de uso**

Crie `apps/backend/src/gym/application/use-case/update-gym.usecase.ts`:

```typescript
import { inject, injectable } from "inversify"

import { Gym } from "@/gym/domain/gym"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { GYM_TYPES } from "@/shared/infra/ioc/types"
import type { InvalidNameLengthError } from "@/user/domain/error/invalid-name-length-error"

import { GymNotFoundError } from "../error/gym-not-found-error"
import { GymWithCNPJAlreadyExistsError } from "../error/gym-with-cnpj-already-exists-error"
import type { GymRepository } from "../repository/gym-repository"

export interface UpdateGymUseCaseInput {
	gymId: string
	cnpj: string
	title: string
	description?: string
	phone?: string
	latitude: number
	longitude: number
	address: string
}

export interface UpdateGymResponse {
	gymId: string
}

export type UpdateGymUseCaseOutput = Either<
	InvalidNameLengthError | GymNotFoundError | GymWithCNPJAlreadyExistsError,
	UpdateGymResponse
>

@injectable()
export class UpdateGymUseCase {
	constructor(
		@inject(GYM_TYPES.Repositories.Gym)
		private readonly gymRepository: GymRepository,
	) {}

	public async execute(
		input: UpdateGymUseCaseInput,
	): Promise<UpdateGymUseCaseOutput> {
		const existingGym = await this.gymRepository.gymOfId(input.gymId)
		if (!existingGym) return failure(new GymNotFoundError())

		const gymWithSameCNPJ = await this.gymRepository.gymOfCNPJ(input.cnpj)
		if (gymWithSameCNPJ && gymWithSameCNPJ.id !== input.gymId) {
			return failure(new GymWithCNPJAlreadyExistsError(input.cnpj))
		}

		const gymOrError = Gym.create({
			id: input.gymId,
			cnpj: input.cnpj,
			title: input.title,
			description: input.description,
			phone: input.phone,
			latitude: input.latitude,
			longitude: input.longitude,
			address: input.address,
			imageKey: existingGym.imageKey,
		})
		if (gymOrError.isFailure()) return failure(gymOrError.value)

		await this.gymRepository.update(gymOrError.value)
		return success({ gymId: input.gymId })
	}
}
```

- **Step 4: Rodar o teste e confirmar o sucesso**

Run: `pnpm --filter backend test:run -- -t "UpdateGymUseCase"`
Expected: PASS (4 testes).

- **Step 5: Verificar tipos + lint + commit**

Run: `pnpm --filter backend tsc:check`
Expected: zero erros.

Run: `pnpm --filter backend biome:fix`
Expected: zero problemas.

```bash
git add apps/backend/src/gym/application/use-case/update-gym.usecase.ts apps/backend/src/gym/application/use-case/update-gym.usecase.test.ts
git commit -m "feat(gym): add UpdateGymUseCase preserving imageKey"
```

## Critérios de Sucesso

- `UpdateGymUseCase` atualiza dados cadastrais e preserva `imageKey`. [FR-006, FR-009]
- Retorna `GymNotFoundError` para academia inexistente e conflito para CNPJ de outra academia.
- Testes passam; `tsc:check` e `biome:fix` sem problemas.
