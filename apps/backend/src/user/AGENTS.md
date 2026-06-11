# Módulo User

Bounded context responsável por gerenciar usuários da aplicação: criação, autenticação de dados, perfil, status e senha.

## Estrutura

```
user/
├── domain/
│   ├── entity/           # (user.ts na raiz de domain/)
│   ├── value-object/     # Email, Name, Password, Phone, Role, Status
│   ├── event/            # UserCreatedEvent, PasswordChangedEvent, etc.
│   ├── error/            # InvalidEmailError, InvalidNameLengthError, etc.
│   └── validator/        # user-validator.ts
├── application/
│   ├── use-case/         # CreateUser, ChangePassword, UpdateUserProfile, etc.
│   ├── persistence/
│   │   ├── repository/   # UserRepository (interface), UserQuery
│   │   └── dao/          # UserDAO (interface)
│   ├── auth/             # AuthToken (interface)
│   └── error/            # UserAlreadyExistsError, UserNotFoundError, etc.
└── infra/
    ├── controller/       # Controllers HTTP
    └── routes/           # UserRoutes
```

## Entidade User

A entidade `User` estende `Observable` e possui `create()` **async** (bcrypt via `Password.create()`).

```typescript
// Criar novo usuário (async — valida senha com bcrypt)
const result = await User.create({
  name: 'João Silva',
  email: 'joao@exemplo.com',
  password: 'senha123',
  role: 'MEMBER',           // opcional, default: 'MEMBER'
  status: StatusTypes.ACTIVATED, // opcional, default: ACTIVATED
})
if (result.isFailure()) return failure(result.value) // UserValidationErrors[]

// Restaurar do banco (sem validação, sem hash de senha)
const user = User.restore({
  id: 'uuid',
  name: 'João Silva',
  email: 'joao@exemplo.com',
  password: '$2b$10$...',   // já hashado
  role: 'MEMBER',
  status: 'activated',
  createdAt: new Date(),
})

// Mutações disponíveis
await user.changePassword('novaSenha')  // Either<ValidationError, null>
await user.updateProfile({ name: 'Novo Nome', email: 'novo@email.com' })
user.suspend()
user.activate()
user.assignBillingCustomerId('cus_stripe_id')
```

### Propriedades

| Propriedade          | Tipo               | Descrição                              |
|----------------------|--------------------|----------------------------------------|
| `id`                 | `string \| null`   | UUID gerado automaticamente            |
| `name`               | `string`           | Nome validado por `Name` VO            |
| `email`              | `string`           | E-mail validado por `Email` VO         |
| `password`           | `string`           | Hash bcrypt via `Password` VO          |
| `role`               | `RoleTypes`        | `'ADMIN'` ou `'MEMBER'`               |
| `status`             | `StatusTypes`      | `'activated'` ou `'suspended'`         |
| `createdAt`          | `Date`             |                                        |
| `billingCustomerId`  | `string?`          | ID do cliente no Stripe                |

### Status do Usuário (State Pattern)

O status implementa State Pattern via `UserStatusFactory`:

```typescript
// StatusTypes
StatusTypes.ACTIVATED  // 'activated'
StatusTypes.SUSPENDED  // 'suspended'

// Transições
user.suspend()   // activated → suspended
user.activate()  // suspended → activated

// Consulta
user.isActive    // boolean
user.isSuspend   // boolean
```

## Value Objects

### Email
Valida formato de e-mail via Zod (`z.string().email()`).

```typescript
Email.create('joao@exemplo.com') // Either<InvalidEmailError, Email>
Email.restore('joao@exemplo.com') // Email (sem validação)
```

### Name
Valida comprimento mínimo e máximo do nome.

```typescript
Name.create('João Silva') // Either<InvalidNameLengthError, Name>
Name.restore('João Silva') // Name (sem validação)
```

### Password
Aplica hash bcrypt no `create()`. Expõe `compare()` para verificação.

```typescript
await Password.create('senha123')       // Promise<Either<ValidationError, Password>>
Password.restore('$2b$10$...')          // Password (sem hash)
await password.compare('senha123')      // Promise<boolean>
```

### Role
Valores permitidos: `'ADMIN'` | `'MEMBER'` (default: `'MEMBER'`).

```typescript
Role.create('ADMIN')   // Role
Role.restore('MEMBER') // Role
```

### Phone
Opcional na entidade User, obrigatório em Gym.

```typescript
Phone.create('+5511999999999') // Either<InvalidPhoneNumberError, Phone>
Phone.restore('+5511999999999') // Phone
```

## Use Cases

| Use Case                  | Input                                      | Output Either (falha / sucesso)                    |
|---------------------------|--------------------------------------------|----------------------------------------------------|
| `CreateUserUseCase`       | `{ name, email, password, role? }`         | `UserAlreadyExistsError \| ValidationErrors[]` / `{ email }` |
| `ChangePasswordUseCase`   | `{ userId, newRawPassword }`               | `UserNotFoundError \| ValidationError \| PasswordUnchangedError` / `null` |
| `UpdateUserProfileUseCase`| `{ userId, name?, email? }`                | `UserNotFoundError \| ValidationErrors[]` / `null` |
| `DeleteUserUseCase`       | `{ userId }`                               | `UserNotFoundError` / `null`                       |
| `FetchUsersUseCase`       | `{ page }`                                 | — / `User[]`                                       |
| `UserProfileUseCase`      | `{ userId }`                               | `UserNotFoundError` / `User`                       |
| `UserMetricsUseCase`      | `{ userId }`                               | `UserNotFoundError` / `{ checkInsCount }`          |
| `SuspendUserUseCase`      | `{ userId }`                               | `UserNotFoundError` / `null`                       |
| `ActiveUserUseCase`       | `{ userId }`                               | `UserNotFoundError` / `null`                       |

### Exemplo — CreateUserUseCase

```typescript
@injectable()
export class CreateUserUseCase {
  constructor(
    @inject(USER_TYPES.Repositories.User) private readonly userRepository: UserRepository,
    @inject(SHARED_TYPES.Queue) private readonly queue: Queue,
    @inject(SHARED_TYPES.UnitOfWork) private readonly unitOfWork: UnitOfWork,
  ) {
    this.setupEventListener()
  }

  public async execute(input: CreateUserUseCaseInput): Promise<CreateUserOutput> {
    const userFound = await this.userRepository.get(UserQuery.from(input).addField('email'))
    if (userFound) return failure(new UserAlreadyExistsError())
    const userResult = await User.create(input)
    if (userResult.isFailure()) return failure(userResult.value)
    await this.userRepository.save(userResult.value)
    this.publishUserCreatedEvent(userResult.value)
    return success({ email: userResult.value.email })
  }
}
```

## Repository

Interface `UserRepository` em `application/persistence/repository/user-repository.ts`:

```typescript
export interface UserRepository {
  get(userQuery: UserQuery): Promise<User | null>
  userOfEmail(email: string): Promise<User | null>
  userOfId(id: string): Promise<User | null>
  save(user: User): Promise<void>
  update(user: User): Promise<void>
  delete(user: User): Promise<void>
  withTransaction<TX extends object>(object: TX): UserRepository
}
```

### UserQuery

Objeto de consulta que compõe filtros antes de chamar o repositório:

```typescript
const query = UserQuery.from({ email: 'joao@exemplo.com' }).addField('email')
const user = await userRepository.get(query)
```

## Rotas HTTP

Definidas em `infra/controller/routes/user-routes.ts`:

```typescript
const PREFIX = '/users'
export const UserRoutes = {
  CREATE:          PREFIX,                        // POST   /users
  FETCH:           PREFIX,                        // GET    /users
  PROFILE:         `${PREFIX}/:userId`,           // GET    /users/:userId
  ME:              `${PREFIX}/me`,                // GET    /users/me
  METRICS:         `${PREFIX}/me/metrics`,        // GET    /users/me/metrics
  CHANGE_PASSWORD: `${PREFIX}/me/change-password`,// PATCH  /users/me/change-password
  ACTIVATE_USER:   `${PREFIX}/activate`,          // PATCH  /users/activate
} as const
```

### Segurança das Rotas

| Rota                            | Método | Proteção            |
|---------------------------------|--------|---------------------|
| `POST /users`                   | POST   | Pública             |
| `GET /users`                    | GET    | `isProtected: true, onlyAdmin: true` |
| `GET /users/:userId`            | GET    | `isProtected: true` |
| `GET /users/me`                 | GET    | `isProtected: true` |
| `GET /users/me/metrics`         | GET    | `isProtected: true` |
| `PATCH /users/me/change-password`| PATCH | `isProtected: true` |
| `PATCH /users/activate`         | PATCH  | `isProtected: true, onlyAdmin: true` |

## Eventos de Domínio

| Evento                              | Publicado por           | Quando                                |
|-------------------------------------|-------------------------|---------------------------------------|
| `UserCreatedEvent`                  | `CreateUserUseCase`     | Após salvar novo usuário              |
| `PasswordChangedEvent`              | `User.changePassword()` | Após alterar senha                    |
| `UserProfileUpdatedEvent`           | `User.updateProfile()`  | Após atualizar perfil                 |
| `UserAssignedBillingCustomerIdEvent`| `User.assignBillingCustomerId()` | Após vincular cliente Stripe |

## Erros de Domínio / Aplicação

| Erro                         | Camada      | HTTP sugerido |
|------------------------------|-------------|---------------|
| `InvalidEmailError`          | domain      | 422           |
| `InvalidNameLengthError`     | domain      | 422           |
| `InvalidPhoneNumberError`    | domain      | 422           |
| `UserAlreadyExistsError`     | application | 409           |
| `UserNotFoundError`          | application | 404           |
| `InvalidCredentialsError`    | application | 401           |
| `PasswordUnchangedError`     | application | 422           |
| `InvalidUserTokenError`      | application | 401           |

## IoC — Service Identifiers

Definidos em `src/shared/infra/ioc/module/service-identifier/user-types.ts`:

```typescript
export const USER_TYPES = {
  Repositories: { User: Symbol.for('UserRepository') },
  UseCases: {
    CreateUser:          Symbol.for('CreateUserUseCase'),
    UpdateUser:          Symbol.for('UpdateUserUseCase'),
    DeleteUser:          Symbol.for('DeleteUserUseCase'),
    FetchUsers:          Symbol.for('FetchUsersUseCase'),
    UserProfile:         Symbol.for('UserProfileUseCase'),
    ChangePassword:      Symbol.for('ChangePasswordUseCase'),
    ActivateUser:        Symbol.for('ActivateUserUseCase'),
    UpdateUserProfile:   Symbol.for('UpdateUserProfileUseCase'),
    SuspendUser:         Symbol.for('SuspendUserUseCase'),
    UserMetrics:         Symbol.for('UserMetricsUseCase'),
  },
  Controllers: {
    CreateUser:          Symbol.for('UserController'),
    UserProfile:         Symbol.for('UserProfileController'),
    ChangePassword:      Symbol.for('ChangePasswordController'),
    FetchUsers:          Symbol.for('FetchUsersController'),
    UpdateUserProfile:   Symbol.for('UpdateUserProfileController'),
    ActivateUser:        Symbol.for('ActivateUserController'),
    MyProfile:           Symbol.for('MyProfileController'),
    UserMetrics:         Symbol.for('UserMetricsController'),
  },
  DAO: { User: Symbol.for('UserDAO') },
} as const
```

## Testes

### Teste de Unidade

```typescript
import { InMemoryUserRepository } from '@/shared/infra/database/repository/in-memory/in-memory-user-repository'
import { CreateUserUseCase } from '@/user/application/use-case/create-user.usecase'

describe('CreateUserUseCase', () => {
  let userRepository: InMemoryUserRepository
  let sut: CreateUserUseCase

  beforeEach(() => {
    container.snapshot()
    userRepository = new InMemoryUserRepository()
    sut = new CreateUserUseCase(userRepository, queue, logger, unitOfWork, worker)
  })
  afterEach(() => container.restore())

  it('deve criar usuário com sucesso', async () => {
    const result = await sut.execute({
      name: 'João Silva',
      email: 'joao@exemplo.com',
      password: 'senha123',
    })
    expect(result.isSuccess()).toBe(true)
    expect(result.forceSuccess().value.email).toBe('joao@exemplo.com')
  })

  it('deve falhar se e-mail já existe', async () => {
    await sut.execute({ name: 'João', email: 'joao@exemplo.com', password: 'senha123' })
    const result = await sut.execute({ name: 'Outro', email: 'joao@exemplo.com', password: 'senha456' })
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(UserAlreadyExistsError)
  })
})
```

### Helper de Teste

```typescript
import { createAndSaveUser } from 'test/factory/create-and-save-user'

// Aceita props parciais; defaults são aplicados automaticamente
const user = await createAndSaveUser({ userRepository })
const admin = await createAndSaveUser({ userRepository, role: 'ADMIN' })
```
