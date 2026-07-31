# Task 7: `FetchAllGymsUseCase` — `includeInactive` por papel + `status` no DTO [FR-006, FR-012]

**Status:** PENDING
**PRD:** `../prd/prd-gym-deactivation.md`
**Spec:** `../specs/gym-deactivation-design.md`
**Tier:** cheap
**Depends on:** task-04

## Visão Geral

Estende `FetchAllGymsUseCase` para aceitar `includeInactive?: boolean` no input (decidido pelo
chamador — o controller, na Task 13, é quem calcula esse boolean a partir do papel do
usuário) e repassar para `gymRepository.fetchGyms()`. O DTO de saída ganha o campo `status`,
necessário para o frontend (Task 19) exibir o selo "Desativada" para admins.

## Arquivos

- Modify: `apps/backend/src/gym/application/use-case/fetch-all-gyms.usecase.ts`
- Test: `apps/backend/src/gym/application/use-case/fetch-all-gyms.usecase.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: extensão de `FetchAllGymsUseCaseInput`/`FetchAllGymsUseCaseOutputDTO`
  com campos opcionais/adicionais sem quebrar os call-sites existentes.
- `vitest`: novos casos de teste adicionados ao arquivo já existente, seguindo o padrão real
  de `container.snapshot()`/`createAndSaveGym`/`GYM_TYPES` já usado nesse arquivo.
- `no-workarounds`: o filtro `includeInactive` deve ser repassado explicitamente ao
  repositório — nunca aplicado como um default implícito dentro do use case, respeitando a
  Decisão D1 (o chamador decide em cada camada).

## Passos

- **Step 1: Escrever o teste que falha**

```typescript
test("com includeInactive omitido, uma academia desativada não aparece no resultado", async () => {
	await createAndSaveGym({ id: "1", gymRepository, title: "Academia Ativa" })
	const deactivatedGym = await createAndSaveGym({
		id: "2",
		gymRepository,
		title: "Academia Desativada",
	})
	deactivatedGym.deactivate()
	await gymRepository.update(deactivatedGym)

	const result = await sut.execute({ page: 1 })

	expect(result.data.some((g) => g.id === deactivatedGym.id)).toBe(false)
})

test("com includeInactive: true, a academia desativada aparece com status 'deactivated' no DTO", async () => {
	const deactivatedGym = await createAndSaveGym({
		id: "1",
		gymRepository,
		title: "Academia Desativada",
	})
	deactivatedGym.deactivate()
	await gymRepository.update(deactivatedGym)

	const result = await sut.execute({ page: 1, includeInactive: true })

	const found = result.data.find((g) => g.id === deactivatedGym.id)
	expect(found?.status).toBe("deactivated")
})
```

Estes casos devem ser adicionados ao `describe("FetchAllGymsUseCase", ...)` já existente em
`fetch-all-gyms.usecase.test.ts`, reaproveitando as variáveis `sut`/`gymRepository`
declaradas no `beforeEach` já existente do arquivo (`sut = container.get(GYM_TYPES.UseCases.FetchAllGyms)`,
`gymRepository = (await setupInMemoryRepositories()).gymRepository`) — não redeclarar
`sut`/`gymRepository` dentro dos novos `test()`.

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter backend test:run -- -t "FetchAllGymsUseCase"`
Expected: FAIL — o segundo teste falha porque `found?.status` é `undefined` (o DTO ainda não
tem o campo `status`); o primeiro teste já passaria incidentalmente hoje (a academia
desativada aparece, mas o teste em si falha por não conseguir diferenciar sem o filtro).

- **Step 3: Implementação mínima**

Arquivo atual completo (`apps/backend/src/gym/application/use-case/fetch-all-gyms.usecase.ts`):
```typescript
import { inject, injectable } from "inversify"
import type { Gym } from "@/gym/domain/gym"
import { env } from "@/shared/infra/env"
import { GYM_TYPES } from "@/shared/infra/ioc/types"
import type { GymRepository } from "../repository/gym-repository"
import type { GymPaginationMeta } from "./gym-pagination-meta"

export interface FetchAllGymsUseCaseInput {
	page?: number
}

export interface FetchAllGymsUseCaseOutputDTO {
	id: string
	title: string
	description: string | null
	phone: string | null
	address: string | null
	imageKey: string | null
	latitude: number
	longitude: number
}

export interface FetchAllGymsUseCaseOutput {
	data: FetchAllGymsUseCaseOutputDTO[]
	pagination: GymPaginationMeta
}

@injectable()
export class FetchAllGymsUseCase {
	constructor(
		@inject(GYM_TYPES.Repositories.Gym)
		private readonly gymRepository: GymRepository,
	) {}

	public async execute(
		input: FetchAllGymsUseCaseInput,
	): Promise<FetchAllGymsUseCaseOutput> {
		const page = input.page ?? 1
		const { items, total } = await this.gymRepository.fetchGyms({ page })
		const data = this.toDTO(items)
		return { data, pagination: { total, page, limit: env.ITEMS_PER_PAGE } }
	}

	private toDTO(gyms: Gym[]): FetchAllGymsUseCaseOutputDTO[] {
		return gyms.map((g) => ({
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

export interface FetchAllGymsUseCaseInput {
	page?: number
	includeInactive?: boolean
}

export interface FetchAllGymsUseCaseOutputDTO {
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

export interface FetchAllGymsUseCaseOutput {
	data: FetchAllGymsUseCaseOutputDTO[]
	pagination: GymPaginationMeta
}

@injectable()
export class FetchAllGymsUseCase {
	constructor(
		@inject(GYM_TYPES.Repositories.Gym)
		private readonly gymRepository: GymRepository,
	) {}

	public async execute(
		input: FetchAllGymsUseCaseInput,
	): Promise<FetchAllGymsUseCaseOutput> {
		const page = input.page ?? 1
		const { items, total } = await this.gymRepository.fetchGyms({
			page,
			includeInactive: input.includeInactive,
		})
		const data = this.toDTO(items)
		return { data, pagination: { total, page, limit: env.ITEMS_PER_PAGE } }
	}

	private toDTO(gyms: Gym[]): FetchAllGymsUseCaseOutputDTO[] {
		return gyms.map((g) => ({
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

Run: `pnpm --filter backend test:run -- -t "FetchAllGymsUseCase"`
Expected: PASS — os 2 novos casos e todos os já existentes passam.

- **Step 5: Commit**

```bash
git add apps/backend/src/gym/application/use-case/fetch-all-gyms.usecase.ts \
  apps/backend/src/gym/application/use-case/fetch-all-gyms.usecase.test.ts
git commit -m "feat(gym): add includeInactive filter and status to FetchAllGymsUseCase"
```

## Critérios de Sucesso

- Com `includeInactive` omitido (ou `false`), uma academia desativada não aparece no
  resultado de `FetchAllGymsUseCase.execute()` (FR-006).
- Com `includeInactive: true`, a academia desativada aparece, e seu `status` no DTO é
  `"deactivated"` (FR-012).
- `FetchAllGymsUseCaseOutputDTO.status` é `"activated" | "deactivated"` para toda academia
  retornada, não apenas as desativadas.
- `pnpm --filter backend test:run -- -t "FetchAllGymsUseCase"` passa sem regressão nos casos
  já existentes no arquivo.
