# Task 2: Repositórios de Gym — mapear `imageKey` + método `update` [FR-006, FR-008]

**Status:** DONE
**PRD:** `../prd/prd-gym-image-upload.md`
**Spec:** `../specs/gym-image-upload-design.md`
**Depends on:** task-01

## Visão Geral

Propaga o `imageKey` pelas implementações de repositório (Prisma e in-memory) no `save`/leitura e adiciona um método `update(gym)` ao contrato `GymRepository`, necessário para a edição de dados cadastrais (FR-006) e para a troca de imagem (FR-008). Hoje só existe `save` (que faz `create`); a edição precisa de um caminho de atualização.

## Arquivos

- Modify: `apps/backend/src/gym/application/repository/gym-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/prisma/prisma-gym-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts`
- Test: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.test.ts`

### Conformidade com as Skills Padrão

- use no-workarounds: implementação real de `update`, sem reusar `save` (que faz `create` e quebraria por id duplicado).
- use test-antipatterns: teste valida o efeito de `update` via leitura subsequente (`gymOfId`).

## Passos

- **Step 1: Adicionar `update` ao contrato `GymRepository`**

Em `apps/backend/src/gym/application/repository/gym-repository.ts`, adicione o método à interface:

```typescript
export interface GymRepository {
	save(gym: Gym): Promise<SaveGymResult>
	update(gym: Gym): Promise<void>
	gymOfId(id: string): Promise<Gym | null>
	fetchNearbyCoord(coordinate: Coordinate): Promise<Gym[]>
	gymOfCNPJ(cnpj: string): Promise<Gym | null>
	fetchGyms(input: FetchGymsInput): Promise<Gym[]>
	withTransaction<TX extends object>(object: TX): GymRepository
}
```

- **Step 2: Escrever o teste que falha (in-memory `update` + mapeamento de `imageKey`)**

Adicione ao final de `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.test.ts`:

```typescript
describe("InMemoryGymRepository update", () => {
	test("atualiza os dados e o imageKey de uma academia existente", async () => {
		const repository = new InMemoryGymRepository()
		const gym = Gym.create({
			id: "gym-1",
			title: "Nome Antigo",
			latitude: 0,
			longitude: 0,
			cnpj: "11.222.333/0001-81",
			address: "Rua A, 1",
		}).forceSuccess().value
		await repository.save(gym)

		const updated = Gym.restore({
			id: "gym-1",
			title: "Nome Novo",
			latitude: 0,
			longitude: 0,
			cnpj: "11.222.333/0001-81",
			address: "Rua B, 2",
			imageKey: "gyms/novo.webp",
		})
		await repository.update(updated)

		const found = await repository.gymOfId("gym-1")
		expect(found?.title).toBe("Nome Novo")
		expect(found?.imageKey).toBe("gyms/novo.webp")
		expect(repository.gyms.size).toBe(1)
	})
})
```

> Confirme que o topo do arquivo já importa `Gym` de `@/gym/domain/gym` e `InMemoryGymRepository`. Se faltar, adicione os imports.

- **Step 3: Rodar o teste e confirmar a falha**

Run: `pnpm --filter backend test:run -- -t "InMemoryGymRepository update"`
Expected: FAIL — `repository.update` não existe / `imageKey` não preservado.

- **Step 4: Implementar `update` + `imageKey` no repositório in-memory**

Em `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts`:

1. No `save`, inclua `imageKey` no `Gym.restore`:

```typescript
	public async save(gym: Gym): Promise<SaveGymResult> {
		const gymWithId = Gym.restore({
			id: gym.id,
			title: gym.title,
			description: gym.description,
			latitude: gym.latitude,
			longitude: gym.longitude,
			phone: gym.phone,
			cnpj: gym.cnpj,
			address: gym.address,
			imageKey: gym.imageKey,
		})
		this.gyms.add(gymWithId)
		return { id: gym.id }
	}
```

2. Adicione o método `update` logo após `save`:

```typescript
	public async update(gym: Gym): Promise<void> {
		const existing = this.gyms.find((current) => current.id === gym.id)
		if (existing) this.gyms.delete(existing)
		this.gyms.add(
			Gym.restore({
				id: gym.id,
				title: gym.title,
				description: gym.description,
				latitude: gym.latitude,
				longitude: gym.longitude,
				phone: gym.phone,
				cnpj: gym.cnpj,
				address: gym.address,
				imageKey: gym.imageKey,
			}),
		)
	}
```

- **Step 5: Rodar o teste e confirmar o sucesso**

Run: `pnpm --filter backend test:run -- -t "InMemoryGymRepository update"`
Expected: PASS.

- **Step 6: Implementar `imageKey` + `update` no repositório Prisma**

Em `apps/backend/src/shared/infra/database/repository/prisma/prisma-gym-repository.ts`:

1. Adicione `image_key` à interface `GymCreateProps` (logo após `address`):

```typescript
export interface GymCreateProps {
	id: string
	title: string
	description: string | null
	phone?: string | null
	address?: string | null
	image_key?: string | null
	latitude: Decimal
	longitude: Decimal
	cnpj: string
}
```

2. No `save`, inclua `image_key` no `data`:

```typescript
		const result = await this.prismaClient.gym.create({
			data: {
				id: gym.id,
				title: gym.title,
				description: gym.description,
				phone: gym.phone ? gym.phone.toString() : undefined,
				address: gym.address,
				image_key: gym.imageKey ?? null,
				latitude: gym.latitude,
				longitude: gym.longitude,
				cnpj: gym.cnpj,
			},
			select: { id: true },
		})
		return { id: result.id }
```

3. No `createGym`, propague `imageKey`:

```typescript
	private createGym(props: GymCreateProps): Gym {
		return Gym.restore({
			id: props.id,
			title: props.title,
			description: props.description ?? undefined,
			phone: props.phone ? props.phone : undefined,
			address: props.address ?? undefined,
			imageKey: props.image_key ?? undefined,
			latitude: props.latitude.toNumber(),
			longitude: props.longitude.toNumber(),
			cnpj: props.cnpj,
		})
	}
```

4. Adicione o método `update` após `save`:

```typescript
	public async update(gym: Gym): Promise<void> {
		await this.prismaClient.gym.update({
			where: { id: gym.id },
			data: {
				title: gym.title,
				description: gym.description ?? null,
				phone: gym.phone ?? null,
				address: gym.address ?? null,
				image_key: gym.imageKey ?? null,
				latitude: gym.latitude,
				longitude: gym.longitude,
				cnpj: gym.cnpj,
			},
		})
	}
```

- **Step 7: Verificar tipos + lint + commit**

Run: `pnpm --filter backend tsc:check`
Expected: zero erros (o client Prisma regenerado na task-01 já conhece `image_key`).

Run: `pnpm --filter backend biome:fix`
Expected: zero problemas.

```bash
git add apps/backend/src/gym/application/repository/gym-repository.ts apps/backend/src/shared/infra/database/repository
git commit -m "feat(gym): map imageKey + add update() to gym repositories"
```

## Critérios de Sucesso

- `GymRepository.update(gym)` existe e é implementado por Prisma e in-memory.
- `save`/`gymOfId` preservam `imageKey` em ambas implementações. [FR-008]
- `update` substitui dados e `imageKey` sem duplicar registros (in-memory `gyms.size` permanece 1). [FR-006]
- `tsc:check` e `biome:fix` sem problemas.
