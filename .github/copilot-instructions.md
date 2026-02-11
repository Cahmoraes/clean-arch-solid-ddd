# Instruções do Copilot para o Projeto API Solid

## Restrições de Comunicação
- Responder em português PT-BR preservando termos técnicos
- Nunca utilizar emojis
- Indentação de 2 espaços, linha em branco ao final de arquivos

## Build, Test & Lint

### Comandos Essenciais
```bash
npm run dev                        # Desenvolvimento com hot-reload
npm run build                      # Build para produção
npm run tsc:check                  # Verificar tipos TypeScript
```

### Testing
```bash
npm run test                       # Testes de unidade (*.test.ts)
npm run test:cov                   # Testes com cobertura
npm run test:business-flow         # Testes HTTP de integração (*.business-flow-test.ts)
npm run test:e2e:prisma            # Testes de integração Prisma
npm run test:fitness               # Fitness function tests
```

### Validação de Arquitetura & Qualidade
```bash
npm run fit:validate-dependencies  # Validar regras de dependência (dependency-cruiser)
npm run dependency:metrics         # Gerar visualização de dependências (SVG)
npm run biome:fix                  # Formatar código com Biome
npm run eslint:fix                 # Corrigir problemas ESLint
```

### Banco de Dados
```bash
npm run prisma:migrate:dev         # Executar migrations (dev)
npm run prisma:generate            # Gerar cliente Prisma
npm run prisma:studio              # UI para gerenciar banco (http://localhost:5555)
npm run prisma:reset               # Resetar banco (force drop + migrate)
docker compose up -d                # Iniciar PostgreSQL + Redis + RabbitMQ
```

## Arquitetura (Clean Architecture + DDD)
Estrutura por bounded context em `src/{domain}/`:
```
domain/          # Entidades, Value Objects, Domain Events, Erros de negócio
application/     # Use Cases, interfaces de Repository, Erros de aplicação
infra/           # Controllers, implementações concretas de Repository, Providers
```

**Domínios**: `user/`, `gym/`, `check-in/`, `session/`, `subscription/`, `shared/`

### Regras de Dependência (enforced por dependency-cruiser)
- **Domain**: não importa Application nem Infra (código puro do negócio)
- **Application**: importa Domain, não importa Infra (orquestração de lógica)
- **Infra**: importa Application e Domain (implementações técnicas)
- **Shared**: disponível para todas as camadas (utilitários genéricos)

## Padrão Either para Tratamento de Erros
Use Cases retornam `Either<Error, Success>` de `@/shared/domain/value-object/either`. Sem exceções para lógica de negócio:
```typescript
// Retornar erro
return failure(new UserAlreadyExistsError())

// Retornar sucesso
return success({ email: user.email })

// Verificar resultado no controller
if (result.isFailure()) return this.createResponseError(result)
const { value } = result.forceSuccess()
```

Exceções apenas para falhas técnicas (conexão BD, etc).

## Inversify IoC - Padrão de Registro
Três passos para adicionar novo serviço:

**1. Service Identifiers** em `src/shared/infra/ioc/module/service-identifier/{domain}-types.ts`:
```typescript
export const USER_TYPES = {
  Repositories: { User: Symbol.for('UserRepository') },
  UseCases: { CreateUser: Symbol.for('CreateUserUseCase') },
  Controllers: { CreateUser: Symbol.for('UserController') },
}
```

**2. Container Module** em `src/shared/infra/ioc/module/{domain}/{domain}-container.ts`:
```typescript
export const userContainer = new ContainerModule(({ bind }) => {
  bind(USER_TYPES.Repositories.User).toDynamicValue(UserRepositoryProvider.provide)
  bind(USER_TYPES.UseCases.CreateUser).to(CreateUserUseCase)
  bind(USER_TYPES.Controllers.CreateUser).to(CreateUserController)
})
```

**3. Bootstrap** em `src/bootstrap/setup-{domain}-module.ts`:
```typescript
export function setupUserModule(): ModuleControllers {
  return { controllers: [resolve(USER_TYPES.Controllers.CreateUser)] }
}
```

Validar com: `npm run fit:validate-dependencies`

## Padrão de Controller
Controllers implementam `Controller` e usam decoradores do Inversify. Responsabilidade: parsing HTTP → resposta:
```typescript
@injectable()
export class CreateUserController implements Controller {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify) private readonly httpServer: HttpServer,
    @inject(USER_TYPES.UseCases.CreateUser) private readonly createUser: CreateUserUseCase,
  ) { this.callback = this.callback.bind(this) }

  async init() {
    await this.httpServer.register('post', UserRoutes.CREATE, { callback: this.callback }, swaggerSchema)
  }

  private async callback(req: FastifyRequest) {
    const parseResult = this.parseBodyOrError(req.body)
    if (parseResult.isFailure()) return ResponseFactory.BAD_REQUEST({ message: parseResult.value.message })
    const result = await this.createUser.execute(parseResult.value)
    if (result.isFailure()) return this.createResponseError(result)
    return ResponseFactory.CREATED({ body: result.value })
  }
}
```

Não colocar lógica de negócio aqui - tudo vai para Use Case.

## Padrão de Use Case
Use Cases orquestram lógica de negócio e publicam eventos de domínio. Sempre retornam `Either`:
```typescript
@injectable()
export class CreateUserUseCase {
  constructor(
    @inject(USER_TYPES.Repositories.User) private readonly userRepository: UserRepository,
    @inject(SHARED_TYPES.Queue) private readonly queue: Queue,
    @inject(SHARED_TYPES.UnitOfWork) private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CreateUserUseCaseInput): Promise<CreateUserOutput> {
    const userFound = await this.userRepository.findByEmail(input.email)
    if (userFound) return failure(new UserAlreadyExistsError())
    
    const userResult = User.create(input)
    if (userResult.isFailure()) return failure(userResult.value)
    
    const user = userResult.forceSuccess().value
    await this.unitOfWork.performTransaction(async (tx) => {
      await this.userRepository.withTransaction(tx).save(user)
    })
    
    DomainEventPublisher.instance.publish(new UserCreatedEvent(user.toPrimitive()))
    return success({ email: user.email })
  }
}
```

Transações e eventos de domínio aqui, não em controllers.

## Padrão de Entidade de Domínio
Entidades:
- Estendem `Observable` e usam factory methods com validação
- Não salvam a si mesmas (Repository faz isso)
- Métodos `create()` para validação completa, `restore()` para bypass (carregando do BD)

```typescript
export class User extends Observable {
  private constructor(props: UserConstructor) { 
    super()
    Object.assign(this, props)
  }
  
  static create(props: UserCreate): Either<ValidationErrors[], User> {
    const validationResult = Result.combine([
      Name.create(props.name),
      Email.create(props.email),
    ])
    if (validationResult.isFailure()) return failure(validationResult.value)
    return success(new User({ id: generateId(), ...props }))
  }
  
  static restore(props: UserRestore): User {
    return new User(props)
  }
  
  toPrimitive() { /* retornar dados para serialização */ }
}
```

Value Objects são imutáveis e sempre validam no `create()`.

## Estratégia de Testes
Dois tipos de testes automatizados:

### 1. Testes de Unidade (`*.test.ts`)
- Testam Domain e Application em isolamento
- Usam repositórios in-memory
- Arquivo config: `test/vite.config.app-domain.ts`

```typescript
describe('CreateUserUseCase', () => {
  beforeEach(() => {
    container.snapshot()
    userRepository = new InMemoryUserRepository()
    sut = new CreateUserUseCase(userRepository)
  })
  afterEach(() => container.restore())

  it('should create a user successfully', async () => {
    const result = await sut.execute({ email: 'test@example.com', name: 'Test' })
    expect(result.isSuccess()).toBe(true)
  })
})
```

**Executar único teste**: `npm run test -- --t "should create"`
**Rodar com cobertura**: `npm run test:cov`

### 2. Testes Business Flow (`*.business-flow-test.ts`)
- Testam fluxos HTTP completos com supertest
- Usam servidor Fastify em memória
- Arquivo config: `test/vite.config.business-flow.ts`

```typescript
describe('POST /users', () => {
  beforeEach(async () => {
    container.snapshot()
    fastifyServer = await serverBuildForTest()
  })

  it('should create user via HTTP', async () => {
    const response = await request(fastifyServer.server)
      .post('/users')
      .send({ email: 'test@example.com', name: 'Test' })
    expect(response.status).toBe(201)
  })
})
```

**Executar único teste**: `npm run test:business-flow -- --t "should create"`

## Checklist para Nova Feature
Ordem recomendada:

1. **Definir modelo de dados** em `{domain}/domain/`
   - Entidade principal + Value Objects
   - Validadores e erros de negócio

2. **Criar Use Case** em `{domain}/application/use-case/{feature}.usecase.ts`
   - Orquestração da lógica de negócio
   - Publicar eventos de domínio

3. **Teste de unidade** `{feature}.usecase.test.ts`
   - Validar regras de negócio

4. **Interface de Repository** em `{domain}/application/repository/`
   - Definir contrato de acesso a dados

5. **Controller HTTP** em `{domain}/infra/controller/{feature}.controller.ts`
   - Parsing e resposta HTTP

6. **Teste business-flow** `{feature}.business-flow-test.ts`
   - Validar fluxo completo HTTP

7. **IoC Container** em `src/shared/infra/ioc/module/{domain}/`:
   - Adicionar types em `service-identifier/{domain}-types.ts`
   - Registrar bindings em `{domain}-container.ts`

8. **Bootstrap** em `src/bootstrap/setup-{domain}-module.ts`
   - Adicionar controller ao array de controllers

9. **Validar** com `npm run fit:validate-dependencies`

## Convenções de Nomes e Arquivos

- **Entidades**: PascalCase, sufixo sem palavras genéricas (ex: `User`, não `UserEntity`)
- **Value Objects**: PascalCase (ex: `Email`, `Name`)
- **Use Cases**: PascalCase com sufixo `UseCase` (ex: `CreateUserUseCase`)
- **Controllers**: PascalCase com sufixo `Controller` (ex: `CreateUserController`)
- **Repositórios**: interface PascalCase, implementação `Prisma{Entity}Repository`
- **Erros**: PascalCase com sufixo `Error` (ex: `UserAlreadyExistsError`)
- **Arquivos**: kebab-case (ex: `create-user.usecase.ts`, `user.repository.ts`)

## Path Aliases e Imports
Configurado em `tsconfig.json`:
```typescript
// Usar alias @/ para src/
import { User } from '@/user/domain/entity/user'
import { Either } from '@/shared/domain/value-object/either'
```

**Importante**: Usar extensão `.js` em imports internos (transpilado para ESM):
```typescript
import { UserRepository } from './user-repository.js'  // ✅ Correto
import { UserRepository } from './user-repository'      // ❌ Evitar
```

## Integração com BD (Prisma)

- Models Prisma em `prisma/schema.prisma`
- Gerar cliente: `npm run prisma:generate`
- Executar migration: `npm run prisma:migrate:dev`
- Em testes, usar `InMemory*Repository` ao invés de Prisma
- Repositories concretos apenas em `infra/repository/`

## Ambiente e Infraestrutura

### Docker Compose
Serviços disponíveis em `compose.yaml`:
- **PostgreSQL**: porta 5432 (usuário: docker, senha: docker, database: apisolid)
- **Redis**: porta 6379 (cache e sessões)
- **RabbitMQ**: porta 5672 (mensageria assíncrona)

Iniciar todos os serviços: `docker compose up -d`

### Variáveis de Ambiente
Configurar arquivo `.env` baseado em `.env.example`:
- `DATABASE_PROVIDER`: "prisma" ou "sqlite"
- `NODE_ENV`: "production" ou "development"
- `DATABASE_URL`: string de conexão Prisma
- Variáveis de autenticação (JWT_SECRET, etc)
- Credenciais de serviços externos (Stripe, SMTP, etc)

Variáveis validadas em `src/shared/infra/env/index.ts` com Zod.

## Tratamento de Erro em Controllers

Padrão ResponseFactory para respostas consistentes:
```typescript
// Sucesso
return ResponseFactory.OK({ body: data })
return ResponseFactory.CREATED({ body: data })

// Erro
return ResponseFactory.BAD_REQUEST({ message: 'Descrição' })
return ResponseFactory.NOT_FOUND()
return ResponseFactory.CONFLICT({ message: 'Descrição' })

// Método helper para Either
private createResponseError(result: Either<Error, unknown>) {
  const error = result.value as any
  if (error instanceof CustomError) return ResponseFactory.BAD_REQUEST({ message: error.message })
  return ResponseFactory.INTERNAL_SERVER_ERROR()
}
```

## Padrão de Repository Provider
Providers encapsulam lógica de seleção de implementação de repositório baseada em ambiente:
```typescript
export class UserRepositoryProvider {
  public static provide(context: ResolutionContext): UserRepository {
    return isProduction()
      ? context.get(UserRepositoryProvider.selectDatabaseByProvider(), { autobind: true })
      : context.get(InMemoryUserRepository, { autobind: true })
  }

  private static selectDatabaseByProvider() {
    switch (env.DATABASE_PROVIDER) {
      case "prisma": return PrismaUserRepository
      default: return SQLiteUserRepository
    }
  }
}
```

Registrar no container com `.toDynamicValue()`:
```typescript
bind(USER_TYPES.Repositories.User).toDynamicValue(UserRepositoryProvider.provide)
```

## Padrão de Value Object
Value Objects validam no `create()` e retornam `Either`. Use `restore()` ao carregar do BD (sem validação):
```typescript
export class Email {
  private readonly _value: string
  private constructor(value: string) { this._value = value }

  static create(aString: string): Either<InvalidEmailError, Email> {
    const emailOrError = Email.validate(aString)
    if (emailOrError.isFailure()) return failure(emailOrError.value)
    return success(new Email(emailOrError.value))
  }

  static restore(aString: string): Email {
    return new Email(aString)
  }

  get value(): string { return this._value }
}
```

Value Objects são imutáveis - propriedades `readonly` e sem setters.

## Eventos de Domínio
Publicar eventos após persistência bem-sucedida:
```typescript
// No Use Case, após salvar entidade
DomainEventPublisher.instance.publish(new UserCreatedEvent(user.toPrimitive()))

// Criar evento de domínio
export class UserCreatedEvent extends DomainEvent<UserCreatedPayload> {
  constructor(payload: UserCreatedPayload) {
    super(Events.USER_CREATED, payload)
  }
}

// Subscrever em handlers
DomainEventPublisher.instance.subscribe(Events.USER_CREATED, (event) => {
  // Lógica assíncrona (envio de email, notificações, etc)
})
```

Eventos são singleton - usar `DomainEventPublisher.instance`.

## Estrutura de Módulo de Domínio
Cada bounded context em `src/{domain}/` segue esta estrutura:
```
{domain}/
├── domain/                    # Camada de domínio puro
│   ├── entity/                # Entidades agregadas
│   ├── value-object/          # Value Objects
│   ├── event/                 # Domain Events
│   └── error/                 # Erros de negócio
├── application/               # Camada de aplicação
│   ├── use-case/             # Use Cases
│   ├── repository/           # Interfaces de Repository
│   ├── error/                # Erros de aplicação
│   └── dto/                  # DTOs de input/output
└── infra/                    # Camada de infraestrutura
    ├── controller/           # Controllers HTTP
    ├── repository/           # Implementações de Repository
    └── routes/               # Definição de rotas
```

Domínios atuais: `user/`, `gym/`, `check-in/`, `session/`, `subscription/`, `shared/`


