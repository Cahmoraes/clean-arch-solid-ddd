# Task 1: Domínio Gym — campo opcional `imageKey` + migration Prisma [FR-003]

**Status:** DONE
**PRD:** `../prd/prd-gym-image-upload.md`
**Spec:** `../specs/gym-image-upload-design.md`
**Depends on:** N/A

## Visão Geral

Adiciona o campo opcional de referência de imagem ao agregado `Gym` (entidade de domínio) e a coluna `image_key` (nullable) à tabela `gyms` via migration Prisma. É a base para persistir e expor a imagem. Como a imagem é opcional (FR-003), o campo é anulável em todas as camadas.

## Arquivos

- Modify: `apps/backend/prisma/schema.prisma` (model `Gym`)
- Modify: `apps/backend/src/gym/domain/gym.ts`
- Test: `apps/backend/src/gym/domain/gym.test.ts`

### Conformidade com as Skills Padrão

- use no-workarounds: sem atalhos — campo opcional real em todas as camadas, sem `any`.
- use test-antipatterns: teste verifica comportamento observável (getter), sem testar detalhes internos.

## Passos

- **Step 1: Adicionar a coluna `image_key` no schema Prisma**

Em `apps/backend/prisma/schema.prisma`, no `model Gym`, adicione a linha `image_key` logo após `address`:

```prisma
model Gym {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  cnpj        String    @unique
  title       String
  description String?
  phone       String?
  address     String?
  image_key   String?
  latitude    Decimal
  longitude   Decimal
  created_at  DateTime  @default(now())
  updated_at  DateTime  @updatedAt
  checkIns    CheckIn[]

  @@map("gyms")
}
```

- **Step 2: Gerar a migration e o client Prisma**

Suba o banco (se necessário) e gere a migration:

Run: `pnpm --filter backend docker:up`
Run: `pnpm --filter backend prisma:migrate:dev -- --name add_gym_image_key`
Expected: cria `apps/backend/prisma/migrations/<timestamp>_add_gym_image_key/migration.sql` contendo `ALTER TABLE "gyms" ADD COLUMN "image_key" TEXT;` e regenera o client.

Caso o client não regenere automaticamente, rode: `pnpm --filter backend prisma:generate`

- **Step 3: Escrever o teste que falha (getter `imageKey`)**

Adicione ao final de `apps/backend/src/gym/domain/gym.test.ts` o bloco:

```typescript
describe("Gym imageKey", () => {
	test("expõe imageKey quando fornecido no create", () => {
		const gym = Gym.create({
			title: "Academia Teste",
			latitude: 0,
			longitude: 0,
			cnpj: "11.222.333/0001-81",
			address: "Rua Padrão, 1",
			imageKey: "gyms/abc.webp",
		}).forceSuccess().value
		expect(gym.imageKey).toBe("gyms/abc.webp")
	})

	test("imageKey é undefined quando não fornecido", () => {
		const gym = Gym.create({
			title: "Academia Teste",
			latitude: 0,
			longitude: 0,
			cnpj: "11.222.333/0001-81",
			address: "Rua Padrão, 1",
		}).forceSuccess().value
		expect(gym.imageKey).toBeUndefined()
	})

	test("restore preserva imageKey", () => {
		const gym = Gym.restore({
			id: "gym-1",
			title: "Academia Teste",
			latitude: 0,
			longitude: 0,
			cnpj: "11.222.333/0001-81",
			address: "Rua Padrão, 1",
			imageKey: "gyms/xyz.webp",
		})
		expect(gym.imageKey).toBe("gyms/xyz.webp")
	})
})
```

- **Step 4: Rodar o teste e confirmar a falha**

Run: `pnpm --filter backend test:run -- -t "Gym imageKey"`
Expected: FAIL — `imageKey` não existe em `GymCreateProps`/`Gym` (erro de tipo/`undefined`).

- **Step 5: Implementar o campo na entidade `Gym`**

Em `apps/backend/src/gym/domain/gym.ts`:

1. No `interface GymConstructor`, adicione `imageKey?: string` após `address?: string`:

```typescript
interface GymConstructor {
	id: Id
	cnpj: CNPJ
	title: Name
	description?: string
	phone: Phone
	coordinate: Coordinate
	address?: string
	imageKey?: string
}
```

2. Na classe, adicione o campo privado após `_address`:

```typescript
	private readonly _address?: string
	private readonly _imageKey?: string
```

3. No `private constructor`, atribua o valor após `this._address`:

```typescript
		this._address = gymProps.address
		this._imageKey = gymProps.imageKey
```

4. Adicione o getter após o getter `address`:

```typescript
	get imageKey(): string | undefined {
		return this._imageKey
	}
```

> `GymCreateProps` e `GymRestoreProps` derivam de `GymConstructor` via `Omit` que NÃO remove `imageKey`, então `imageKey?: string` já fica disponível em ambos automaticamente. `create()` e `restore()` repassam o valor via `{ ...gymProps, ... }` — nenhuma outra alteração é necessária.

- **Step 6: Rodar o teste e confirmar o sucesso**

Run: `pnpm --filter backend test:run -- -t "Gym imageKey"`
Expected: PASS (3 testes).

- **Step 7: Lint + commit**

Run: `pnpm --filter backend biome:fix`
Expected: zero problemas.

```bash
git add apps/backend/prisma apps/backend/src/gym/domain/gym.ts apps/backend/src/gym/domain/gym.test.ts
git commit -m "feat(gym): add optional imageKey to Gym entity + prisma migration"
```

## Critérios de Sucesso

- Coluna `image_key` (nullable) existe na tabela `gyms` (migration aplicada). [FR-003]
- `Gym.create({..., imageKey})` e `Gym.restore({..., imageKey})` expõem `gym.imageKey`; ausência → `undefined`.
- `pnpm --filter backend test:run -- -t "Gym imageKey"` passa; `biome:fix` sem problemas.
