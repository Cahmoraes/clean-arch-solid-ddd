# Task 9: `FetchGymByIdUseCase` — `includeInactive` por papel + `status` no DTO [FR-008, FR-009]

**Status:** DONE
**PRD:** `../prd/prd-gym-deactivation.md`
**Spec:** `../specs/gym-deactivation-design.md`
**Tier:** cheap
**Depends on:** task-04

## Visão Geral

Estende `FetchGymByIdUseCase` para aceitar `includeInactive?: boolean` no input e repassar
para `gymRepository.gymOfId()`. Nenhuma lógica extra de "esconder" é necessária: o repositório
(Task 4) já retorna `null` para uma academia desativada quando `includeInactive: false`, e o
`if (!gym) return failure(new GymNotFoundError())` já existente cobre automaticamente a
Decisão D2 (mesmo erro de "não encontrado" para academia desativada e para academia
inexistente, sem revelar a diferença — FR-008). O DTO de sucesso ganha `status`, permitindo
que um admin veja o status ao acessar o detalhe de uma academia desativada (FR-009).

## Arquivos

- Modify: `apps/backend/src/gym/application/use-case/fetch-gym-by-id.usecase.ts`
- Test: `apps/backend/src/gym/application/use-case/fetch-gym-by-id.usecase.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: extensão de `FetchGymByIdUseCaseInput`/`FetchGymByIdUseCaseOutputDTO`
  com campos opcionais/adicionais.
- `vitest`: suíte de teste seguindo o padrão real de `container.snapshot()`/
  `createAndSaveGym`/`GYM_TYPES` já usado no bounded context `gym`.
- `no-workarounds`: reusar o `GymNotFoundError` já existente para academia desativada
  acessada sem `includeInactive: true` — nunca criar uma mensagem/erro diferenciado que
  vazasse a existência da academia para um não-admin (Decisão D2).

## Passos

- **Step 1: Escrever o teste que falha**

```typescript
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { container } from "@/shared/infra/ioc/container"
import { GYM_TYPES } from "@/shared/infra/ioc/types"
import { GymNotFoundError } from "../error/gym-not-found-error"
import type { FetchGymByIdUseCase } from "./fetch-gym-by-id.usecase"

describe("FetchGymByIdUseCase — includeInactive", () => {
	let sut: FetchGymByIdUseCase
	let gymRepository: InMemoryGymRepository

	beforeEach(() => {
		container.snapshot()
		gymRepository = setupInMemoryRepositories().gymRepository
		sut = container.get(GYM_TYPES.UseCases.FetchGymById)
	})

	afterEach(() => {
		container.restore()
	})

	test("com includeInactive: false, buscar uma academia desativada retorna failure(GymNotFoundError)", async () => {
		const gym = await createAndSaveGym({ gymRepository })
		gym.deactivate()
		await gymRepository.update(gym)

		const result = await sut.execute({ gymId: gym.id, includeInactive: false })

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(GymNotFoundError)
	})

	test("com includeInactive: true, retorna sucesso com status 'deactivated' no DTO", async () => {
		const gym = await createAndSaveGym({ gymRepository })
		gym.deactivate()
		await gymRepository.update(gym)

		const result = await sut.execute({ gymId: gym.id, includeInactive: true })

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value.status).toBe("deactivated")
	})
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter backend test:run -- -t "FetchGymByIdUseCase"`
Expected: FAIL — o primeiro teste falha porque `input.includeInactive` ainda não é repassado
ao repositório (a academia desativada é retornada com sucesso mesmo com
`includeInactive: false`); o segundo falha porque o DTO de sucesso não tem `status`.

- **Step 3: Implementação mínima**

Arquivo atual (shape confirmado real):
```typescript
import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { GYM_TYPES } from "@/shared/infra/ioc/types"
import { GymNotFoundError } from "../error/gym-not-found-error"
import type { GymRepository } from "../repository/gym-repository"

export interface FetchGymByIdUseCaseInput {
	gymId: string
}

export interface FetchGymByIdUseCaseOutputDTO {
	id: string
	cnpj: string
	title: string
	description: string | null
	phone: string | null
	address: string | null
	imageKey: string | null
	latitude: number
	longitude: number
}

export type FetchGymByIdUseCaseOutput = Either<Error, FetchGymByIdUseCaseOutputDTO>

@injectable()
export class FetchGymByIdUseCase {
	constructor(
		@inject(GYM_TYPES.Repositories.Gym)
		private readonly gymRepository: GymRepository,
	) {}

	public async execute(input: FetchGymByIdUseCaseInput): Promise<FetchGymByIdUseCaseOutput> {
		const gym = await this.gymRepository.gymOfId(input.gymId)
		if (!gym) return failure(new GymNotFoundError())
		return success({
			id: gym.id,
			cnpj: gym.cnpj,
			title: gym.title,
			description: gym.description ?? null,
			phone: gym.phone ?? null,
			address: gym.address ?? null,
			imageKey: gym.imageKey ?? null,
			latitude: gym.latitude,
			longitude: gym.longitude,
		})
	}
}
```

Arquivo completo após a mudança:
```typescript
import { inject, injectable } from "inversify"
import {
	type Either,
	failure,
	success,
} from "@/shared/domain/value-object/either"
import { GYM_TYPES } from "@/shared/infra/ioc/types"
import { GymNotFoundError } from "../error/gym-not-found-error"
import type { GymRepository } from "../repository/gym-repository"

export interface FetchGymByIdUseCaseInput {
	gymId: string
	includeInactive?: boolean
}

export interface FetchGymByIdUseCaseOutputDTO {
	id: string
	cnpj: string
	title: string
	description: string | null
	phone: string | null
	address: string | null
	imageKey: string | null
	latitude: number
	longitude: number
	status: "activated" | "deactivated"
}

export type FetchGymByIdUseCaseOutput = Either<Error, FetchGymByIdUseCaseOutputDTO>

@injectable()
export class FetchGymByIdUseCase {
	constructor(
		@inject(GYM_TYPES.Repositories.Gym)
		private readonly gymRepository: GymRepository,
	) {}

	public async execute(input: FetchGymByIdUseCaseInput): Promise<FetchGymByIdUseCaseOutput> {
		const gym = await this.gymRepository.gymOfId(input.gymId, {
			includeInactive: input.includeInactive,
		})
		if (!gym) return failure(new GymNotFoundError())
		return success({
			id: gym.id,
			cnpj: gym.cnpj,
			title: gym.title,
			description: gym.description ?? null,
			phone: gym.phone ?? null,
			address: gym.address ?? null,
			imageKey: gym.imageKey ?? null,
			latitude: gym.latitude,
			longitude: gym.longitude,
			status: gym.status,
		})
	}
}
```

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "FetchGymByIdUseCase"`
Expected: PASS — os 2 casos de teste passam.

- **Step 5: Commit**

```bash
git add apps/backend/src/gym/application/use-case/fetch-gym-by-id.usecase.ts \
  apps/backend/src/gym/application/use-case/fetch-gym-by-id.usecase.test.ts
git commit -m "feat(gym): add includeInactive filter and status to FetchGymByIdUseCase"
```

## Critérios de Sucesso

- Com `includeInactive: false`, buscar uma academia desativada pelo id retorna
  `failure(GymNotFoundError)` — mesmo erro de "não encontrado" usado para um id inexistente,
  sem mensagem diferenciada (FR-008, Decisão D2).
- Com `includeInactive: true`, buscar a mesma academia retorna `success` com
  `status: "deactivated"` no DTO, permitindo que um admin veja o detalhe (FR-009).
- Nenhuma lógica condicional extra de "esconder" foi adicionada no use case além de repassar
  `includeInactive` ao repositório — o comportamento de ocultação é 100% responsabilidade do
  repositório (Task 4).
- `pnpm --filter backend test:run -- -t "FetchGymByIdUseCase"` passa com os 2 casos mínimos.
