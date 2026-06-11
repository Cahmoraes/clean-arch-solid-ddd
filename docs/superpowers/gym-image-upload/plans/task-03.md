# Task 3: Expor `imageKey` nos endpoints de leitura (detalhe, listagem e busca) [FR-013, FR-014]

**Status:** DONE
**PRD:** `../prd/prd-gym-image-upload.md`
**Spec:** `../specs/gym-image-upload-design.md`
**Depends on:** task-02

## Visão Geral

Inclui `imageKey` nos DTOs de saída e nos schemas de resposta dos endpoints de leitura de academia (`GET /gyms/:gymId`, `GET /gyms` e `GET /gyms/search/:name`), para que o frontend possa exibir a imagem nos cards (FR-013) e no detalhe (FR-014). Sem isso, a imagem persistida nunca chega à UI.

## Arquivos

- Modify: `apps/backend/src/gym/application/use-case/fetch-gym-by-id.usecase.ts`
- Modify: `apps/backend/src/gym/infra/controller/fetch-gym-by-id.controller.ts`
- Modify: `apps/backend/src/gym/application/use-case/fetch-all-gyms.usecase.ts`
- Modify: `apps/backend/src/gym/infra/controller/fetch-all-gyms.controller.ts`
- Modify: `apps/backend/src/gym/application/use-case/search-gym.usecase.ts`
- Modify: `apps/backend/src/gym/infra/controller/search-gym.controller.ts`
- Test: `apps/backend/src/gym/application/use-case/fetch-gym-by-id.usecase.test.ts`

### Conformidade com as Skills Padrão

- use test-antipatterns: teste valida o DTO retornado (contrato observável), não internals.

## Passos

- **Step 1: Escrever o teste que falha (DTO de `FetchGymByIdUseCase` inclui `imageKey`)**

Adicione ao final de `apps/backend/src/gym/application/use-case/fetch-gym-by-id.usecase.test.ts`:

```typescript
describe("FetchGymByIdUseCase imageKey", () => {
	test("retorna imageKey no DTO quando a academia tem imagem", async () => {
		const gymRepository = new InMemoryGymRepository()
		const gym = Gym.restore({
			id: "gym-1",
			title: "Academia Teste",
			latitude: 0,
			longitude: 0,
			cnpj: "11.222.333/0001-81",
			address: "Rua A, 1",
			imageKey: "gyms/foto.webp",
		})
		await gymRepository.save(gym)
		const sut = new FetchGymByIdUseCase(gymRepository)

		const result = await sut.execute({ gymId: "gym-1" })

		expect(result.forceSuccess().value.imageKey).toBe("gyms/foto.webp")
	})

	test("retorna imageKey null quando a academia não tem imagem", async () => {
		const gymRepository = new InMemoryGymRepository()
		const gym = Gym.restore({
			id: "gym-2",
			title: "Academia Sem Foto",
			latitude: 0,
			longitude: 0,
			cnpj: "11.222.333/0001-81",
			address: "Rua B, 2",
		})
		await gymRepository.save(gym)
		const sut = new FetchGymByIdUseCase(gymRepository)

		const result = await sut.execute({ gymId: "gym-2" })

		expect(result.forceSuccess().value.imageKey).toBeNull()
	})
})
```

> Confirme os imports no topo do arquivo: `Gym` de `@/gym/domain/gym`, `InMemoryGymRepository` de `@/shared/infra/database/repository/in-memory/in-memory-gym-repository`, e `FetchGymByIdUseCase` do módulo sob teste. Adicione os que faltarem.

- **Step 2: Rodar o teste e confirmar a falha**

Run: `pnpm --filter backend test:run -- -t "FetchGymByIdUseCase imageKey"`
Expected: FAIL — `imageKey` não existe no DTO.

- **Step 3: Adicionar `imageKey` ao `FetchGymByIdUseCase`**

Em `apps/backend/src/gym/application/use-case/fetch-gym-by-id.usecase.ts`:

1. No `FetchGymByIdUseCaseOutputDTO`, adicione `cnpj` e `imageKey` (o `cnpj` é necessário para o pré-preenchimento da tela de edição — task-17):

```typescript
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
```

2. No `execute`, no objeto de `success`, mapeie `cnpj` e `imageKey`:

```typescript
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
```

- **Step 4: Adicionar `imageKey` ao schema de resposta do `FetchGymByIdController`**

Em `apps/backend/src/gym/infra/controller/fetch-gym-by-id.controller.ts`, no `gymResponseSchema`, adicione `cnpj` (após `id`) e `imageKey` (após `address`):

```typescript
	id: z.string().meta({
		description: "Gym ID",
		example: "550e8400-e29b-41d4-a716-446655440000",
	}),
	cnpj: z.string().meta({ description: "Gym CNPJ", example: "12345678000100" }),
	title: z.string().meta({ description: "Gym name", example: "Iron Gym" }),
```

E, após a linha de `address`:

```typescript
	address: z.string().nullable().meta({ description: "Full gym address" }),
	imageKey: z
		.string()
		.nullable()
		.meta({ description: "Relative key of the gym image", example: "gyms/abc.webp" }),
	latitude: z.number().meta({ description: "Latitude", example: -23.5505 }),
```

- **Step 5: Adicionar `imageKey` ao `FetchAllGymsUseCase`**

Em `apps/backend/src/gym/application/use-case/fetch-all-gyms.usecase.ts`:

1. No `FetchAllGymsUseCaseOutput`, adicione `imageKey: string | null` após `address`.
2. No `toDTO`, adicione `imageKey: g.imageKey ?? null,` ao objeto mapeado.

- **Step 6: Adicionar `imageKey` ao schema de resposta do `FetchAllGymsController`**

Em `apps/backend/src/gym/infra/controller/fetch-all-gyms.controller.ts`, dentro do `z.array(z.object({ ... }))` da resposta 200, adicione após `address`:

```typescript
							address: z
								.string()
								.nullable()
								.meta({ description: "Full gym address" }),
							imageKey: z
								.string()
								.nullable()
								.meta({ description: "Relative key of the gym image" }),
```

- **Step 7: Adicionar `imageKey` ao `SearchGymUseCase` e ao `SearchGymController`**

1. Em `search-gym.usecase.ts`: adicione `imageKey: string | null` ao `SearchGymUseCaseOutput` (após `phone`) e `imageKey: g.imageKey ?? null,` no `createGymDTO`.
2. Em `search-gym.controller.ts`: no `z.array(z.object({...}))` da resposta 200, adicione após `phone`:

```typescript
							phone: z
								.string()
								.nullable()
								.meta({ description: "Gym phone number" }),
							imageKey: z
								.string()
								.nullable()
								.meta({ description: "Relative key of the gym image" }),
```

- **Step 8: Rodar o teste, verificar tipos e business-flow**

Run: `pnpm --filter backend test:run -- -t "FetchGymByIdUseCase imageKey"`
Expected: PASS (2 testes).

Run: `pnpm --filter backend tsc:check`
Expected: zero erros.

Run: `pnpm --filter backend test:business-flow -- -t "Academia"`
Expected: PASS (os business-flow existentes de gym continuam verdes; a resposta agora inclui `imageKey`).

- **Step 9: Lint + commit**

Run: `pnpm --filter backend biome:fix`
Expected: zero problemas.

```bash
git add apps/backend/src/gym
git commit -m "feat(gym): expose imageKey in gym read endpoints (detail/list/search)"
```

## Critérios de Sucesso

- `GET /gyms/:gymId`, `GET /gyms` e `GET /gyms/search/:name` retornam `imageKey` (string ou null). [FR-013, FR-014]
- Teste unitário do DTO passa; `tsc:check`, `biome:fix` e business-flow existentes sem problemas.
