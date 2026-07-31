# Task 4: `GymRepository` (interface + Prisma + in-memory) — persiste `status` e filtra por `includeInactive` [FR-006, FR-008, FR-009, FR-011]

**Status:** PENDING
**PRD:** `../prd/prd-gym-deactivation.md`
**Spec:** `../specs/gym-deactivation-design.md`
**Tier:** cheap
**Depends on:** task-01, task-03

## Visão Geral

Estende a interface `GymRepository` e as duas implementações (`PrismaGymRepository`,
`InMemoryGymRepository`) para persistir/ler o campo `status` (Task 1 + Task 3) e para aceitar
um filtro opcional `includeInactive`. Regra de filtro (Decisão D1, não reabrir): quando
`includeInactive` for `false` explicitamente, o repositório restringe o resultado a
`status = 'activated'`. Quando omitido ou `true`, nenhum filtro é aplicado — preservando o
comportamento atual de qualquer call-site que ainda não foi migrado para passar o parâmetro.
`gymOfCNPJ` **não muda** — a checagem de CNPJ duplicado deve enxergar academias desativadas
também (não seria possível recadastrar um CNPJ de uma academia desativada por engano).

## Arquivos

- Modify: `apps/backend/src/gym/application/repository/gym-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/prisma/prisma-gym-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts`
- Test: `apps/backend/src/gym/application/repository/gym-repository.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: extensão da interface `GymRepository` com parâmetros opcionais
  (`options?: { includeInactive?: boolean }`) sem quebrar assinaturas existentes.
- `vitest`: suíte de testes de repositório usando `container.snapshot()`/`container.restore()`
  e o factory `createAndSaveGym`, seguindo a convenção real já usada em
  `fetch-all-gyms.usecase.test.ts`.
- `no-workarounds`: a regra de filtro (D1) deve ser implementada de forma explícita e
  simétrica nas duas implementações (Prisma e in-memory) — nunca aplicar um filtro implícito
  que um dos dois backends de teste não reproduza, o que mascararia bugs em produção.

## Passos

- **Step 1: Escrever o teste que falha**

```typescript
import { createAndSaveGym } from "test/factory/create-and-save-gym"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { container } from "@/shared/infra/ioc/container"

describe("GymRepository — includeInactive", () => {
	let gymRepository: InMemoryGymRepository

	beforeEach(() => {
		container.snapshot()
		gymRepository = setupInMemoryRepositories().gymRepository
	})

	afterEach(() => {
		container.restore()
	})

	test("gymOfId com includeInactive: false não retorna uma academia desativada", async () => {
		const gym = await createAndSaveGym({ gymRepository })
		gym.deactivate()
		await gymRepository.update(gym)

		const found = await gymRepository.gymOfId(gym.id, { includeInactive: false })
		expect(found).toBeNull()
	})

	test("gymOfId com includeInactive: true retorna a academia desativada", async () => {
		const gym = await createAndSaveGym({ gymRepository })
		gym.deactivate()
		await gymRepository.update(gym)

		const found = await gymRepository.gymOfId(gym.id, { includeInactive: true })
		expect(found?.status).toBe("deactivated")
	})

	test("fetchGyms com includeInactive omitido não filtra por status (retrocompatível)", async () => {
		const gym = await createAndSaveGym({ gymRepository })
		gym.deactivate()
		await gymRepository.update(gym)

		const { items } = await gymRepository.fetchGyms({ page: 1 })
		expect(items.some((g) => g.id === gym.id)).toBe(true)
	})
})
```

Nota: o teste acima usa `container.snapshot()`/`container.restore()` e
`setupInMemoryRepositories()`/`test/factory/create-and-save-gym.ts`, seguindo exatamente a
convenção real observada em
`apps/backend/src/gym/application/use-case/fetch-all-gyms.usecase.test.ts` — o repositório
usado no teste precisa ser explicitamente a instância in-memory devolvida por
`setupInMemoryRepositories()` (o binding padrão do container aponta para
`PrismaGymRepository`; sem o rebind, o teste tentaria acessar um banco real).

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter backend test:run -- -t "GymRepository"`
Expected: FAIL — `gymRepository.gymOfId(gym.id, { includeInactive: false })` ignora o segundo
argumento hoje (a assinatura atual não aceita `options`), então a academia desativada
continua sendo retornada.

- **Step 3: Implementação mínima**

Interface atual (`apps/backend/src/gym/application/repository/gym-repository.ts`):
```typescript
import type { Gym } from "@/gym/domain/gym"
import type { Coordinate } from "@/shared/domain/value-object/coordinate.js"

export interface SaveGymResult {
	id: string
}

export interface FetchGymsInput {
	title?: string
	page: number
}

export interface FetchGymsOutput {
	items: Gym[]
	total: number
}

export interface GymRepository {
	save(gym: Gym): Promise<SaveGymResult>
	update(gym: Gym): Promise<void>
	gymOfId(id: string): Promise<Gym | null>
	fetchNearbyCoord(coordinate: Coordinate): Promise<Gym[]>
	gymOfCNPJ(cnpj: string): Promise<Gym | null>
	fetchGyms(input: FetchGymsInput): Promise<FetchGymsOutput>
	withTransaction<TX extends object>(object: TX): GymRepository
}
```

Interface após a mudança:
```typescript
import type { Gym } from "@/gym/domain/gym"
import type { Coordinate } from "@/shared/domain/value-object/coordinate.js"

export interface SaveGymResult {
	id: string
}

export interface FetchGymsInput {
	title?: string
	page: number
	includeInactive?: boolean
}

export interface FetchGymsOutput {
	items: Gym[]
	total: number
}

export interface GymRepository {
	save(gym: Gym): Promise<SaveGymResult>
	update(gym: Gym): Promise<void>
	gymOfId(
		id: string,
		options?: { includeInactive?: boolean },
	): Promise<Gym | null>
	fetchNearbyCoord(
		coordinate: Coordinate,
		options?: { includeInactive?: boolean },
	): Promise<Gym[]>
	gymOfCNPJ(cnpj: string): Promise<Gym | null>
	fetchGyms(input: FetchGymsInput): Promise<FetchGymsOutput>
	withTransaction<TX extends object>(object: TX): GymRepository
}
```

`PrismaGymRepository` (`apps/backend/src/shared/infra/database/repository/prisma/prisma-gym-repository.ts`)
— alterações pontuais no arquivo já existente:

1. `save()`/`update()`: adicionar `status: gym.status` ao objeto `data` passado para
   `this.prismaClient.gym.create()`/`.update()`.
2. Mapper privado `createGym()`: adicionar `status: props.status` ao objeto passado para
   `Gym.restore({...})`.
3. `fetchGyms(input)`:
   ```typescript
   public async fetchGyms(input: FetchGymsInput): Promise<FetchGymsOutput> {
   	const statusFilter =
   		input.includeInactive === false ? { status: "activated" as const } : {}
   	const where: Prisma.GymWhereInput = {
   		...(input.title
   			? { title: { contains: input.title, mode: "insensitive" as const } }
   			: {}),
   		...statusFilter,
   	}
   	const [items, total] = await Promise.all([
   		this.prismaClient.gym.findMany({
   			where,
   			skip: (input.page - 1) * env.ITEMS_PER_PAGE,
   			take: env.ITEMS_PER_PAGE,
   		}),
   		this.prismaClient.gym.count({ where }),
   	])
   	return { items: items.map(this.createGym), total }
   }
   ```
   (manter a paginação/`env.ITEMS_PER_PAGE` já existente no arquivo real — o trecho acima
   mostra apenas o ponto de mudança do `where`).
4. `gymOfId(id, options)` — trocar `findUnique` por `findFirst` quando precisar filtrar por
   status, porque `findUnique` só aceita filtros pela chave única:
   ```typescript
   public async gymOfId(
   	id: string,
   	options?: { includeInactive?: boolean },
   ): Promise<Gym | null> {
   	const gym = await this.prismaClient.gym.findFirst({
   		where: {
   			id,
   			...(options?.includeInactive === false
   				? { status: "activated" as const }
   				: {}),
   		},
   	})
   	if (!gym) return null
   	return this.createGym(gym)
   }
   ```
5. `fetchNearbyCoord(coordinate, options)`:
   ```typescript
   import { Prisma } from "@/shared/infra/database/generated/prisma/client"

   public async fetchNearbyCoord(
   	coordinate: Coordinate,
   	options?: { includeInactive?: boolean },
   ): Promise<Gym[]> {
   	const statusClause =
   		options?.includeInactive === false
   			? Prisma.sql`AND status = 'activated'`
   			: Prisma.empty
   	const gyms = await this.prismaClient.$queryRaw<GymCreateProps[]>`
   		SELECT * FROM "gyms"
   		WHERE ST_DistanceSphere(
   			ST_MakePoint("longitude", "latitude"),
   			ST_MakePoint(${coordinate.longitude}, ${coordinate.latitude})
   		) <= 10000
   		${statusClause}
   	`
   	return gyms.map(this.createGym)
   }
   ```
6. `gymOfCNPJ()`: nenhuma mudança — continua sem filtro de status, por design (checagem de
   CNPJ duplicado deve enxergar academias desativadas).

`InMemoryGymRepository` (`apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts`)
— alterações pontuais:

1. `save()`/`update()`: adicionar `status: gym.status` ao objeto passado para
   `Gym.restore({...})` (mantendo o restante da lógica já existente de push/replace no
   array `this.gyms`).
2. `gymOfId(id, options)`:
   ```typescript
   public async gymOfId(
   	id: string,
   	options?: { includeInactive?: boolean },
   ): Promise<Gym | null> {
   	const gym = this.gyms.find((gym) => gym.id === id)
   	if (!gym) return null
   	if (options?.includeInactive === false && gym.status !== "activated") return null
   	return gym
   }
   ```
3. `fetchGyms(input)`: aplicar o mesmo filtro de status ao array antes de paginar (filtrar
   `this.gyms.filter((g) => g.status === "activated")` quando `input.includeInactive === false`,
   antes de aplicar o filtro de `title` e a paginação já existentes).
4. `fetchNearbyCoord(coordinate, options)`: aplicar o mesmo filtro de status ao array
   `nearbyGyms` antes de retornar, quando `options?.includeInactive === false`.

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "GymRepository"`
Expected: PASS — os 3 casos de teste passam.

- **Step 5: Commit**

```bash
git add apps/backend/src/gym/application/repository/gym-repository.ts \
  apps/backend/src/gym/application/repository/gym-repository.test.ts \
  apps/backend/src/shared/infra/database/repository/prisma/prisma-gym-repository.ts \
  apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts
git commit -m "feat(gym): persist status and filter by includeInactive in GymRepository"
```

## Critérios de Sucesso

- `GymRepository.fetchGyms`, `gymOfId`, `fetchNearbyCoord` aceitam `includeInactive`
  (via `FetchGymsInput` ou `options`), e quando `includeInactive === false` explicitamente,
  o resultado exclui qualquer academia com `status !== "activated"` (FR-006, FR-008,
  FR-009).
- Quando `includeInactive` é omitido ou `true`, nenhum filtro de status é aplicado —
  comportamento idêntico ao pré-existente (Decisão D1, retrocompatibilidade).
- `gymOfCNPJ` continua sem filtro de status, enxergando academias desativadas (checagem de
  duplicidade de CNPJ não regride).
- Tanto `PrismaGymRepository` quanto `InMemoryGymRepository` persistem e leem `status`
  corretamente via `save()`/`update()`/mapeamento de leitura (FR-011).
- `pnpm --filter backend test:run -- -t "GymRepository"` passa com os 3 casos mínimos do
  Step 1.
