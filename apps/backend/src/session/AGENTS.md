# Módulo Session

Bounded context responsável por autenticação de sessões: login com JWT, logout com revogação de token e refresh de token.

## Estrutura

```
session/
├── application/
│   ├── use-case/
│   │   ├── authenticate.usecase.ts   # Login — gera token + refreshToken
│   │   └── logout.usecase.ts         # Logout — revoga token por JWI
│   ├── dao/
│   │   └── revoked-token-dao.ts      # Interface DAO para tokens revogados
│   └── error/
│       └── token-already-revoked-error.ts
└── infra/
    ├── controller/
    │   ├── authenticate.controller.ts
    │   ├── logout.controller.ts
    │   └── refresh-token.controller.ts
    └── routes/
        └── session-routes.ts
```

> Este módulo não possui camada `domain/` própria. Utiliza `User` do módulo `user/` e a interface `AuthToken` de `user/application/auth/`.

## Fluxo de Autenticação

### 1. Login (`POST /sessions`)

Valida credenciais do usuário e retorna par `token` + `refreshToken` (ambos JWT assinados com chave privada RS256).

```
POST /sessions
{ email, password }
→ 200: { token, refreshToken }
→ 401: { message: 'Invalid credentials' }
```

Cada token carrega um **JWI** (JSON Web ID) — identificador único da sessão gerado com `randomBytes(16)`. O JWI é armazenado no payload tanto do token quanto do refreshToken, permitindo invalidação seletiva no logout.

### 2. Refresh (`POST /sessions/refresh`)

Gera novo par de tokens usando o `refreshToken` válido.

### 3. Logout (`DELETE /sessions/logout`)

Revoga o JWI da sessão atual no DAO de tokens revogados (Redis em produção, in-memory em testes). Após revogação, qualquer requisição com esse token é bloqueada pelo pre-handler `check-session-revoked.ts`.

## Payload do Token JWT

```typescript
{
  sub: {
    id: string      // userId
    email: string
    role: RoleTypes // 'ADMIN' | 'MEMBER'
    jwi: string     // identificador único da sessão
  }
}
```

## Use Cases

| Use Case              | Input                        | Output Either (falha / sucesso)                   |
|-----------------------|------------------------------|---------------------------------------------------|
| `AuthenticateUseCase` | `{ email, password }`        | `InvalidCredentialsError` / `{ token, refreshToken }` |
| `LogoutUseCase`       | `{ jwi, userId }`            | `TokenAlreadyRevokedError` / `RevokedTokenData`   |

### Exemplo — AuthenticateUseCase

```typescript
@injectable()
export class AuthenticateUseCase {
  constructor(
    @inject(USER_TYPES.Repositories.User) private readonly userRepository: UserRepository,
    @inject(SHARED_TYPES.Tokens.Auth) private readonly authToken: AuthToken,
  ) {}

  public async execute(input: AuthenticateUseCaseInput): Promise<AuthenticateUseCaseOutput> {
    const user = await this.userRepository.userOfEmail(input.email)
    if (!user) return failure(new InvalidCredentialsError())

    // Verifica senha via bcrypt
    if (!(await user.checkPassword(input.password))) {
      return failure(new InvalidCredentialsError())
    }

    // JWI = identificador único da sessão
    const jwi = randomBytes(16).toString('hex')

    return success({
      token: this.authToken.sign({ sub: { id: user.id!, email: user.email, role: user.role, jwi } }, env.PRIVATE_KEY),
      refreshToken: this.authToken.refreshToken({ sub: { id: user.id!, email: user.email, role: user.role, jwi } }, env.PRIVATE_KEY),
    })
  }
}
```

### Exemplo — LogoutUseCase

```typescript
@injectable()
export class LogoutUseCase {
  constructor(
    @inject(AUTH_TYPES.DAO.RevokedToken) private readonly revokedTokenDAO: RevokedTokenDAO,
  ) {}

  public async execute(input: LogoutUseCaseInput): Promise<LogoutUseCaseOutput> {
    const isRevoked = await this.revokedTokenDAO.revokedTokenById(input.jwi)
    if (isRevoked) return failure(new TokenAlreadyRevokedError())

    const record: RevokedTokenData = {
      jwi: input.jwi,
      userId: input.userId,
      revokedAt: new Date().toISOString(),
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    }
    await this.revokedTokenDAO.revoke(record)
    return success(record)
  }
}
```

## DAO — RevokedTokenDAO

Interface em `application/dao/revoked-token-dao.ts`:

```typescript
export interface RevokedTokenData {
  jwi: string
  userId: string
  revokedAt: string      // ISO 8601
  expiresIn: string      // ex: '7d'
}

export interface RevokedTokenDAO {
  revoke(data: RevokedTokenData): Promise<void>
  revokedTokenById(jwi: string): Promise<boolean>
}
```

### Implementações

| Ambiente     | Implementação                            |
|--------------|------------------------------------------|
| Produção     | `RedisRevokedTokenDAO` (Redis)           |
| Testes       | `InMemoryRevokedTokenDAO`                |

## Rotas HTTP

Definidas em `infra/controller/routes/session-routes.ts`:

```typescript
const PREFIX = '/sessions'
export const SessionRoutes = {
  AUTHENTICATE: PREFIX,                   // POST   /sessions
  REFRESH:      `${PREFIX}/refresh`,      // POST   /sessions/refresh
  LOGOUT:       `${PREFIX}/logout`,       // DELETE /sessions/logout
} as const
```

### Segurança das Rotas

| Rota                    | Método | Proteção                       |
|-------------------------|--------|--------------------------------|
| `POST /sessions`        | POST   | Pública                        |
| `POST /sessions/refresh`| POST   | Requer refreshToken no cookie  |
| `DELETE /sessions/logout`| DELETE| `isProtected: true`            |

## Pre-handlers de Segurança

Implementados em `shared/infra/server/services/`:

- **`authenticate-pre-handler.ts`**: verifica e decodifica JWT em rotas com `isProtected: true`
- **`check-session-revoked.ts`**: consulta o `RevokedTokenDAO` usando o JWI do token; rejeita com 401 se revogado
- **`admin-role-check.ts`**: verifica `role === 'ADMIN'` em rotas com `onlyAdmin: true`

## Erros de Aplicação

| Erro                       | HTTP sugerido | Descrição                          |
|----------------------------|---------------|------------------------------------|
| `InvalidCredentialsError`  | 401           | E-mail ou senha incorretos         |
| `TokenAlreadyRevokedError` | 401           | JWI já foi revogado (logout duplo) |

## IoC — Service Identifiers

Definidos em `src/shared/infra/ioc/module/service-identifier/auth-types.ts`:

```typescript
export const AUTH_TYPES = {
  UseCases: {
    Authenticate: Symbol.for('AuthenticateUseCase'),
    Logout:       Symbol.for('LogoutUseCase'),
    RefreshToken: Symbol.for('RefreshTokenUseCase'),
  },
  Controllers: {
    Authenticate: Symbol.for('AuthenticateController'),
    Logout:       Symbol.for('LogoutController'),
    RefreshToken: Symbol.for('RefreshTokenController'),
  },
  DAO: {
    RevokedToken: Symbol.for('RevokedTokenDAO'),
  },
} as const
```

## Variáveis de Ambiente Relevantes

| Variável                | Descrição                                      |
|-------------------------|------------------------------------------------|
| `PRIVATE_KEY`           | Chave privada RS256 para assinar tokens        |
| `PUBLIC_KEY`            | Chave pública RS256 para verificar tokens      |
| `JWT_EXPIRES_IN`        | Expiração do token de acesso (ex: `'15m'`)     |
| `JWT_REFRESH_EXPIRES_IN`| Expiração do refresh token (ex: `'7d'`)        |

## Testes

### Teste de Unidade

```typescript
import { InMemoryUserRepository } from '@/shared/infra/database/repository/in-memory/in-memory-user-repository'
import { AuthenticateUseCase } from '@/session/application/use-case/authenticate.usecase'

describe('AuthenticateUseCase', () => {
  let sut: AuthenticateUseCase
  let userRepository: InMemoryUserRepository

  beforeEach(async () => {
    container.snapshot()
    userRepository = new InMemoryUserRepository()
    sut = new AuthenticateUseCase(userRepository, authToken)
    // Cria usuário para testar autenticação
    await createAndSaveUser({ userRepository, email: 'joao@exemplo.com', password: 'senha123' })
  })
  afterEach(() => container.restore())

  it('deve autenticar com credenciais válidas', async () => {
    const result = await sut.execute({ email: 'joao@exemplo.com', password: 'senha123' })
    expect(result.isSuccess()).toBe(true)
    expect(result.forceSuccess().value.token).toBeDefined()
    expect(result.forceSuccess().value.refreshToken).toBeDefined()
  })

  it('deve falhar com senha incorreta', async () => {
    const result = await sut.execute({ email: 'joao@exemplo.com', password: 'errada' })
    expect(result.isFailure()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidCredentialsError)
  })
})
```

### Business Flow

```typescript
describe('POST /sessions', () => {
  it('deve retornar token ao autenticar', async () => {
    await createAndSaveUser({ userRepository, email: 'joao@exemplo.com', password: 'senha123' })

    const response = await request(fastifyServer.server)
      .post(SessionRoutes.AUTHENTICATE)
      .send({ email: 'joao@exemplo.com', password: 'senha123' })

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(response.body.token).toBeDefined()
  })
})
```
