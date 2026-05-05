# Plano de Implementação de Gym Location Picker

> **Para trabalhadores agênticos:** SUB-SKILL OBRIGATÓRIA: Use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa a tarefa. Os passos usam sintaxe de checkbox (`- [ ]`) para rastreamento.

**Objetivo:** Substituir os inputs manuais de lat/lng do formulário de cadastro de academia por um seletor interativo com mapa Leaflet, geocodificação direta e reversa via Nominatim, e persistência do endereço completo no banco de dados.

**Arquitetura:** `GymLocationPicker` é um componente auto-contido que integra com react-hook-form via `Controller`. A lógica de geocodificação fica em `useGymLocationPicker`. No backend, o campo `address` é adicionado como `String?` (nullable) no Prisma e propagado pela cadeia domain → usecase → controller.

**Stack Tecnológica:** React 19, Next.js 16, react-leaflet 4, Leaflet, Nominatim API (gratuito), Zod 4, react-hook-form, Vitest + Testing Library, Prisma, Fastify.

---

## Spec de referência

`docs/superpowers/specs/2026-05-05-gym-location-picker-design.md`

---

## Estrutura de Arquivos

### Novos arquivos
- `apps/frontend/src/features/gyms/components/leaflet-map.tsx` — sub-componente Leaflet isolado para `dynamic(..., { ssr: false })`
- `apps/frontend/src/features/gyms/components/gym-location-picker.tsx` — componente principal
- `apps/frontend/src/features/gyms/hooks/use-gym-location-picker.ts` — lógica de geocoding e estado do mapa
- `apps/frontend/src/features/gyms/hooks/use-gym-location-picker.test.ts` — testes do hook
- `apps/frontend/src/features/gyms/components/gym-location-picker.test.tsx` — testes do componente

### Arquivos modificados
| Arquivo | O que muda |
|---|---|
| `apps/backend/prisma/schema.prisma` | `address String?` no model `Gym` |
| `apps/backend/src/gym/domain/gym.ts` | `address` em props e getter |
| `apps/backend/src/gym/domain/gym.test.ts` | Testes com `address` |
| `apps/backend/test/factory/create-and-save-gym.ts` | Parâmetro `address?: string` com default |
| `apps/backend/src/gym/application/use-case/create-gym.usecase.ts` | `address` em `CreateGymUseCaseInput` |
| `apps/backend/src/gym/application/use-case/create-gym.usecase.test.ts` | Testes com `address` |
| `apps/backend/src/gym/application/use-case/fetch-all-gyms.usecase.ts` | `address` em `FetchAllGymsUseCaseOutput` e `toDTO()` |
| `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts` | `address` em `save()` |
| `apps/backend/src/shared/infra/database/repository/prisma/prisma-gym-repository.ts` | `address` em `GymCreateProps`, `save()`, `createGym()` |
| `apps/backend/src/gym/infra/controller/create-gym.controller.ts` | `address: z.string()` no schema Zod + swagger |
| `apps/backend/src/gym/infra/controller/create-gym.business-flow-test.ts` | `address` no payload |
| `apps/backend/src/gym/infra/controller/fetch-all-gyms.controller.ts` | `address` no swagger schema de resposta |
| `apps/frontend/src/features/gyms/schemas/create-gym-schema.ts` | Campo `location` aninhado com `.refine()` |
| `apps/frontend/src/features/gyms/schemas/create-gym-schema.test.ts` | Testes do novo schema |
| `apps/frontend/src/features/gyms/api/extended-paths.ts` | `address?: string` em `GymSummary` |
| `apps/frontend/src/features/gyms/api/index.ts` | `address` em `buildCreateGymBody` |
| `apps/frontend/src/app/(authenticated)/admin/academias/nova/page.tsx` | `GymLocationPicker` via `Controller` |
| `apps/frontend/src/app/(authenticated)/admin/academias/nova/page.test.tsx` | Testes atualizados |

---

## Tarefa 1: Prisma — adicionar coluna `address`

**Arquivos:**
- Modificar: `apps/backend/prisma/schema.prisma`

- [ ] **Passo 1: Adicionar campo `address` no schema**

Abra `apps/backend/prisma/schema.prisma`. Localize o model `Gym` e adicione `address String?` após `phone`:

```prisma
model Gym {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  cnpj        String    @unique
  title       String
  description String?
  phone       String?
  address     String?
  latitude    Decimal
  longitude   Decimal
  created_at  DateTime  @default(now())
  updated_at  DateTime  @updatedAt
  checkIns    CheckIn[]

  @@map("gyms")
}
```

- [ ] **Passo 2: Garantir que o Docker está rodando e criar a migration**

```bash
pnpm --filter backend docker:up
# aguarde 3-5 segundos
pnpm --filter backend prisma:migrate:dev
```

Quando solicitado o nome da migration, informe: `add_address_to_gyms`

Esperado: Migration criada e aplicada com sucesso.

- [ ] **Passo 3: Commit**

```bash
git add apps/backend/prisma/schema.prisma apps/backend/prisma/migrations/
git commit -m "feat(backend): add address column to gyms table

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Tarefa 2: Gym entity — adicionar `address`

**Arquivos:**
- Modificar: `apps/backend/src/gym/domain/gym.ts`
- Modificar: `apps/backend/src/gym/domain/gym.test.ts`

- [ ] **Passo 1: Escreva os testes com falha**

Abra `apps/backend/src/gym/domain/gym.test.ts` e atualize-o para incluir `address`:

```typescript
import { Gym, type GymCreateProps, type GymRestoreProps } from "./gym"

describe("Gym Entity", () => {
  test("Deve criar uma academia", () => {
    const input: GymCreateProps = {
      title: "fake gym",
      description: "fake description",
      latitude: -23.55052,
      longitude: -46.633308,
      phone: "11971457899",
      cnpj: "11.222.333/0001-81",
      address: "Rua das Flores, 123, São Paulo - SP",
    }
    const gym = Gym.create(input).forceSuccess().value
    expect(gym.title).toBe(input.title)
    expect(gym.description).toBe(input.description)
    expect(gym.latitude).toBe(input.latitude)
    expect(gym.longitude).toBe(input.longitude)
    expect(gym.phone).toBe(input.phone)
    expect(gym.address).toBe(input.address)
  })

  test("Deve restaurar uma academia com address", () => {
    const input: GymRestoreProps = {
      title: "fake gym",
      description: "fake description",
      latitude: -23.55052,
      longitude: -46.633308,
      phone: "11971457899",
      id: "fake_id",
      cnpj: "11.222.333/0001-81",
      address: "Rua das Flores, 123, São Paulo - SP",
    }
    const gym = Gym.restore(input)
    expect(gym.address).toBe(input.address)
  })

  test("Deve restaurar uma academia sem address (dados legados)", () => {
    const input: GymRestoreProps = {
      title: "fake gym",
      description: "fake description",
      latitude: -23.55052,
      longitude: -46.633308,
      phone: "11971457899",
      id: "fake_id",
      cnpj: "11.222.333/0001-81",
    }
    const gym = Gym.restore(input)
    expect(gym.address).toBeUndefined()
  })
})
```

- [ ] **Passo 2: Execute para verificar que falha**

```bash
pnpm --filter backend test:run -- --reporter=verbose -t "Gym Entity"
```

Esperado: FALHA — `gym.address` não existe na entidade.

- [ ] **Passo 3: Implemente a entidade**

Abra `apps/backend/src/gym/domain/gym.ts`. O arquivo completo atualizado:

```typescript
import type { InvalidLatitudeError } from "@/check-in/domain/error/invalid-latitude-error"
import type { InvalidLongitudeError } from "@/check-in/domain/error/invalid-longitude-error"
import { Coordinate } from "@/check-in/domain/value-object/coordinate"
import {
  type Either,
  failure,
  success,
} from "@/shared/domain/value-object/either"
import { Id } from "@/shared/domain/value-object/id"
import type { InvalidNameLengthError } from "@/user/domain/error/invalid-name-length-error"
import { Name } from "@/user/domain/value-object/name"
import { Phone } from "@/user/domain/value-object/phone"

import type { InvalidCNPJError } from "./error/invalid-cnpj-error"
import { CNPJ } from "./value-object/CNPJ"

interface GymConstructor {
  id: Id
  cnpj: CNPJ
  title: Name
  description?: string
  phone: Phone
  coordinate: Coordinate
  address?: string
}

export type GymCreateProps = Omit<
  GymConstructor,
  "id" | "coordinate" | "title" | "phone" | "cnpj"
> & {
  id?: string
  phone?: string
  title: string
  latitude: number
  longitude: number
  cnpj: string
  address: string
}

export type GymRestoreProps = Omit<
  GymConstructor,
  "id" | "coordinate" | "title" | "phone" | "cnpj"
> & {
  id: string
  phone?: string
  title: string
  latitude: number
  longitude: number
  cnpj: string
  address?: string
}

export class Gym {
  private readonly _id: Id
  private readonly _title: Name
  private readonly _description?: string
  private readonly _phone?: Phone
  private readonly _coordinate: Coordinate
  private readonly _cnpj: CNPJ
  private readonly _address?: string

  private constructor(gymProps: GymConstructor) {
    this._id = gymProps.id
    this._title = gymProps.title
    this._description = gymProps.description
    this._phone = gymProps.phone
    this._coordinate = gymProps.coordinate
    this._cnpj = gymProps.cnpj
    this._address = gymProps.address
  }

  public static create(
    gymProps: GymCreateProps,
  ): Either<
    | InvalidNameLengthError
    | InvalidLatitudeError
    | InvalidLongitudeError
    | InvalidCNPJError,
    Gym
  > {
    const id = Id.create(gymProps.id)
    const nameOrError = Name.create(gymProps.title)
    if (nameOrError.isFailure()) return failure(nameOrError.value)
    const coordinateOrError = Coordinate.create({
      latitude: gymProps.latitude,
      longitude: gymProps.longitude,
    })
    if (coordinateOrError.isFailure()) return failure(coordinateOrError.value)
    const phoneOrError = Phone.create(gymProps.phone)
    if (phoneOrError.isFailure()) return failure(phoneOrError.value)
    const cnpjOrError = CNPJ.create(gymProps.cnpj)
    if (cnpjOrError.isFailure()) return failure(cnpjOrError.value)
    const gym = new Gym({
      ...gymProps,
      id,
      coordinate: coordinateOrError.value,
      title: nameOrError.value,
      phone: phoneOrError.value,
      cnpj: cnpjOrError.value,
    })
    return success(gym)
  }

  public static restore(gymProps: GymRestoreProps): Gym {
    const id = Id.restore(gymProps.id)
    const title = Name.restore(gymProps.title)
    const phone = Phone.restore(gymProps.phone)
    const coordinate = Coordinate.restore({
      latitude: gymProps.latitude,
      longitude: gymProps.longitude,
    })
    const cnpj = CNPJ.restore(gymProps.cnpj)
    return new Gym({ ...gymProps, id, coordinate, title, phone, cnpj })
  }

  get id(): string {
    return this._id.value
  }

  get title(): string {
    return this._title.value
  }

  get description(): string | undefined {
    return this._description
  }

  get phone(): string | undefined {
    return this._phone?.value
  }

  get latitude(): number {
    return this._coordinate.latitude
  }

  get longitude(): number {
    return this._coordinate.longitude
  }

  get cnpj(): string {
    return this._cnpj.value
  }

  get address(): string | undefined {
    return this._address
  }
}
```

- [ ] **Passo 4: Execute os testes**

```bash
pnpm --filter backend test:run -- --reporter=verbose -t "Gym Entity"
```

Esperado: 3 testes PASSANDO.

- [ ] **Passo 5: Commit**

```bash
git add apps/backend/src/gym/domain/gym.ts apps/backend/src/gym/domain/gym.test.ts
git commit -m "feat(backend): add address field to Gym entity

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Tarefa 3: Atualizar factory `createAndSaveGym`

**Arquivos:**
- Modificar: `apps/backend/test/factory/create-and-save-gym.ts`

- [ ] **Passo 1: Adicionar `address` com default à factory**

```typescript
import { Gym } from "@/gym/domain/gym"
import type { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"

export interface CreateAndSaveGym {
  gymRepository: InMemoryGymRepository
  id?: string
  latitude?: number
  longitude?: number
  title?: string
  description?: string
  phone?: string
  address?: string
}

export async function createAndSaveGym(props: CreateAndSaveGym) {
  const gymId = props.id ?? "any_gym_id"
  const gym = Gym.create({
    id: gymId,
    title: "any_name",
    latitude: props.latitude ?? 0,
    longitude: props.longitude ?? 0,
    cnpj: "11.222.333/0001-81",
    address: props.address ?? "Rua Padrão, 1, São Paulo - SP",
    ...props,
  }).forceSuccess().value
  await props.gymRepository.save(gym)
  return props.gymRepository.gyms.toArray()[0]
}
```

- [ ] **Passo 2: Execute todos os testes do backend para verificar que nenhum quebrou**

```bash
pnpm --filter backend test:run
```

Esperado: Todos os testes passando (a factory cobre quem usa `createAndSaveGym` indiretamente). Os testes de `CreateGymUseCase` e `create-gym.business-flow-test.ts` vão falhar neste momento pois ainda precisam de `address` — isso é esperado; será corrigido nas Tarefas 4 e 6.

- [ ] **Passo 3: Commit**

```bash
git add apps/backend/test/factory/create-and-save-gym.ts
git commit -m "test(backend): add default address to createAndSaveGym factory

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Tarefa 4: CreateGymUseCase — adicionar `address`

**Arquivos:**
- Modificar: `apps/backend/src/gym/application/use-case/create-gym.usecase.ts`
- Modificar: `apps/backend/src/gym/application/use-case/create-gym.usecase.test.ts`

- [ ] **Passo 1: Atualize os testes — adicione `address` em todos os inputs**

Abra `apps/backend/src/gym/application/use-case/create-gym.usecase.test.ts`. Adicione `address: "Rua das Flores, 123, São Paulo - SP"` em cada objeto `CreateGymUseCaseInput` no arquivo (há 7 objetos de input). O arquivo completo atualizado:

```typescript
import { InvalidLatitudeError } from "@/check-in/domain/error/invalid-latitude-error"
import { InvalidLongitudeError } from "@/check-in/domain/error/invalid-longitude-error"
import type { Gym } from "@/gym/domain/gym"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { container } from "@/shared/infra/ioc/container"
import { GYM_TYPES } from "@/shared/infra/ioc/types"

import { GymWithCNPJAlreadyExistsError } from "../error/gym-with-cnpj-already-exists-error"
import type {
  CreateGymUseCase,
  CreateGymUseCaseInput,
} from "./create-gym.usecase"

const BASE_INPUT: CreateGymUseCaseInput = {
  title: "fake gym",
  description: "fake description",
  latitude: -23.55052,
  longitude: -46.633308,
  phone: "11971457899",
  cnpj: "11.222.333/0001-81",
  address: "Rua das Flores, 123, São Paulo - SP",
}

describe("CreateGymUseCase", () => {
  let sut: CreateGymUseCase
  let gymRepository: InMemoryGymRepository

  beforeEach(() => {
    container.snapshot()
    container
      .rebind(GYM_TYPES.Repositories.Gym)
      .to(InMemoryGymRepository)
      .inSingletonScope()
    sut = container.get(GYM_TYPES.UseCases.CreateGym)
    gymRepository = container.get(GYM_TYPES.Repositories.Gym)
  })

  afterEach(() => {
    container.restore()
  })

  test("Deve criar uma Academia", async () => {
    const result = await sut.execute(BASE_INPUT)
    const gymId = result.forceSuccess().value.gymId
    expect(gymId).toEqual(expect.any(String))
    const gym = (await gymRepository.gymOfId(gymId)) as NonNullable<Gym>
    expect(gym.id).toEqual(expect.any(String))
    expect(gym.title).toBe(BASE_INPUT.title)
    expect(gym.description).toBe(BASE_INPUT.description)
    expect(gym.latitude).toBe(BASE_INPUT.latitude)
    expect(gym.longitude).toBe(BASE_INPUT.longitude)
    expect(gym.cnpj).toBe(BASE_INPUT.cnpj)
    expect(gym.phone).toBe(BASE_INPUT.phone)
    expect(gym.address).toBe(BASE_INPUT.address)
  })

  test("Deve falhar ao criar uma Academia sem título", async () => {
    const result = await sut.execute({ ...BASE_INPUT, title: "" })
    expect(result.isFailure()).toBe(true)
  })

  test("Deve falhar ao criar uma Academia com latitude inválida", async () => {
    const result = await sut.execute({ ...BASE_INPUT, latitude: 999 })
    expect(result.isFailure()).toBe(true)
  })

  test("Deve falhar ao criar uma Academia com longitude inválida", async () => {
    const result = await sut.execute({ ...BASE_INPUT, longitude: 999 })
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidLongitudeError)
  })

  test("Deve falhar ao tentar criar uma Academia com latitude inválida", async () => {
    const result = await sut.execute({ ...BASE_INPUT, latitude: 999, longitude: -23.55052 })
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidLatitudeError)
  })

  test("Deve falhar ao tentar criar uma Academia com telefone inválido", async () => {
    const result = await sut.execute({ ...BASE_INPUT, phone: "invalid-phone" })
    expect(result.isFailure()).toBe(true)
  })

  test("Deve falhar ao tentar criar uma Academia com CNPJ existente", async () => {
    await sut.execute(BASE_INPUT)
    const result = await sut.execute(BASE_INPUT)
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(GymWithCNPJAlreadyExistsError)
  })
})
```

- [ ] **Passo 2: Execute para verificar que falha**

```bash
pnpm --filter backend test:run -- --reporter=verbose -t "CreateGymUseCase"
```

Esperado: FALHA — `CreateGymUseCaseInput` não tem `address`.

- [ ] **Passo 3: Adicione `address` ao UseCase**

Abra `apps/backend/src/gym/application/use-case/create-gym.usecase.ts`. Atualize `CreateGymUseCaseInput`:

```typescript
export interface CreateGymUseCaseInput {
  cnpj: string
  title: string
  description?: string
  phone?: string
  latitude: number
  longitude: number
  address: string
}
```

O método `execute` já passa `input` diretamente para `Gym.create(input)`, então `address` será propagado automaticamente.

- [ ] **Passo 4: Execute os testes**

```bash
pnpm --filter backend test:run -- --reporter=verbose -t "CreateGymUseCase"
```

Esperado: Todos os testes PASSANDO.

- [ ] **Passo 5: Commit**

```bash
git add apps/backend/src/gym/application/use-case/create-gym.usecase.ts \
        apps/backend/src/gym/application/use-case/create-gym.usecase.test.ts
git commit -m "feat(backend): add address to CreateGymUseCase input

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Tarefa 5: Repositórios — mapear `address`

**Arquivos:**
- Modificar: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts`
- Modificar: `apps/backend/src/shared/infra/database/repository/prisma/prisma-gym-repository.ts`

- [ ] **Passo 1: Atualizar `InMemoryGymRepository.save()`**

Abra `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts`. Atualize o método `save()` para incluir `address`:

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
  })
  this.gyms.add(gymWithId)
  return { id: gym.id }
}
```

- [ ] **Passo 2: Atualizar `PrismaGymRepository`**

Abra `apps/backend/src/shared/infra/database/repository/prisma/prisma-gym-repository.ts`.

1. Atualize a interface `GymCreateProps`:
```typescript
export interface GymCreateProps {
  id: string
  title: string
  description: string | null
  phone?: string | null
  address?: string | null
  latitude: Decimal
  longitude: Decimal
  cnpj: string
}
```

2. Atualize `save()`:
```typescript
public async save(gym: Gym): Promise<SaveGymResult> {
  const result = await this.prismaClient.gym.create({
    data: {
      id: gym.id,
      title: gym.title,
      description: gym.description,
      phone: gym.phone ? gym.phone.toString() : undefined,
      address: gym.address,
      latitude: gym.latitude,
      longitude: gym.longitude,
      cnpj: gym.cnpj,
    },
    select: { id: true },
  })
  return { id: result.id }
}
```

3. Atualize `createGym()`:
```typescript
private createGym(props: GymCreateProps): Gym {
  return Gym.restore({
    id: props.id,
    title: props.title,
    description: props.description ?? undefined,
    phone: props.phone ? props.phone : undefined,
    latitude: props.latitude.toNumber(),
    longitude: props.longitude.toNumber(),
    cnpj: props.cnpj,
    address: props.address ?? undefined,
  })
}
```

- [ ] **Passo 3: Execute os testes**

```bash
pnpm --filter backend test:run
```

Esperado: Todos os testes do backend passando.

- [ ] **Passo 4: Commit**

```bash
git add apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts \
        apps/backend/src/shared/infra/database/repository/prisma/prisma-gym-repository.ts
git commit -m "feat(backend): map address field in gym repositories

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Tarefa 6: CreateGymController — adicionar `address`

**Arquivos:**
- Modificar: `apps/backend/src/gym/infra/controller/create-gym.controller.ts`
- Modificar: `apps/backend/src/gym/infra/controller/create-gym.business-flow-test.ts`

- [ ] **Passo 1: Atualize o business-flow-test**

Abra `apps/backend/src/gym/infra/controller/create-gym.business-flow-test.ts`. Adicione `address` ao `input`:

```typescript
const input: CreateGymPayload = {
  cnpj: "11.222.333/0001-81",
  title: "Academia Teste",
  description: "Academia de teste",
  phone: "123456789",
  latitude: 0,
  longitude: 0,
  address: "Rua das Flores, 123, São Paulo - SP",
}
```

- [ ] **Passo 2: Execute para verificar que falha**

```bash
pnpm --filter backend test:business-flow -- --reporter=verbose -t "Cadastrar Academia"
```

Esperado: FALHA — `address` não existe no schema Zod do controller.

- [ ] **Passo 3: Atualize o Zod schema do controller**

Abra `apps/backend/src/gym/infra/controller/create-gym.controller.ts`. Adicione `address` ao schema:

```typescript
const createGymSchema = z.object({
  cnpj: z.string().meta({ description: "Gym CNPJ", example: "12345678000100" }),
  title: z.string().meta({ description: "Gym name", example: "Iron Gym" }),
  address: z.string().meta({ description: "Full gym address", example: "Rua das Flores, 123, São Paulo - SP" }),
  description: z
    .string()
    .optional()
    .meta({ description: "Gym description", example: "A great gym" }),
  phone: z
    .string()
    .optional()
    .meta({ description: "Gym phone number", example: "11999999999" }),
  latitude: z.number().meta({ description: "Gym latitude", example: -23.5505 }),
  longitude: z
    .number()
    .meta({ description: "Gym longitude", example: -46.6333 }),
})
```

Atualize também o swagger de response 201 para incluir `address` na descrição:

No `makeCreateGymSwaggerSchema()`, na `description`, adicione: `"Create a new gym with address and location coordinates. Requires ADMIN role"`

- [ ] **Passo 4: Execute os testes**

```bash
pnpm --filter backend test:business-flow -- --reporter=verbose -t "Cadastrar Academia"
```

Esperado: PASSANDO.

- [ ] **Passo 5: Commit**

```bash
git add apps/backend/src/gym/infra/controller/create-gym.controller.ts \
        apps/backend/src/gym/infra/controller/create-gym.business-flow-test.ts
git commit -m "feat(backend): add address field to CreateGymController

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Tarefa 7: FetchAllGymsUseCase + Controller — expor `address`

**Arquivos:**
- Modificar: `apps/backend/src/gym/application/use-case/fetch-all-gyms.usecase.ts`
- Modificar: `apps/backend/src/gym/infra/controller/fetch-all-gyms.controller.ts`

- [ ] **Passo 1: Atualizar `FetchAllGymsUseCaseOutput` e `toDTO`**

Abra `apps/backend/src/gym/application/use-case/fetch-all-gyms.usecase.ts`. Adicione `address` ao output e ao mapeamento:

```typescript
export interface FetchAllGymsUseCaseOutput {
  id: string
  title: string
  description: string | null
  phone: string | null
  address: string | null
  latitude: number
  longitude: number
}

// ...

private toDTO(gyms: Gym[]): FetchAllGymsUseCaseOutput[] {
  return gyms.map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description ?? null,
    phone: g.phone ?? null,
    address: g.address ?? null,
    latitude: g.latitude,
    longitude: g.longitude,
  }))
}
```

- [ ] **Passo 2: Atualizar o swagger de resposta no controller**

Abra `apps/backend/src/gym/infra/controller/fetch-all-gyms.controller.ts`. No `makeFetchAllGymsSwaggerSchema()`, adicione `address` ao schema da resposta 200:

```typescript
address: z
  .string()
  .nullable()
  .meta({ description: "Full gym address" }),
```

Adicione após o campo `phone` existente.

- [ ] **Passo 3: Execute os testes**

```bash
pnpm --filter backend test:run && pnpm --filter backend test:business-flow
```

Esperado: Todos os testes passando.

- [ ] **Passo 4: Commit**

```bash
git add apps/backend/src/gym/application/use-case/fetch-all-gyms.usecase.ts \
        apps/backend/src/gym/infra/controller/fetch-all-gyms.controller.ts
git commit -m "feat(backend): expose address in FetchAllGyms response

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Tarefa 8: Instalar dependências do frontend

**Arquivos:** `apps/frontend/package.json`

- [ ] **Passo 1: Instalar react-leaflet, leaflet e tipos**

```bash
pnpm --filter frontend add react-leaflet leaflet
pnpm --filter frontend add -D @types/leaflet
```

- [ ] **Passo 2: Verificar instalação**

```bash
cat apps/frontend/package.json | grep -E "leaflet|react-leaflet"
```

Esperado: Entradas de `react-leaflet`, `leaflet` em dependencies e `@types/leaflet` em devDependencies.

- [ ] **Passo 3: Commit**

```bash
git add apps/frontend/package.json pnpm-lock.yaml
git commit -m "feat(frontend): install react-leaflet and leaflet

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Tarefa 9: `useGymLocationPicker` hook

**Arquivos:**
- Criar: `apps/frontend/src/features/gyms/hooks/use-gym-location-picker.ts`
- Criar: `apps/frontend/src/features/gyms/hooks/use-gym-location-picker.test.ts`

- [ ] **Passo 1: Escreva os testes com falha**

Crie `apps/frontend/src/features/gyms/hooks/use-gym-location-picker.test.ts`:

```typescript
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useGymLocationPicker } from "./use-gym-location-picker"

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"

describe("useGymLocationPicker", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe("handleSearch", () => {
    it("atualiza latitude e longitude ao encontrar endereço", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ lat: "-23.5505", lon: "-46.6333", display_name: "Av. Paulista, São Paulo" }],
      } as Response)

      const { result } = renderHook(() => useGymLocationPicker())

      act(() => {
        result.current.handleAddressChange("Av. Paulista, São Paulo")
      })

      await act(async () => {
        await result.current.handleSearch()
      })

      expect(result.current.latitude).toBe(-23.5505)
      expect(result.current.longitude).toBe(-46.6333)
      expect(result.current.searchError).toBeNull()
      expect(result.current.isSearching).toBe(false)
    })

    it("define searchError quando endereço não é encontrado", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response)

      const { result } = renderHook(() => useGymLocationPicker())
      act(() => { result.current.handleAddressChange("endereço inexistente xpto") })

      await act(async () => {
        await result.current.handleSearch()
      })

      expect(result.current.searchError).toBe("Endereço não encontrado. Tente ser mais específico.")
      expect(result.current.latitude).toBeNull()
    })

    it("define searchError em caso de falha de rede", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"))

      const { result } = renderHook(() => useGymLocationPicker())
      act(() => { result.current.handleAddressChange("Av. Paulista") })

      await act(async () => {
        await result.current.handleSearch()
      })

      expect(result.current.searchError).toBe("Erro ao buscar endereço. Verifique sua conexão.")
    })

    it("não faz requisição quando address está vazio", async () => {
      const { result } = renderHook(() => useGymLocationPicker())

      await act(async () => {
        await result.current.handleSearch()
      })

      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe("handleMapClick", () => {
    it("atualiza latitude e longitude ao clicar no mapa", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ display_name: "Av. Paulista, 1578, São Paulo" }),
      } as Response)

      const { result } = renderHook(() => useGymLocationPicker())

      await act(async () => {
        await result.current.handleMapClick(-23.5505, -46.6333)
      })

      expect(result.current.latitude).toBe(-23.5505)
      expect(result.current.longitude).toBe(-46.6333)
    })

    it("atualiza address com geocodificação reversa bem-sucedida", async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ display_name: "Av. Paulista, 1578, São Paulo" }),
      } as Response)

      const { result } = renderHook(() => useGymLocationPicker())

      await act(async () => {
        await result.current.handleMapClick(-23.5505, -46.6333)
      })

      expect(result.current.address).toBe("Av. Paulista, 1578, São Paulo")
    })

    it("mantém address anterior quando geocodificação reversa falha", async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error("Network error"))

      const { result } = renderHook(() => useGymLocationPicker({
        initialAddress: "Endereço anterior",
        initialLatitude: 0,
        initialLongitude: 0,
      }))

      await act(async () => {
        await result.current.handleMapClick(-23.5505, -46.6333)
      })

      expect(result.current.latitude).toBe(-23.5505)
      expect(result.current.longitude).toBe(-46.6333)
      expect(result.current.address).toBe("Endereço anterior")
    })
  })
})
```

- [ ] **Passo 2: Execute para verificar que falha**

```bash
pnpm --filter frontend test -- --reporter=verbose use-gym-location-picker
```

Esperado: FALHA — módulo não existe.

- [ ] **Passo 3: Implemente o hook**

Crie `apps/frontend/src/features/gyms/hooks/use-gym-location-picker.ts`:

```typescript
import { useState } from "react"

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org"

interface UseGymLocationPickerOptions {
  initialAddress?: string
  initialLatitude?: number | null
  initialLongitude?: number | null
}

export interface UseGymLocationPickerReturn {
  address: string
  latitude: number | null
  longitude: number | null
  isSearching: boolean
  isReverseGeocoding: boolean
  searchError: string | null
  handleAddressChange: (value: string) => void
  handleSearch: () => Promise<void>
  handleMapClick: (lat: number, lng: number) => Promise<void>
}

export function useGymLocationPicker(
  options: UseGymLocationPickerOptions = {},
): UseGymLocationPickerReturn {
  const [address, setAddress] = useState(options.initialAddress ?? "")
  const [latitude, setLatitude] = useState<number | null>(options.initialLatitude ?? null)
  const [longitude, setLongitude] = useState<number | null>(options.initialLongitude ?? null)
  const [isSearching, setIsSearching] = useState(false)
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  function handleAddressChange(value: string) {
    setAddress(value)
    setSearchError(null)
  }

  async function handleSearch(): Promise<void> {
    const trimmed = address.trim()
    if (!trimmed) return

    setIsSearching(true)
    setSearchError(null)

    try {
      const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(trimmed)}&format=json&limit=1`
      const response = await fetch(url, {
        headers: { "Accept-Language": "pt-BR,pt;q=0.9" },
      })
      const data = await response.json()

      if (!Array.isArray(data) || data.length === 0) {
        setSearchError("Endereço não encontrado. Tente ser mais específico.")
        return
      }

      setLatitude(parseFloat(data[0].lat))
      setLongitude(parseFloat(data[0].lon))
    } catch {
      setSearchError("Erro ao buscar endereço. Verifique sua conexão.")
    } finally {
      setIsSearching(false)
    }
  }

  async function handleMapClick(lat: number, lng: number): Promise<void> {
    setLatitude(lat)
    setLongitude(lng)

    setIsReverseGeocoding(true)
    try {
      const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json`
      const response = await fetch(url, {
        headers: { "Accept-Language": "pt-BR,pt;q=0.9" },
      })
      const data = await response.json()
      if (data?.display_name) {
        setAddress(data.display_name)
      }
    } catch {
      // falha silenciosa — coordenadas já foram atualizadas
    } finally {
      setIsReverseGeocoding(false)
    }
  }

  return {
    address,
    latitude,
    longitude,
    isSearching,
    isReverseGeocoding,
    searchError,
    handleAddressChange,
    handleSearch,
    handleMapClick,
  }
}
```

- [ ] **Passo 4: Execute os testes**

```bash
pnpm --filter frontend test -- --reporter=verbose use-gym-location-picker
```

Esperado: Todos os testes PASSANDO.

- [ ] **Passo 5: Commit**

```bash
git add apps/frontend/src/features/gyms/hooks/
git commit -m "feat(frontend): add useGymLocationPicker hook with forward and reverse geocoding

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Tarefa 10: `LeafletMap` sub-componente

**Arquivos:**
- Criar: `apps/frontend/src/features/gyms/components/leaflet-map.tsx`

Nota: Este componente é carregado via `dynamic(..., { ssr: false })` no `GymLocationPicker`. Não tem arquivo de teste próprio — é testado via mock no teste do `GymLocationPicker`.

- [ ] **Passo 1: Crie o componente**

Crie `apps/frontend/src/features/gyms/components/leaflet-map.tsx`:

```typescript
"use client"

import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { useEffect, useRef } from "react"
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet"

// Corrige ícone padrão do Leaflet (problema com bundlers modernos)
delete (L.Icon.Default.prototype as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
})

interface MapClickHandlerProps {
  onMapClick: (lat: number, lng: number) => void
}

function MapClickHandler({ onMapClick }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

interface LeafletMapProps {
  latitude: number | null
  longitude: number | null
  onMapClick: (lat: number, lng: number) => void
}

const DEFAULT_CENTER: [number, number] = [-14.235, -51.9253] // centro do Brasil
const DEFAULT_ZOOM = 4
const MARKER_ZOOM = 15

export default function LeafletMap({
  latitude,
  longitude,
  onMapClick,
}: LeafletMapProps) {
  const hasPosition = latitude !== null && longitude !== null
  const center: [number, number] = hasPosition
    ? [latitude, longitude]
    : DEFAULT_CENTER
  const zoom = hasPosition ? MARKER_ZOOM : DEFAULT_ZOOM

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "300px", width: "100%", borderRadius: "8px" }}
      key={`${latitude}-${longitude}`}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onMapClick={onMapClick} />
      {hasPosition && <Marker position={[latitude, longitude]} />}
    </MapContainer>
  )
}
```

- [ ] **Passo 2: Verifique se o TypeScript compila**

```bash
pnpm --filter frontend tsc:check
```

Esperado: Sem erros de tipo.

- [ ] **Passo 3: Commit**

```bash
git add apps/frontend/src/features/gyms/components/leaflet-map.tsx
git commit -m "feat(frontend): add LeafletMap sub-component for dynamic import

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Tarefa 11: `GymLocationPicker` componente

**Arquivos:**
- Criar: `apps/frontend/src/features/gyms/components/gym-location-picker.tsx`
- Criar: `apps/frontend/src/features/gyms/components/gym-location-picker.test.tsx`

- [ ] **Passo 1: Escreva os testes com falha**

Crie `apps/frontend/src/features/gyms/components/gym-location-picker.test.tsx`:

```typescript
import { act, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { renderWithProviders } from "@/test/render"
import { GymLocationPicker } from "./gym-location-picker"

vi.mock("./leaflet-map", () => ({
  default: ({
    onMapClick,
  }: {
    latitude: number | null
    longitude: number | null
    onMapClick: (lat: number, lng: number) => void
  }) => (
    <div data-testid="mock-map">
      <button
        type="button"
        data-testid="simulate-map-click"
        onClick={() => onMapClick(-10.123, -45.678)}
      >
        Simular clique no mapa
      </button>
    </div>
  ),
}))

const NOMINATIM_RESULT = [
  { lat: "-23.5505", lon: "-46.6333", display_name: "Av. Paulista, São Paulo" },
]

const NOMINATIM_REVERSE = { display_name: "Rua Revertida, 1, São Paulo" }

describe("GymLocationPicker", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("renderiza input de endereço, botão buscar e mapa", () => {
    const onChange = vi.fn()
    renderWithProviders(
      <GymLocationPicker
        value={{ address: "", latitude: 0, longitude: 0 }}
        onChange={onChange}
      />,
    )
    expect(screen.getByTestId("gym-location-address")).toBeInTheDocument()
    expect(screen.getByTestId("gym-location-search")).toBeInTheDocument()
    expect(screen.getByTestId("mock-map")).toBeInTheDocument()
  })

  it("chama onChange com lat/lng após busca bem-sucedida", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => NOMINATIM_RESULT,
    } as Response))

    const onChange = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(
      <GymLocationPicker
        value={{ address: "", latitude: 0, longitude: 0 }}
        onChange={onChange}
      />,
    )

    await user.type(screen.getByTestId("gym-location-address"), "Av. Paulista")
    await user.click(screen.getByTestId("gym-location-search"))

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: -23.5505, longitude: -46.6333 }),
      )
    })
  })

  it("exibe mensagem de erro quando endereço não encontrado", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response))

    const user = userEvent.setup()
    renderWithProviders(
      <GymLocationPicker
        value={{ address: "", latitude: 0, longitude: 0 }}
        onChange={vi.fn()}
      />,
    )

    await user.type(screen.getByTestId("gym-location-address"), "xyz inexistente")
    await user.click(screen.getByTestId("gym-location-search"))

    expect(
      await screen.findByText(/endereço não encontrado/i),
    ).toBeInTheDocument()
  })

  it("chama onChange com novas coords e address revertido ao clicar no mapa", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => NOMINATIM_REVERSE,
    } as Response))

    const onChange = vi.fn()
    renderWithProviders(
      <GymLocationPicker
        value={{ address: "Endereço antigo", latitude: 0, longitude: 0 }}
        onChange={onChange}
      />,
    )

    await act(async () => {
      await userEvent.click(screen.getByTestId("simulate-map-click"))
    })

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: -10.123,
          longitude: -45.678,
          address: "Rua Revertida, 1, São Paulo",
        }),
      )
    })
  })

  it("exibe mensagem de erro de formulário vinda da prop `error`", () => {
    renderWithProviders(
      <GymLocationPicker
        value={{ address: "", latitude: 0, longitude: 0 }}
        onChange={vi.fn()}
        error="Campo obrigatório"
      />,
    )
    expect(screen.getByText("Campo obrigatório")).toBeInTheDocument()
  })

  it("exibe campos read-only de latitude e longitude", () => {
    renderWithProviders(
      <GymLocationPicker
        value={{ address: "", latitude: -23.5505, longitude: -46.6333 }}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByTestId("gym-location-lat-display")).toHaveTextContent("-23.5505")
    expect(screen.getByTestId("gym-location-lng-display")).toHaveTextContent("-46.6333")
  })
})
```

- [ ] **Passo 2: Execute para verificar que falha**

```bash
pnpm --filter frontend test -- --reporter=verbose gym-location-picker
```

Esperado: FALHA — módulo não existe.

- [ ] **Passo 3: Implemente o componente**

Crie `apps/frontend/src/features/gyms/components/gym-location-picker.tsx`:

```typescript
"use client"

import dynamic from "next/dynamic"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { useGymLocationPicker } from "@/features/gyms/hooks/use-gym-location-picker"

const LeafletMap = dynamic(() => import("./leaflet-map"), { ssr: false })

export interface GymLocationValue {
  address: string
  latitude: number
  longitude: number
}

interface GymLocationPickerProps {
  value: GymLocationValue
  onChange: (value: GymLocationValue) => void
  error?: string
}

export function GymLocationPicker({
  value,
  onChange,
  error,
}: GymLocationPickerProps) {
  const {
    address,
    latitude,
    longitude,
    isSearching,
    isReverseGeocoding,
    searchError,
    handleAddressChange,
    handleSearch,
    handleMapClick,
  } = useGymLocationPicker({
    initialAddress: value.address,
    initialLatitude: value.latitude || null,
    initialLongitude: value.longitude || null,
  })

  useEffect(() => {
    onChange({
      address,
      latitude: latitude ?? 0,
      longitude: longitude ?? 0,
    })
  }, [address, latitude, longitude, onChange])

  async function onSearchClick() {
    await handleSearch()
  }

  async function onMapClick(lat: number, lng: number) {
    await handleMapClick(lat, lng)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          Endereço completo <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            data-testid="gym-location-address"
            type="text"
            value={address}
            onChange={(e) => handleAddressChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                void onSearchClick()
              }
            }}
            placeholder="Ex.: Av. Paulista, 1578, São Paulo - SP"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            type="button"
            data-testid="gym-location-search"
            variant="outline"
            disabled={isSearching}
            onClick={() => void onSearchClick()}
          >
            {isSearching ? "Buscando..." : "Buscar"}
          </Button>
        </div>
        {searchError && (
          <p className="text-sm text-destructive">{searchError}</p>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-input">
        <LeafletMap
          latitude={latitude}
          longitude={longitude}
          onMapClick={(lat, lng) => void onMapClick(lat, lng)}
        />
        {isReverseGeocoding && (
          <p className="px-3 py-1 text-xs text-muted-foreground">
            Obtendo endereço...
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Latitude <span className="rounded bg-muted px-1 text-xs">auto</span>
          </span>
          <div
            data-testid="gym-location-lat-display"
            className="rounded-md border border-dashed border-input bg-muted/30 px-3 py-2 font-mono text-sm text-muted-foreground"
          >
            {latitude?.toFixed(4) ?? "—"}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Longitude <span className="rounded bg-muted px-1 text-xs">auto</span>
          </span>
          <div
            data-testid="gym-location-lng-display"
            className="rounded-md border border-dashed border-input bg-muted/30 px-3 py-2 font-mono text-sm text-muted-foreground"
          >
            {longitude?.toFixed(4) ?? "—"}
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
```

- [ ] **Passo 4: Execute os testes**

```bash
pnpm --filter frontend test -- --reporter=verbose gym-location-picker
```

Esperado: Todos os testes PASSANDO.

- [ ] **Passo 5: Commit**

```bash
git add apps/frontend/src/features/gyms/components/gym-location-picker.tsx \
        apps/frontend/src/features/gyms/components/gym-location-picker.test.tsx
git commit -m "feat(frontend): add GymLocationPicker component

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Tarefa 12: Atualizar `create-gym-schema.ts`

**Arquivos:**
- Modificar: `apps/frontend/src/features/gyms/schemas/create-gym-schema.ts`
- Modificar: `apps/frontend/src/features/gyms/schemas/create-gym-schema.test.ts`

- [ ] **Passo 1: Atualize os testes**

Substitua o conteúdo de `apps/frontend/src/features/gyms/schemas/create-gym-schema.test.ts`:

```typescript
import { describe, expect, it } from "vitest"
import { createGymSchema } from "./create-gym-schema"

const validInput = {
  title: "Iron Gym",
  cnpj: "12345678000100",
  description: "A great gym",
  phone: "11999999999",
  location: {
    address: "Av. Paulista, 1578, São Paulo - SP",
    latitude: -23.5505,
    longitude: -46.6333,
  },
}

describe("createGymSchema", () => {
  it("aceita payload válido completo", () => {
    const result = createGymSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it("rejeita nome vazio", () => {
    const result = createGymSchema.safeParse({ ...validInput, title: "" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "title")).toBe(true)
    }
  })

  it("rejeita telefone com formato inválido (letras)", () => {
    const result = createGymSchema.safeParse({ ...validInput, phone: "11abc999" })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "phone")).toBe(true)
    }
  })

  it("rejeita CNPJ com tamanho diferente de 14 dígitos", () => {
    const result = createGymSchema.safeParse({ ...validInput, cnpj: "12345" })
    expect(result.success).toBe(false)
  })

  it("rejeita address vazio em location", () => {
    const result = createGymSchema.safeParse({
      ...validInput,
      location: { ...validInput.location, address: "" },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("address")),
      ).toBe(true)
    }
  })

  it("rejeita latitude fora do intervalo [-90, 90]", () => {
    const result = createGymSchema.safeParse({
      ...validInput,
      location: { ...validInput.location, latitude: 91 },
    })
    expect(result.success).toBe(false)
  })

  it("rejeita location com lat=0 e lng=0 (busca nunca realizada)", () => {
    const result = createGymSchema.safeParse({
      ...validInput,
      location: { address: "Algum endereço", latitude: 0, longitude: 0 },
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some((i) =>
          i.message.includes("Busque o endereço"),
        ),
      ).toBe(true)
    }
  })

  it("aceita description e phone opcionais (string vazia)", () => {
    const result = createGymSchema.safeParse({
      ...validInput,
      description: "",
      phone: "",
    })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Passo 2: Execute para verificar que falha**

```bash
pnpm --filter frontend test -- --reporter=verbose create-gym-schema
```

Esperado: FALHA — schema não tem campo `location`.

- [ ] **Passo 3: Atualize o schema**

Substitua o conteúdo de `apps/frontend/src/features/gyms/schemas/create-gym-schema.ts`:

```typescript
import { z } from "zod"

const CNPJ_DIGITS = 14
const PHONE_MIN = 10
const PHONE_MAX = 11
const TITLE_MIN = 2
const TITLE_MAX = 120
const DESCRIPTION_MAX = 500
const ADDRESS_MIN = 5
const LAT_MIN = -90
const LAT_MAX = 90
const LNG_MIN = -180
const LNG_MAX = 180

const numericOnly = /^\d+$/u

const gymLocationSchema = z
  .object({
    address: z
      .string()
      .trim()
      .min(ADDRESS_MIN, "Informe o endereço completo."),
    latitude: z
      .number({ error: "Informe a latitude." })
      .min(LAT_MIN, `Latitude deve ser >= ${LAT_MIN}.`)
      .max(LAT_MAX, `Latitude deve ser <= ${LAT_MAX}.`),
    longitude: z
      .number({ error: "Informe a longitude." })
      .min(LNG_MIN, `Longitude deve ser >= ${LNG_MIN}.`)
      .max(LNG_MAX, `Longitude deve ser <= ${LNG_MAX}.`),
  })
  .refine((val) => !(val.latitude === 0 && val.longitude === 0), {
    message: "Busque o endereço no mapa antes de cadastrar.",
    path: ["latitude"],
  })

export const createGymSchema = z.object({
  title: z
    .string()
    .trim()
    .min(TITLE_MIN, "Informe o nome (mínimo 2 caracteres).")
    .max(TITLE_MAX, "Nome muito longo."),
  cnpj: z
    .string()
    .trim()
    .regex(numericOnly, "CNPJ deve conter apenas dígitos.")
    .length(CNPJ_DIGITS, `CNPJ deve ter ${CNPJ_DIGITS} dígitos.`),
  description: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX, "Descrição muito longa.")
    .optional()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(numericOnly, "Telefone deve conter apenas dígitos.")
    .min(PHONE_MIN, `Telefone deve ter ao menos ${PHONE_MIN} dígitos.`)
    .max(PHONE_MAX, `Telefone deve ter no máximo ${PHONE_MAX} dígitos.`)
    .optional()
    .or(z.literal("")),
  location: gymLocationSchema,
})

export type CreateGymInput = z.infer<typeof createGymSchema>
```

- [ ] **Passo 4: Execute os testes**

```bash
pnpm --filter frontend test -- --reporter=verbose create-gym-schema
```

Esperado: Todos os testes PASSANDO.

- [ ] **Passo 5: Commit**

```bash
git add apps/frontend/src/features/gyms/schemas/create-gym-schema.ts \
        apps/frontend/src/features/gyms/schemas/create-gym-schema.test.ts
git commit -m "feat(frontend): update create-gym-schema with nested location field

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Tarefa 13: Atualizar API frontend (`extended-paths` e `api/index.ts`)

**Arquivos:**
- Modificar: `apps/frontend/src/features/gyms/api/extended-paths.ts`
- Modificar: `apps/frontend/src/features/gyms/api/index.ts`

- [ ] **Passo 1: Adicionar `address` em `GymSummary`**

Abra `apps/frontend/src/features/gyms/api/extended-paths.ts`. Adicione `address` à interface `GymSummary`:

```typescript
export interface GymSummary {
  id: string
  title: string
  description: string | null
  phone: string | null
  address: string | null
  latitude: number
  longitude: number
}
```

- [ ] **Passo 2: Atualizar `buildCreateGymBody` em `api/index.ts`**

Abra `apps/frontend/src/features/gyms/api/index.ts`. Atualize `buildCreateGymBody`:

```typescript
function buildCreateGymBody(input: CreateGymInput) {
  return {
    title: input.title,
    cnpj: input.cnpj,
    address: input.location.address,
    latitude: input.location.latitude,
    longitude: input.location.longitude,
    ...(input.description ? { description: input.description } : {}),
    ...(input.phone ? { phone: input.phone } : {}),
  }
}
```

- [ ] **Passo 3: Execute lint e tsc**

```bash
pnpm --filter frontend biome:fix
pnpm --filter frontend tsc:check
```

Esperado: Sem erros.

- [ ] **Passo 4: Commit**

```bash
git add apps/frontend/src/features/gyms/api/extended-paths.ts \
        apps/frontend/src/features/gyms/api/index.ts
git commit -m "feat(frontend): add address to GymSummary and API body builder

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Tarefa 14: Atualizar `nova/page.tsx`

**Arquivos:**
- Modificar: `apps/frontend/src/app/(authenticated)/admin/academias/nova/page.tsx`
- Modificar: `apps/frontend/src/app/(authenticated)/admin/academias/nova/page.test.tsx`

- [ ] **Passo 1: Atualize os testes da página**

Substitua o conteúdo de `apps/frontend/src/app/(authenticated)/admin/academias/nova/page.test.tsx`:

```typescript
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

const replace = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

// Mock do componente de mapa para evitar problemas com Leaflet em jsdom
vi.mock("@/features/gyms/components/leaflet-map", () => ({
  default: ({
    onMapClick,
  }: {
    latitude: number | null
    longitude: number | null
    onMapClick: (lat: number, lng: number) => void
  }) => (
    <div data-testid="mock-map">
      <button
        type="button"
        data-testid="simulate-map-click"
        onClick={() => onMapClick(-23.5505, -46.6333)}
      >
        Simular clique
      </button>
    </div>
  ),
}))

import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import AdminNovaAcademiaPage from "./page"

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333"

// Nominatim retorna lat/lng para o endereço buscado
const NOMINATIM_SEARCH_RESULT = [
  { lat: "-23.5505", lon: "-46.6333", display_name: "Av. Paulista, 1578, São Paulo" },
]

describe("AdminNovaAcademiaPage", () => {
  it("envia formulário válido com endereço e coordenadas e redireciona", async () => {
    let received: Record<string, unknown> | null = null

    // MSW intercepta tanto o Nominatim quanto a API backend
    server.use(
      http.get("https://nominatim.openstreetmap.org/search", () => {
        return HttpResponse.json(NOMINATIM_SEARCH_RESULT)
      }),
      http.post(`${apiBaseUrl}/gyms`, async ({ request }) => {
        received = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          { message: "Gym created", id: "new-gym-77" },
          { status: 201 },
        )
      }),
    )

    const user = userEvent.setup()
    renderWithProviders(<AdminNovaAcademiaPage />)

    await user.type(screen.getByTestId("gym-form-title"), "Iron Gym")
    await user.type(screen.getByTestId("gym-form-cnpj"), "12345678000100")
    await user.type(screen.getByTestId("gym-form-description"), "Top gym")
    await user.type(screen.getByTestId("gym-form-phone"), "11999999999")

    // Busca o endereço no mapa (address = o que o usuário digitou)
    await user.type(screen.getByTestId("gym-location-address"), "Av. Paulista, 1578")
    await user.click(screen.getByTestId("gym-location-search"))

    // Aguarda geocodificação completar (lat/lng ficam visíveis)
    await waitFor(() => {
      expect(screen.getByTestId("gym-location-lat-display")).toHaveTextContent("-23.5505")
    })

    await user.click(screen.getByTestId("gym-form-submit"))

    await waitFor(() => {
      expect(received).toMatchObject({
        title: "Iron Gym",
        cnpj: "12345678000100",
        description: "Top gym",
        phone: "11999999999",
        // address = o que o usuário digitou (handleSearch não altera o campo address)
        address: "Av. Paulista, 1578",
        latitude: -23.5505,
        longitude: -46.6333,
      })
    })
    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/academias/new-gym-77")
    })
  })

  it("bloqueia submissão quando dados são inválidos", async () => {
    const user = userEvent.setup()
    renderWithProviders(<AdminNovaAcademiaPage />)

    await user.click(screen.getByTestId("gym-form-submit"))

    expect(await screen.findByText(/informe o nome/i)).toBeInTheDocument()
  })
})
```

- [ ] **Passo 2: Execute para verificar que falha**

```bash
pnpm --filter frontend test -- --reporter=verbose "nova/page"
```

Esperado: FALHA — página ainda usa os inputs de lat/lng antigos.

- [ ] **Passo 3: Atualize a página**

Substitua o conteúdo de `apps/frontend/src/app/(authenticated)/admin/academias/nova/page.tsx`:

```typescript
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useId } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { GymLocationPicker } from "@/features/gyms/components/gym-location-picker"
import { useCreateGym } from "@/features/gyms/api"
import {
  type CreateGymInput,
  createGymSchema,
} from "@/features/gyms/schemas/create-gym-schema"
import { ApiError } from "@/lib/errors"

function createGymErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return "Já existe uma academia com este CNPJ."
    return error.userMessage
  }
  return "Não foi possível cadastrar a academia. Tente novamente."
}

export default function AdminNovaAcademiaPage() {
  const router = useRouter()
  const titleId = useId()
  const cnpjId = useId()
  const descriptionId = useId()
  const phoneId = useId()

  const { mutateAsync, isPending } = useCreateGym()
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateGymInput>({
    resolver: zodResolver(createGymSchema),
    defaultValues: {
      title: "",
      cnpj: "",
      description: "",
      phone: "",
      location: {
        address: "",
        latitude: 0,
        longitude: 0,
      },
    },
  })

  async function onSubmit(values: CreateGymInput) {
    try {
      const { id } = await mutateAsync(values)
      toast.success("Academia cadastrada com sucesso.")
      router.replace(`/academias/${id}`)
    } catch (submitError) {
      toast.error(createGymErrorMessage(submitError))
    }
  }

  return (
    <section
      aria-labelledby="nova-academia-title"
      className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6"
    >
      <header className="flex flex-col gap-2">
        <h1
          id="nova-academia-title"
          className="font-display text-3xl font-medium text-pure-black"
        >
          Cadastrar academia
        </h1>
        <p className="text-sm text-mid-gray">
          Disponível apenas para administradores.
        </p>
      </header>

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
        aria-label="Formulário de cadastro de academia"
      >
        <FormField
          id={titleId}
          label="Nome"
          data-testid="gym-form-title"
          error={errors.title?.message}
          {...register("title")}
        />
        <FormField
          id={cnpjId}
          label="CNPJ (apenas dígitos)"
          inputMode="numeric"
          data-testid="gym-form-cnpj"
          error={errors.cnpj?.message}
          {...register("cnpj")}
        />

        <Controller
          control={control}
          name="location"
          render={({ field, fieldState }) => (
            <GymLocationPicker
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message ?? errors.location?.latitude?.message}
            />
          )}
        />

        <FormField
          id={descriptionId}
          label="Descrição (opcional)"
          data-testid="gym-form-description"
          error={errors.description?.message}
          {...register("description")}
        />
        <FormField
          id={phoneId}
          label="Telefone (opcional, apenas dígitos)"
          inputMode="numeric"
          data-testid="gym-form-phone"
          error={errors.phone?.message}
          {...register("phone")}
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            data-testid="gym-form-submit"
            disabled={isPending}
          >
            {isPending ? "Cadastrando..." : "Cadastrar academia"}
          </Button>
        </div>
      </form>
    </section>
  )
}
```

- [ ] **Passo 4: Execute os testes**

```bash
pnpm --filter frontend test -- --reporter=verbose "nova/page"
```

Esperado: Todos os testes PASSANDO.

- [ ] **Passo 5: Commit**

```bash
git add apps/frontend/src/app/(authenticated)/admin/academias/nova/page.tsx \
        apps/frontend/src/app/(authenticated)/admin/academias/nova/page.test.tsx
git commit -m "feat(frontend): replace lat/lng inputs with GymLocationPicker

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Tarefa 15: Validação final

- [ ] **Passo 1: Execute o gate de qualidade completo do backend**

```bash
pnpm --filter backend biome:fix
pnpm --filter backend tsc:check
pnpm --filter backend test:run
pnpm --filter backend build
```

Esperado: Tudo passando com zero erros.

- [ ] **Passo 2: Execute o gate de qualidade completo do frontend**

```bash
pnpm --filter frontend biome:fix
pnpm --filter frontend tsc:check
pnpm --filter frontend test:run
pnpm --filter frontend build
```

Esperado: Tudo passando com zero erros.

- [ ] **Passo 3: Commit final**

```bash
git add -A
git commit -m "feat: gym location picker with map, geocoding and address persistence

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
