## ALTA PRIORIDADE

- **SE VOCÊ NÃO VERIFICAR AS SKILLS**, tarefa invalidada, gera retrabalho
- **VOCÊ SÓ PODE finalizar tarefa** se `pnpm biome:fix`, `pnpm tsc:check`, `pnpm test:run` e `pnpm build` passar 100% (lint + test + build). Sem exceção — falhar qualquer um = NÃO COMPLETA
- `biome:fix` tolerância zero. Zero problemas — qualquer issue Biome = falha bloqueante
- **SEMPRE verifique APIs dos pacotes dependentes** antes de código de integração/testes, evita código errado
- **NUNCA gambiarras** — skill `no-workarounds` p/ correção/debug + `testing-anti-patterns` p/ testes
- **SEMPRE skills** `no-workarounds` e `systematic-debugging` ao corrigir bugs/problemas complexos
- **NUNCA ferramentas web** p/ código local — use Grep/Glob
- **NUNCA COMMITS sem permissão** — pergunte

## REQUISITOS OBRIGATÓRIOS
- DEVE rodar `pnpm biome:fix` antes de concluir QUALQUER subtarefa
- SEMPRE skills `systematic-debugging` + `no-workarounds` antes de corrigir bug

Pular verificação = REJEIÇÃO IMEDIATA DA TAREFA.

<MOST_CRITICAL>

- ABSOLUTAMENTE OBRIGATÓRIO: modo Plan, após usuário aceitar plano, SEMPRE escreva plano aceito em Markdown dentro de docs/plans/.

- OBRIGATÓRIO: se plano aceito atualizado depois, atualize/acrescente no Markdown correspondente em docs/plans/.

- VIOLAÇÃO: não persistir planos aceitos do modo Plan em docs/plans/ = não conformidade com política do workspace.

</MOST_CRITICAL>

# Overview do Projeto

## Restrições de Comunicação
- Responder PT-BR preservando termos técnicos
- Nunca emojis
- Indentação 2 espaços, linha em branco ao final de arquivos

## Build, Test & Lint

### Comandos Essenciais
```bash
pnpm start                      # Iniciar aplicação em produção
pnpm dev                        # Desenvolvimento com hot-reload
pnpm build                      # Build para produção
pnpm tsc:check                  # Verificar tipos TypeScript
pnpm worker                     # Iniciar worker de processamento de fila
```

### Testing
```bash
pnpm test                       # Testes de unidade (*.test.ts)
pnpm test:cov                   # Testes com cobertura
pnpm test:business-flow         # Testes HTTP de integração (*.business-flow-test.ts)
pnpm test:e2e:prisma            # Testes de integração Prisma
pnpm test:fitness               # Fitness function tests
pnpm test-create-users          # Teste de carga: requisições POST concorrentes
```

### Validação de Arquitetura & Qualidade
```bash
pnpm fit:validate-dependencies  # Validar regras de dependência (dependency-cruiser)
pnpm dependency:metrics         # Gerar visualização de dependências (SVG)
pnpm biome:fix                  # Formatar código com Biome
pnpm eslint:fix                 # Corrigir problemas ESLint
pnpm check:last-dependencies    # Verificar e atualizar dependências desatualizadas
```

### Banco de Dados
```bash
pnpm prisma:migrate:dev         # Executar migrations (dev)
pnpm prisma:generate            # Gerar cliente Prisma
pnpm prisma:studio              # UI para gerenciar banco (http://localhost:5555)
pnpm prisma:reset               # Resetar banco (force drop + migrate)
pnpm prisma:deploy              # Deploy das migrations em produção
pnpm prisma:schema              # Gerar schema SQL (supabase-schema.sql)
pnpm prisma:db:pull             # Sincronizar schema com BD existente
```

### Docker
```bash
pnpm docker:up                  # Iniciar PostgreSQL + Redis + RabbitMQ
pnpm docker:down                # Derrubar todos os containers
```

### Utilitários
```bash
pnpm setup-queue                # Configurar filas no RabbitMQ
pnpm wait:db                    # Aguardar disponibilidade do PostgreSQL
pnpm wait:rabbit                # Aguardar disponibilidade do RabbitMQ
pnpm commit                     # Commit interativo com Commitizen (padrão convencional)
pnpm "stripe webhook"           # Iniciar listener de webhook do Stripe
```

## Skills Obrigatórias por Tipo de Tarefa

| Tarefa | Skills Obrigatórias |
|--------|-------------------|
| Correção de bug / debug | `systematic-debugging` + `no-workarounds` |
| Escrita/alteração de testes | `test-antipatterns` |
| Criação de feature nova (domínio, use case, controller) | `brainstorming` (antes de implementar) |
| Análise arquitetural / dead code / violações de camada | `architectural-analysis` |
| Consulta de docs de libs externas | `context7` |
| Rebase e resolução de conflitos de merge | `git-rebase` |
| Escrita/configuração de testes unitários e business-flow | `vitest` |
| Validação de schemas (env, DTOs, inputs) | `zod` |
| Fluxos de estado complexos com máquinas de estado | `xstate` |
| Pesquisa na web por documentação e referências técnicas | `exa-web-search-free` |
| Refatoração | `refactoring` |

## Arquitetura (Clean Architecture + DDD)
Estrutura por bounded context em `src/{domain}/`:
```
domain/          # Entidades, Value Objects, Domain Events, Erros de negócio
application/     # Use Cases, interfaces de Repository, Erros de aplicação
infra/           # Controllers, implementações concretas de Repository, Providers
```

**Domínios**: `user/`, `gym/`, `check-in/`, `session/`, `subscription/`, `shared/`

**Antes de modificar qualquer módulo**: leia o `AGENTS.md` do bounded context correspondente em `src/{domain}/AGENTS.md`.

### Regras de Dependência (enforced por dependency-cruiser)
- **Domain**: não importa Application nem Infra (código puro)
- **Application**: importa Domain, não Infra (orquestração)
- **Infra**: importa Application e Domain (implementações técnicas)
- **Shared**: disponível p/ todas camadas (utilitários genéricos)

## Padrão Either para Tratamento de Erros
Use Cases retornam `Either<Error, Success>` de `@/shared/domain/value-object/either`. Sem exceções p/ lógica de negócio:
```typescript
// Retornar erro
return failure(new UserAlreadyExistsError())

// Retornar sucesso
return success({ email: user.email })

// Verificar resultado no controller
if (result.isFailure()) return this.createResponseError(result)
const { value } = result.forceSuccess()
```

Exceções apenas p/ falhas técnicas (conexão BD, etc).

## Inversify IoC - Padrão de Registro
Três passos p/ adicionar serviço:

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

Validar com: `pnpm fit:validate-dependencies`

## Padrão de Controller
Controllers implementam `Controller`, usam decoradores Inversify. Responsabilidade: parsing HTTP → resposta:
```typescript
@injectable()
export class CreateUserController implements Controller {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify) private readonly httpServer: HttpServer,
    @inject(USER_TYPES.UseCases.CreateUser) private readonly createUser: CreateUserUseCase,
  ) { this.bindMethods() }

  private bindMethods() {
    this.callback = this.callback.bind(this)
  }

  @Logger({ message: '✅' })
  async init() {
    await this.httpServer.register('post', UserRoutes.CREATE, { callback: this.callback }, makeSwaggerSchema())
  }

  private async callback(req: FastifyRequest) {
    const parseResult = this.parseBodyOrError(req.body)
    if (parseResult.isFailure()) return ResponseFactory.BAD_REQUEST({ message: parseResult.value.message })
    const result = await this.createUser.execute(parseResult.value)
    if (result.isFailure()) return this.createResponseError(result)
    return ResponseFactory.CREATED({ body: result.value })
  }
}

// Swagger schema definido como factory function local no mesmo arquivo
function makeSwaggerSchema(): Schema { ... }
```

Sem lógica de negócio aqui — vai p/ Use Case.

### Segurança de Rotas
Rotas protegidas usam flags em `HandlerOptions`:
```typescript
// Rota autenticada (JWT obrigatório)
this.httpServer.register('get', UserRoutes.ME, { callback: this.callback, isProtected: true }, schema)

// Rota restrita a ADMIN
this.httpServer.register('delete', UserRoutes.DELETE, { callback: this.callback, isProtected: true, onlyAdmin: true }, schema)
```

### Definição de Rotas
Rotas = constantes em `{domain}/infra/controller/routes/{domain}-routes.ts`:
```typescript
const PREFIX = '/users'
export const UserRoutes = {
  CREATE: PREFIX,
  ME: `${PREFIX}/me`,
  PROFILE: `${PREFIX}/:userId`,
} as const
```

## Padrão de Use Case
Use Cases orquestram lógica de negócio, publicam eventos de domínio. Sempre retornam `Either`:
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

    const userResult = await User.create(input)
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
- Estendem `Observable`, usam factory methods com validação
- Não salvam a si mesmas (Repository faz)
- `create()` p/ validação completa, `restore()` p/ bypass (carregando do BD)
- `create()` **async** apenas quando validação envolve operações assíncronas (ex: `User` usa bcrypt via `Password.create()`). `Gym` e `CheckIn` têm `create()` síncrono

```typescript
// create() síncrono (Gym, CheckIn, etc.)
export class Gym extends Observable {
  private constructor(props: GymConstructor) { super() }

  static create(props: GymCreateProps): Either<ValidationError, Gym> {
    const nameResult = Name.create(props.title)
    if (nameResult.isFailure()) return failure(nameResult.value)
    const result = Result.combine([nameResult, coordinateResult])
    if (result.not.valid) return failure(result.errors)
    return success(new Gym({ ...props, id: Id.create(props.id) }))
  }

  static restore(props: GymRestore): Gym {
    return new Gym({ id: Id.restore(props.id), ... })
  }
}

// create() async (User — bcrypt no Password.create())
export class User extends Observable {
  static async create(props: UserCreate): Promise<Either<ValidationErrors[], User>> {
    const passwordResult = await Password.create(props.password) // async
    const result = Result.combine([Name.create(props.name), Email.create(props.email), passwordResult])
    if (result.not.valid) return failure(result.errors)
    return success(new User({ id: Id.create(props.id), ... }))
  }

  // Mutações publicam eventos via this.notify()
  public async changePassword(newPassword: string): Promise<Either<Error, null>> {
    const passwordResult = await Password.create(newPassword)
    if (passwordResult.isFailure()) return failure(passwordResult.value)
    this._password = passwordResult.value
    this.notify(new PasswordChangedEvent({ userName: this.name, userEmail: this.email }))
    return success(null)
  }
}
```

`Result.combine()` agrega múltiplos `Either` — se qualquer falhar, retorna todos os erros.

Value Objects imutáveis, sempre validam no `create()`.

## Estratégia de Testes
Dois tipos de testes automatizados:

### 1. Testes de Unidade (`*.test.ts`)
- Testam Domain e Application isolados
- Repositórios in-memory
- Config: `test/vite.config.app-domain.ts`

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

**Único teste**: `pnpm test -- --t "should create"`
**Cobertura**: `pnpm test:cov`

### 2. Testes Business Flow (`*.business-flow-test.ts`)
- Testam fluxos HTTP completos com supertest
- Servidor Fastify em memória
- Config: `test/vite.config.business-flow.ts`

```typescript
describe('POST /users', () => {
  let fastifyServer: FastifyAdapter
  let userRepository: UserRepository

  beforeEach(async () => {
    container.snapshot()
    // Substituir binding por implementação in-memory
    const inMemoryRepository = new InMemoryUserRepository()
    container.rebindSync(USER_TYPES.Repositories.User).toConstantValue(inMemoryRepository)
    userRepository = container.get<UserRepository>(USER_TYPES.Repositories.User)
    fastifyServer = await serverBuildForTest()
    await fastifyServer.ready()
  })

  afterEach(async () => {
    container.restore()
    await fastifyServer.close()
  })

  it('should create user via HTTP', async () => {
    const response = await request(fastifyServer.server)
      .post(UserRoutes.CREATE)
      .send({ email: 'test@example.com', name: 'Test User', password: 'any_password' })
    expect(response.status).toBe(HTTP_STATUS.CREATED)
  })
})
```

**Único teste**: `pnpm test:business-flow -- --t "should create"`

### Helpers de Teste
Utilitários em `test/factory/` p/ criar e persistir entidades em memória:
```typescript
import { createAndSaveUser } from 'test/factory/create-and-save-user'
import { createAndSaveGym } from 'test/factory/create-and-save-gym'
import { createAndSaveCheckIn } from 'test/factory/create-and-save-check-in'

// Aceita props parciais; usa defaults para campos não informados
const user = await createAndSaveUser({ userRepository, email: 'specific@email.com', role: 'ADMIN' })
```

## Checklist para Nova Feature
Ordem recomendada:

1. **Modelo de dados** em `{domain}/domain/`
   - Entidade principal + Value Objects
   - Validadores e erros de negócio

2. **Use Case** em `{domain}/application/use-case/{feature}.usecase.ts`
   - Orquestração da lógica
   - Publicar eventos de domínio

3. **Teste de unidade** `{feature}.usecase.test.ts`
   - Validar regras de negócio

4. **Interface de Repository** em `{domain}/application/repository/`
   - Contrato de acesso a dados

5. **Controller HTTP** em `{domain}/infra/controller/{feature}.controller.ts`
   - Parsing e resposta HTTP

6. **Teste business-flow** `{feature}.business-flow-test.ts`
   - Validar fluxo completo HTTP

7. **IoC Container** em `src/shared/infra/ioc/module/{domain}/`:
   - Types em `service-identifier/{domain}-types.ts`
   - Bindings em `{domain}-container.ts`

8. **Bootstrap** em `src/bootstrap/setup-{domain}-module.ts`
   - Controller ao array de controllers

9. **Validar** com `pnpm fit:validate-dependencies`

## Convenções de Nomes e Arquivos

- **Entidades**: PascalCase, sem palavras genéricas (ex: `User`, não `UserEntity`)
- **Value Objects**: PascalCase (ex: `Email`, `Name`)
- **Use Cases**: PascalCase sufixo `UseCase` (ex: `CreateUserUseCase`)
- **Controllers**: PascalCase sufixo `Controller` (ex: `CreateUserController`)
- **Repositórios**: interface PascalCase, implementação `Prisma{Entity}Repository`
- **Erros**: PascalCase sufixo `Error` (ex: `UserAlreadyExistsError`)
- **Arquivos**: kebab-case (ex: `create-user.usecase.ts`, `user.repository.ts`)

## Path Aliases e Imports
Configurado em `tsconfig.json`:
```typescript
// Usar alias @/ para src/
import { User } from '@/user/domain/entity/user'
import { Either } from '@/shared/domain/value-object/either'
```

**Importante**: extensão `.js` em imports internos (transpilado p/ ESM):
```typescript
import { UserRepository } from './user-repository.js'  // ✅ Correto
import { UserRepository } from './user-repository'      // ❌ Evitar
```

## Integração com BD (Prisma)

- Models Prisma em `prisma/schema.prisma`
- Gerar cliente: `pnpm prisma:generate`
- Migration: `pnpm prisma:migrate:dev`
- Testes: usar `InMemory*Repository` ao invés de Prisma
- Repositories concretos apenas em `infra/repository/`

## Ambiente e Infraestrutura

### Docker Compose
Serviços em `compose.yaml`:
- **PostgreSQL**: porta 5432 (usuário: docker, senha: docker, database: apisolid)
- **Redis**: porta 6379 (cache e sessões)
- **RabbitMQ**: porta 5672 (mensageria assíncrona)

Iniciar todos: `docker compose up -d`

### Variáveis de Ambiente
`.env` baseado em `.env.example`:
- `DATABASE_PROVIDER`: "prisma" ou "sqlite"
- `NODE_ENV`: "production" ou "development"
- `DATABASE_URL`: string de conexão Prisma
- Autenticação (JWT_SECRET, etc)
- Credenciais de serviços externos (Stripe, SMTP, etc)

Variáveis validadas em `src/shared/infra/env/index.ts` com Zod.

## Tratamento de Erro em Controllers

Padrão ResponseFactory p/ respostas consistentes:
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
Providers encapsulam seleção de implementação por ambiente:
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

Registrar com `.toDynamicValue()`:
```typescript
bind(USER_TYPES.Repositories.User).toDynamicValue(UserRepositoryProvider.provide)
```

## Padrão de Value Object
Value Objects validam no `create()`, retornam `Either`. `restore()` ao carregar do BD (sem validação):
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

Value Objects imutáveis — propriedades `readonly`, sem setters.

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

Eventos singleton — usar `DomainEventPublisher.instance`.

## Estrutura de Módulo de Domínio
Cada bounded context em `src/{domain}/`:
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

## Documentação Específica por Módulo

Cada módulo tem `AGENTS.md` próprio com specs de entidades, Value Objects, Use Cases, rotas, erros e exemplos:

| Módulo          | Documentação                                     | Responsabilidade principal                          |
|-----------------|--------------------------------------------------|-----------------------------------------------------|
| `user/`         | [`src/user/AGENTS.md`](src/user/AGENTS.md)       | Usuários, perfil, senha, status, roles              |
| `gym/`          | [`src/gym/AGENTS.md`](src/gym/AGENTS.md)         | Academias, busca por nome e proximidade             |
| `check-in/`     | [`src/check-in/AGENTS.md`](src/check-in/AGENTS.md) | Check-ins, validação de distância e tempo         |
| `session/`      | [`src/session/AGENTS.md`](src/session/AGENTS.md) | Autenticação JWT, logout, refresh token             |
| `subscription/` | [`src/subscription/AGENTS.md`](src/subscription/AGENTS.md) | Assinaturas Stripe, webhooks              |