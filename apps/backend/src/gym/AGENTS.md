# Módulo Gym

Bounded context responsável pelo gerenciamento de academias: criação, busca por nome e busca por proximidade geográfica.

## Estrutura

```
gym/
├── domain/
│   ├── gym.ts                    # Entidade Gym
│   ├── value-object/
│   │   └── CNPJ.ts              # Value Object CNPJ com validação brasileira
│   └── error/
│       └── invalid-cnpj-error.ts
├── application/
│   ├── use-case/                 # CreateGym, SearchGym, FetchNearbyGym
│   ├── repository/               # GymRepository (interface)
│   └── error/                    # GymAlreadyExistsError, GymNotFoundError, GymWithCNPJAlreadyExistsError
└── infra/
    ├── controller/               # CreateGymController, SearchGymController
    └── routes/                   # GymRoutes
```

## Entidade Gym

A entidade `Gym` não estende `Observable` e possui `create()` **síncrono**.

```typescript
// Criar nova academia
const result = Gym.create({
  cnpj: '11.222.333/0001-81',
  title: 'Academia Exemplo',
  description: 'Descrição opcional',
  phone: '+5511999999999',  // opcional
  latitude: -23.5505,
  longitude: -46.6333,
  id: 'uuid-opcional',      // gerado automaticamente se omitido
})
if (result.isFailure()) return failure(result.value)
const gym = result.value

// Restaurar do banco (sem validação)
const gym = Gym.restore({
  id: 'uuid',
  cnpj: '11222333000181',
  title: 'Academia Exemplo',
  latitude: -23.5505,
  longitude: -46.6333,
  phone: '+5511999999999',
})
```

### Propriedades

| Propriedade   | Tipo             | Descrição                               |
|---------------|------------------|-----------------------------------------|
| `id`          | `string \| null` | UUID gerado automaticamente             |
| `title`       | `string`         | Nome validado por `Name` VO             |
| `cnpj`        | `string`         | CNPJ validado por `CNPJ` VO            |
| `description` | `string?`        | Descrição opcional                      |
| `phone`       | `string?`        | Telefone validado por `Phone` VO        |
| `latitude`    | `number`         | Latitude validada por `Coordinate` VO   |
| `longitude`   | `number`         | Longitude validada por `Coordinate` VO  |

## Value Objects

### CNPJ

Valida e formata CNPJ brasileiro com verificação dos dígitos verificadores.

```typescript
CNPJ.create('11.222.333/0001-81')  // Either<InvalidCNPJError, CNPJ>
CNPJ.create('11222333000181')       // aceita sem formatação
CNPJ.restore('11222333000181')      // CNPJ (sem validação)

// Utilitários estáticos
CNPJ.format('11222333000181')       // '11.222.333/0001-81'
CNPJ.clean('11.222.333/0001-81')    // '11222333000181'
```

### Coordinate (de `check-in/domain/value-object/coordinate.ts`)

Latitude: -90 a 90. Longitude: -180 a 180.

```typescript
Coordinate.create({ latitude: -23.5505, longitude: -46.6333 })
// Either<InvalidLatitudeError | InvalidLongitudeError, Coordinate>
```

## Use Cases

| Use Case               | Input                                              | Output Either (falha / sucesso)                         |
|------------------------|----------------------------------------------------|---------------------------------------------------------|
| `CreateGymUseCase`     | `{ cnpj, title, description?, phone?, latitude, longitude }` | `InvalidNameLengthError \| GymAlreadyExistsError` / `{ gymId }` |
| `SearchGymUseCase`     | `{ query: string, page: number }`                  | — / `Gym[]`                                             |
| `FetchNearbyGymUseCase`| `{ latitude, longitude }`                          | — / `Gym[]`                                             |

### Exemplo — CreateGymUseCase

```typescript
@injectable()
export class CreateGymUseCase {
  constructor(
    @inject(GYM_TYPES.Repositories.Gym)
    private readonly gymRepository: GymRepository,
  ) {}

  public async execute(input: CreateGymUseCaseInput): Promise<CreateGymUseCaseOutput> {
    // Garante unicidade por CNPJ
    const foundGym = await this.gymRepository.gymOfCNPJ(input.cnpj)
    if (foundGym) return failure(new GymWithCNPJAlreadyExistsError(input.cnpj))

    const gymOrError = Gym.create(input)
    if (gymOrError.isFailure()) return failure(gymOrError.value)

    const { id } = await this.gymRepository.save(gymOrError.value)
    return success({ gymId: id })
  }
}
```

## Repository

Interface `GymRepository` em `application/repository/gym-repository.ts`:

```typescript
export interface FetchGymsInput {
  title?: string
  page: number
}

export interface GymRepository {
  save(gym: Gym): Promise<SaveGymResult>          // { id: string }
  gymOfId(id: string): Promise<Gym | null>
  fetchNearbyCoord(coordinate: Coordinate): Promise<Gym[]>
  gymOfCNPJ(cnpj: string): Promise<Gym | null>
  fetchGyms(input: FetchGymsInput): Promise<Gym[]>
  withTransaction<TX extends object>(object: TX): GymRepository
}
```

## Rotas HTTP

Definidas em `infra/controller/routes/gym-routes.ts`:

```typescript
export const GymRoutes = {
  CREATE: '/gyms',               // POST   /gyms         (ADMIN)
  GET:    '/gyms/:gymId',        // GET    /gyms/:gymId
  SEARCH: '/gyms/search/:name',  // GET    /gyms/search/:name
} as const
```

### Segurança das Rotas

| Rota                    | Método | Proteção                                 |
|-------------------------|--------|------------------------------------------|
| `POST /gyms`            | POST   | `isProtected: true, onlyAdmin: true`     |
| `GET /gyms/:gymId`      | GET    | `isProtected: true`                      |
| `GET /gyms/search/:name`| GET    | `isProtected: true`                      |

## Erros de Domínio / Aplicação

| Erro                              | Camada      | HTTP sugerido |
|-----------------------------------|-------------|---------------|
| `InvalidCNPJError`                | domain      | 422           |
| `GymAlreadyExistsError`           | application | 409           |
| `GymWithCNPJAlreadyExistsError`   | application | 409           |
| `GymNotFoundError`                | application | 404           |

## IoC — Service Identifiers

Definidos em `src/shared/infra/ioc/module/service-identifier/gym-types.ts`:

```typescript
export const GYM_TYPES = {
  Repositories: { Gym: Symbol.for('GymRepository') },
  UseCases: {
    CreateGym:      Symbol.for('CreateGymUseCase'),
    SearchGym:      Symbol.for('SearchGymUseCase'),
    FetchNearbyGym: Symbol.for('FetchNearbyGymUseCase'),
  },
  Controllers: {
    CreateGym:      Symbol.for('CreateGymController'),
    SearchGym:      Symbol.for('SearchGymController'),
    FetchNearbyGym: Symbol.for('FetchNearbyGymController'),
  },
} as const
```

## Testes

### Teste de Unidade

```typescript
import { InMemoryGymRepository } from '@/shared/infra/database/repository/in-memory/in-memory-gym-repository'
import { CreateGymUseCase } from '@/gym/application/use-case/create-gym.usecase'

describe('CreateGymUseCase', () => {
  let gymRepository: InMemoryGymRepository
  let sut: CreateGymUseCase

  beforeEach(() => {
    container.snapshot()
    gymRepository = new InMemoryGymRepository()
    sut = new CreateGymUseCase(gymRepository)
  })
  afterEach(() => container.restore())

  it('deve criar academia com sucesso', async () => {
    const result = await sut.execute({
      cnpj: '11.222.333/0001-81',
      title: 'Academia Exemplo',
      latitude: -23.5505,
      longitude: -46.6333,
    })
    expect(result.isSuccess()).toBe(true)
    expect(result.forceSuccess().value.gymId).toBeDefined()
  })

  it('deve falhar se CNPJ já existe', async () => {
    const input = { cnpj: '11.222.333/0001-81', title: 'Academia', latitude: -23.5505, longitude: -46.6333 }
    await sut.execute(input)
    const result = await sut.execute({ ...input, title: 'Outra Academia' })
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(GymWithCNPJAlreadyExistsError)
  })
})
```

### Helper de Teste

```typescript
import { createAndSaveGym } from 'test/factory/create-and-save-gym'

// Aceita props parciais; defaults são aplicados automaticamente
const gym = await createAndSaveGym({ gymRepository })
const gymProximo = await createAndSaveGym({
  gymRepository,
  latitude: -23.5505,
  longitude: -46.6333,
})
```
