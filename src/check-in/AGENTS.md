# Módulo Check-in

Bounded context responsável pelo registro e validação de check-ins de usuários em academias, incluindo validação de distância geográfica e janela de tempo de validação.

## Estrutura

```
check-in/
├── domain/
│   ├── check-in.ts               # Entidade CheckIn
│   ├── value-object/
│   │   ├── coordinate.ts         # Coordinate (latitude/longitude)
│   │   └── distance.ts           # Distance (em km)
│   ├── service/
│   │   └── distance-calculator.ts # Cálculo de distância haversine
│   ├── specification/
│   │   ├── specification.ts       # Interface Specification<T>
│   │   └── max-distance-specification.ts # Regra: max 100m
│   ├── event/
│   │   └── check-in-created-event.ts
│   └── error/
│       ├── check-in-time-exceeded-error.ts
│       ├── invalid-distance-error.ts
│       ├── invalid-latitude-error.ts
│       └── invalid-longitude-error.ts
├── application/
│   ├── use-case/                  # CheckInUseCase, ValidateCheckInUseCase, CheckInHistoryUseCase
│   ├── repository/                # CheckInRepository (interface)
│   └── error/                     # CheckInNotFoundError, MaxDistanceError
└── infra/
    ├── controller/                # CheckInController, ValidateCheckInController, MetricsController
    └── routes/                    # CheckInRoutes
```

## Entidade CheckIn

A entidade `CheckIn` possui `create()` **síncrono** que publica `CheckInCreatedEvent` automaticamente.

```typescript
// Criar novo check-in (síncrono — publica evento imediatamente)
const checkIn = CheckIn.create({
  userId: 'user-uuid',
  gymId: 'gym-uuid',
  userLatitude: -23.5505,
  userLongitude: -46.6333,
  id: 'uuid-opcional',   // gerado automaticamente se omitido
})
// Nota: CheckInCreatedEvent é publicado dentro de create()

// Restaurar do banco (sem validação, sem evento)
const checkIn = CheckIn.restore({
  id: 'uuid',
  userId: 'user-uuid',
  gymId: 'gym-uuid',
  createdAt: new Date(),
  validatedAt: undefined,
  userLatitude: -23.5505,
  userLongitude: -46.6333,
  isValidated: false,
})

// Validar check-in (janela de tempo controlada por CHECK_IN_EXPIRATION_TIME)
const result = checkIn.validate() // Either<CheckInTimeExceededError, true>
```

### Propriedades

| Propriedade  | Tipo             | Descrição                                      |
|--------------|------------------|------------------------------------------------|
| `id`         | `string \| null` | UUID gerado automaticamente                    |
| `userId`     | `string`         | ID do usuário (ExistingId)                     |
| `gymId`      | `string`         | ID da academia (ExistingId)                    |
| `createdAt`  | `Date`           | Timestamp de criação                           |
| `validatedAt`| `Date?`          | Timestamp de validação pelo admin              |
| `latitude`   | `number`         | Latitude do usuário no momento do check-in     |
| `longitude`  | `number`         | Longitude do usuário no momento do check-in    |
| `isValidated`| `boolean`        | Se foi validado por um administrador           |

## Regras de Negócio

### Distância Máxima

O usuário deve estar a no máximo **100 metros** da academia. Implementado via `MaxDistanceSpecification`:

```typescript
export class MaxDistanceSpecification implements Specification<Distance> {
  private static readonly MAX_DISTANCE_IN_KM = 0.1  // 100 metros

  public isSatisfiedBy(distance: Distance): boolean {
    return distance.value > MaxDistanceSpecification.MAX_DISTANCE_IN_KM
  }
}
```

### Janela de Validação

O check-in só pode ser validado dentro de um período configurável (`CHECK_IN_EXPIRATION_TIME` em minutos, via variável de ambiente). Após esse prazo, retorna `CheckInTimeExceededError`.

### Unicidade Diária

Um usuário só pode fazer check-in uma vez por dia (`onSameDateOfUserId`).

## Calculadora de Distância

Fórmula esférica (haversine simplificada) implementada em `DistanceCalculator`:

```typescript
DistanceCalculator.distanceBetweenCoordinates(
  { latitude: -23.5505, longitude: -46.6333 }, // usuário
  { latitude: -23.5510, longitude: -46.6340 }, // academia
) // retorna distância em km
```

## Value Objects

### Coordinate
Latitude: -90 a 90. Longitude: -180 a 180.

```typescript
Coordinate.create({ latitude: -23.5505, longitude: -46.6333 })
// Either<InvalidLatitudeError | InvalidLongitudeError, Coordinate>
Coordinate.restore({ latitude: -23.5505, longitude: -46.6333 }) // sem validação
```

### Distance
Encapsula distância em km calculada entre dois `Coordinate`.

```typescript
Distance.create(userCoord, gymCoord) // Either<InvalidDistanceError, Distance>
distance.value // número em km
```

## Use Cases

| Use Case                   | Input                                          | Output Either (falha / sucesso)                                         |
|----------------------------|------------------------------------------------|-------------------------------------------------------------------------|
| `CheckInUseCase`           | `{ userId, gymId, userLatitude, userLongitude }` | `UserNotFoundError \| GymNotFoundError \| UserHasAlreadyCheckedInToday \| MaxDistanceError \| InvalidDistanceError` / `{ checkInId, date }` |
| `ValidateCheckInUseCase`   | `{ checkInId }`                                | `CheckInNotFoundError \| CheckInTimeExceededError` / `{ validatedAt }` |
| `CheckInHistoryUseCase`    | `{ userId, page }`                             | — / `CheckIn[]`                                                         |

### Exemplo — CheckInUseCase

```typescript
@injectable()
export class CheckInUseCase {
  constructor(
    @inject(USER_TYPES.Repositories.User) private readonly userRepository: UserRepository,
    @inject(GYM_TYPES.Repositories.Gym) private readonly gymRepository: GymRepository,
    @inject(CHECKIN_TYPES.Repositories.CheckIn) private readonly checkInRepository: CheckInRepository,
    @inject(SHARED_TYPES.UnitOfWork) private readonly unityOfWork: UnitOfWork,
    @inject(SHARED_TYPES.Queue) private readonly queue: Queue,
    @inject(SHARED_TYPES.Logger) private readonly logger: Logger,
  ) {}

  public async execute(input: CheckInUseCaseInput): Promise<CheckInUseCaseOutput> {
    // 1. Valida elegibilidade do usuário (existe e não fez check-in hoje)
    const eligibilityResult = await this.validateUserCheckInEligibility(input.userId)
    if (eligibilityResult.isFailure()) return failure(eligibilityResult.value)

    // 2. Verifica existência da academia
    const gymFound = await this.gymRepository.gymOfId(input.gymId)
    if (!gymFound) return failure(new GymNotFoundError())

    // 3. Valida distância máxima (100m)
    const distanceResult = await this.validateDistanceEligibility(input, gymFound)
    if (distanceResult.isFailure()) return failure(distanceResult.value)

    // 4. Cria e persiste check-in dentro de transação
    const checkIn = CheckIn.create(input) // publica CheckInCreatedEvent
    const checkInId = await this.unityOfWork.runTransaction(async (tx) => {
      const { id } = await this.checkInRepository.withTransaction(tx).save(checkIn)
      return id
    })

    return success({ checkInId, date: checkIn.createdAt })
  }
}
```

### Exemplo — ValidateCheckInUseCase

```typescript
public async execute(input: ValidateCheckInUseCaseInput): Promise<ValidateCheckInUseCaseResponse> {
  const checkIn = await this.checkInRepository.checkOfById(input.checkInId)
  if (!checkIn) return failure(new CheckInNotFoundError())

  const validatedOrError = checkIn.validate() // verifica janela de tempo
  if (validatedOrError.isFailure()) return failure(validatedOrError.value)

  await this.checkInRepository.save(checkIn)
  return success({ validatedAt: new Date() })
}
```

## Repository

Interface `CheckInRepository` em `application/repository/check-in-repository.ts`:

```typescript
export interface CheckInRepository {
  save(checkIn: CheckIn): Promise<SaveResponse>              // { id: string }
  checkOfById(id: string): Promise<CheckIn | null>
  onSameDateOfUserId(userId: string, date: Date): Promise<boolean>
  checkInsOfUserId(userId: string, page: number): Promise<CheckIn[]>
  countOfUserId(userId: string): Promise<number>
  withTransaction<TX extends object>(object: TX): CheckInRepository
}
```

## Rotas HTTP

Definidas em `infra/controller/routes/check-in-routes.ts`:

```typescript
export const CheckInRoutes = {
  CREATE:   '/check-ins',                    // POST  /check-ins
  METRICS:  '/check-ins/metrics/:userId',    // GET   /check-ins/metrics/:userId
  VALIDATE: '/check-ins/validate',           // PATCH /check-ins/validate
} as const
```

### Segurança das Rotas

| Rota                           | Método | Proteção                             |
|--------------------------------|--------|--------------------------------------|
| `POST /check-ins`              | POST   | `isProtected: true`                  |
| `GET /check-ins/metrics/:userId` | GET  | `isProtected: true`                  |
| `PATCH /check-ins/validate`    | PATCH  | `isProtected: true, onlyAdmin: true` |

## Eventos de Domínio

| Evento                 | Publicado por        | Quando                                  |
|------------------------|----------------------|-----------------------------------------|
| `CheckInCreatedEvent`  | `CheckIn.create()`   | No momento da criação da entidade       |

O evento é publicado **dentro** do factory method `create()`, antes mesmo da persistência. O `CheckInUseCase` subscreve ao evento após a criação para encaminhá-lo à fila.

```typescript
// Payload do CheckInCreatedEvent
{
  checkInId: string
  userId: string
  gymId: string
}
```

## Erros de Domínio / Aplicação

| Erro                           | Camada      | HTTP sugerido |
|--------------------------------|-------------|---------------|
| `InvalidLatitudeError`         | domain      | 422           |
| `InvalidLongitudeError`        | domain      | 422           |
| `InvalidDistanceError`         | domain      | 422           |
| `CheckInTimeExceededError`     | domain      | 422           |
| `CheckInNotFoundError`         | application | 404           |
| `MaxDistanceError`             | application | 422           |

Erros de domínios externos usados neste módulo:
- `UserNotFoundError` (user/application)
- `GymNotFoundError` (gym/application)
- `UserHasAlreadyCheckedInToday` (user/application)

## IoC — Service Identifiers

Definidos em `src/shared/infra/ioc/module/service-identifier/checkin-types.ts`:

```typescript
export const CHECKIN_TYPES = {
  Repositories: { CheckIn: Symbol.for('CheckInRepository') },
  UseCases: {
    CheckIn:          Symbol.for('CheckInUseCase'),
    ValidateCheckIn:  Symbol.for('ValidateCheckInUseCase'),
    CheckInHistory:   Symbol.for('CheckInHistoryUseCase'),
  },
  Controllers: {
    CheckIn:         Symbol.for('CheckInController'),
    ValidateCheckIn: Symbol.for('ValidateCheckInController'),
  },
} as const
```

## Testes

### Teste de Unidade

```typescript
import { InMemoryCheckInRepository } from '@/shared/infra/database/repository/in-memory/in-memory-check-in-repository'
import { InMemoryUserRepository } from '@/shared/infra/database/repository/in-memory/in-memory-user-repository'
import { InMemoryGymRepository } from '@/shared/infra/database/repository/in-memory/in-memory-gym-repository'
import { CheckInUseCase } from '@/check-in/application/use-case/check-in.usecase'

describe('CheckInUseCase', () => {
  let sut: CheckInUseCase
  let checkInRepository: InMemoryCheckInRepository
  let userRepository: InMemoryUserRepository
  let gymRepository: InMemoryGymRepository

  beforeEach(() => {
    container.snapshot()
    checkInRepository = new InMemoryCheckInRepository()
    userRepository = new InMemoryUserRepository()
    gymRepository = new InMemoryGymRepository()
    sut = new CheckInUseCase(userRepository, gymRepository, checkInRepository, queue, unitOfWork, logger)
  })
  afterEach(() => container.restore())

  it('deve realizar check-in com sucesso', async () => {
    const user = await createAndSaveUser({ userRepository })
    const gym = await createAndSaveGym({ gymRepository, latitude: -23.5505, longitude: -46.6333 })

    const result = await sut.execute({
      userId: user.id!,
      gymId: gym.id!,
      userLatitude: -23.5505,
      userLongitude: -46.6333,
    })

    expect(result.isSuccess()).toBe(true)
    expect(result.forceSuccess().value.checkInId).toBeDefined()
  })

  it('deve falhar se usuário estiver muito longe da academia', async () => {
    const user = await createAndSaveUser({ userRepository })
    const gym = await createAndSaveGym({ gymRepository, latitude: -23.5505, longitude: -46.6333 })

    const result = await sut.execute({
      userId: user.id!,
      gymId: gym.id!,
      userLatitude: -27.2092,  // distância > 100m
      userLongitude: -49.6401,
    })

    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(MaxDistanceError)
  })
})
```

### Helper de Teste

```typescript
import { createAndSaveCheckIn } from 'test/factory/create-and-save-check-in'

const checkIn = await createAndSaveCheckIn({ checkInRepository, userId: user.id!, gymId: gym.id! })
```
