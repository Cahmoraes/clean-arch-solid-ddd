# Task 8: `SearchGymUseCase` — `includeInactive` por papel + `status` no DTO [FR-006, FR-012]

**Status:** DONE
**PRD:** `../prd/prd-gym-deactivation.md`
**Spec:** `../specs/gym-deactivation-design.md`
**Tier:** cheap
**Depends on:** task-04

## Visão Geral

Estende `SearchGymUseCase` (busca de academias por nome) para aceitar `includeInactive?:
boolean` no input e repassar para `gymRepository.fetchGyms()`, e adiciona `status` ao DTO de
saída — o mesmo tratamento dado a `FetchAllGymsUseCase` na Task 7, aplicado ao fluxo de busca
por nome.

## Arquivos

- Modify: `apps/backend/src/gym/application/use-case/search-gym.usecase.ts`
- Test: `apps/backend/src/gym/application/use-case/search-gym.usecase.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: extensão de `SearchGymUseCaseInput`/`SearchGymUseCaseOutputDTO` com
  campos opcionais/adicionais sem quebrar os call-sites existentes.
- `vitest`: suíte de teste seguindo o padrão real de `container.snapshot()`/
  `createAndSaveGym`/`GYM_TYPES` já usado em `fetch-all-gyms.usecase.test.ts` (mesmo bounded
  context).
- `no-workarounds`: o filtro `includeInactive` deve ser repassado explicitamente ao
  repositório, nunca aplicado implicitamente dentro do use case (Decisão D1).

## Passos

- **Step 1: Escrever o teste que falha**

```typescript
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { container } from "@/shared/infra/ioc/container"
import { GYM_TYPES } from "@/shared/infra/ioc/types"
import type { SearchGymUseCase } from "./search-gym.usecase"

describe("SearchGymUseCase — includeInactive", () => {
	let sut: SearchGymUseCase
	let gymRepository: InMemoryGymRepository

	beforeEach(() => {
		container.snapshot()
		gymRepository = setupInMemoryRepositories().gymRepository
		sut = container.get(GYM_TYPES.UseCases.SearchGym)
	})

	afterEach(() => {
		container.restore()
	})

	test("com includeInactive omitido, uma academia desativada não aparece na busca", async () => {
		const deactivatedGym = await createAndSaveGym({ gymRepository, title: "Academia Alpha" })
		deactivatedGym.deactivate()
		await gymRepository.update(deactivatedGym)

		const result = await sut.execute({ name: "Alpha" })

		expect(result.data.some((g) => g.id === deactivatedGym.id)).toBe(false)
	})

	test("com includeInactive: true, a academia desativada aparece com status 'deactivated'", async () => {
		const deactivatedGym = await createAndSaveGym({ gymRepository, title: "Academia Alpha" })
		deactivatedGym.deactivate()
		await gymRepository.update(deactivatedGym)

		const result = await sut.execute({ name: "Alpha", includeInactive: true })

		const found = result.data.find((g) => g.id === deactivatedGym.id)
		expect(found?.status).toBe("deactivated")
	})
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter backend test:run -- -t "SearchGymUseCase"`
Expected: FAIL — `found?.status` é `undefined` (o DTO ainda não tem o campo `status`) e o
resultado da busca ainda inclui academias desativadas mesmo sem `includeInactive: true`.

- **Step 3: Implementação mínima**

Arquivo atual (shape confirmado real):
```typescript
import { inject, injectable } from "inversify"
import type { Gym } from "@/gym/domain/gym"
import { env } from "@/shared/infra/env"
import { GYM_TYPES } from "@/shared/infra/ioc/types"
import type { GymRepository } from "../repository/gym-repository"
import type { GymPaginationMeta } from "./gym-pagination-meta"

export interface SearchGymUseCaseInput {
	name: string
	page?: number
}

export interface SearchGymUseCaseOutputDTO {
	id: string
	title: string
	description: string | null
	phone: string | null
	address: string | null
	imageKey: string | null
	latitude: number
	longitude: number
}

export interface SearchGymUseCaseOutput {
	data: SearchGymUseCaseOutputDTO[]
	pagination: GymPaginationMeta
}

@injectable()
export class SearchGymUseCase {
	constructor(
		@inject(GYM_TYPES.Repositories.Gym)
		private readonly gymRepository: GymRepository,
	) {}

	public async execute(input: SearchGymUseCaseInput): Promise<SearchGymUseCaseOutput> {
		const page = this.pageNumberOrDefault(input.page)
		const { items, total } = await this.gymRepository.fetchGyms({ title: input.name, page })
		const data = this.createGymDTO(items)
		return { data, pagination: { total, page, limit: env.ITEMS_PER_PAGE } }
	}

	private pageNumberOrDefault(page?: number): number {
		return page ?? 1
	}

	private createGymDTO(gym: Gym[]): SearchGymUseCaseOutputDTO[] {
		return gym.map((g) => ({
			id: g.id,
			title: g.title,
			description: g.description ?? null,
			phone: g.phone ?? null,
			address: g.address ?? null,
			imageKey: g.imageKey ?? null,
			latitude: g.latitude,
			longitude: g.longitude,
		}))
	}
}
```

Arquivo completo após a mudança:
```typescript
import { inject, injectable } from "inversify"
import type { Gym } from "@/gym/domain/gym"
import { env } from "@/shared/infra/env"
import { GYM_TYPES } from "@/shared/infra/ioc/types"
import type { GymRepository } from "../repository/gym-repository"
import type { GymPaginationMeta } from "./gym-pagination-meta"

export interface SearchGymUseCaseInput {
	name: string
	page?: number
	includeInactive?: boolean
}

export interface SearchGymUseCaseOutputDTO {
	id: string
	title: string
	description: string | null
	phone: string | null
	address: string | null
	imageKey: string | null
	latitude: number
	longitude: number
	status: "activated" | "deactivated"
}

export interface SearchGymUseCaseOutput {
	data: SearchGymUseCaseOutputDTO[]
	pagination: GymPaginationMeta
}

@injectable()
export class SearchGymUseCase {
	constructor(
		@inject(GYM_TYPES.Repositories.Gym)
		private readonly gymRepository: GymRepository,
	) {}

	public async execute(input: SearchGymUseCaseInput): Promise<SearchGymUseCaseOutput> {
		const page = this.pageNumberOrDefault(input.page)
		const { items, total } = await this.gymRepository.fetchGyms({
			title: input.name,
			page,
			includeInactive: input.includeInactive,
		})
		const data = this.createGymDTO(items)
		return { data, pagination: { total, page, limit: env.ITEMS_PER_PAGE } }
	}

	private pageNumberOrDefault(page?: number): number {
		return page ?? 1
	}

	private createGymDTO(gym: Gym[]): SearchGymUseCaseOutputDTO[] {
		return gym.map((g) => ({
			id: g.id,
			title: g.title,
			description: g.description ?? null,
			phone: g.phone ?? null,
			address: g.address ?? null,
			imageKey: g.imageKey ?? null,
			latitude: g.latitude,
			longitude: g.longitude,
			status: g.status,
		}))
	}
}
```

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "SearchGymUseCase"`
Expected: PASS — os 2 casos de teste passam.

- **Step 5: Commit**

```bash
git add apps/backend/src/gym/application/use-case/search-gym.usecase.ts \
  apps/backend/src/gym/application/use-case/search-gym.usecase.test.ts
git commit -m "feat(gym): add includeInactive filter and status to SearchGymUseCase"
```

## Critérios de Sucesso

- Com `includeInactive` omitido (ou `false`), uma academia desativada não aparece no
  resultado de `SearchGymUseCase.execute()` (FR-006).
- Com `includeInactive: true`, a academia desativada aparece na busca, e seu `status` no DTO
  é `"deactivated"` (FR-012).
- `SearchGymUseCaseOutputDTO.status` é `"activated" | "deactivated"` para toda academia
  retornada.
- `pnpm --filter backend test:run -- -t "SearchGymUseCase"` passa com os 2 casos mínimos.
