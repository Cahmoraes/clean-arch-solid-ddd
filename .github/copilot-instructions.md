# Instruções do Copilot para o Projeto API Solid

## Restricoes de Comunicacao
- Responder em portugues PT-BR preservando termos tecnicos
- Nunca utilizar emojis
- Indentacao de 2 espacos, linha em branco ao final de arquivos

## Arquitetura (Clean Architecture + DDD)
Estrutura por bounded context em `src/{domain}/`:
```
domain/          # Entidades, Value Objects, Domain Events
application/     # Use Cases, Repository interfaces, Errors
infra/           # Controllers, implementacoes concretas
```

**Dominios**: `user/`, `gym/`, `check-in/`, `session/`, `subscription/`, `shared/`

### Regras de Dependencia (enforced por dependency-cruiser)
- Domain: nao importa Application nem Infra
- Application: importa Domain, nao importa Infra
- Infra: importa Application e Domain
- Shared: disponivel para todas as camadas

## Padrao Either para Tratamento de Erros
Use Cases retornam `Either<Error, Success>` de `@/shared/domain/value-object/either`:
```typescript
// Retornar erro
return failure(new UserAlreadyExistsError())

// Retornar sucesso
return success({ email: user.email })

// Verificar resultado
if (result.isFailure()) return this.handleError(result)
const data = result.forceSuccess().value
```

## Inversify IoC - Padrao de Registro
**Service Identifiers** em `src/shared/infra/ioc/module/service-identifier/`:
```typescript
export const USER_TYPES = {
  Repositories: { User: Symbol.for('UserRepository') },
  UseCases: { CreateUser: Symbol.for('CreateUserUseCase') },
  Controllers: { CreateUser: Symbol.for('UserController') },
}
```

**Container Module** em `src/shared/infra/ioc/module/{domain}/`:
```typescript
export const userContainer = new ContainerModule(({ bind }) => {
  bind(USER_TYPES.Repositories.User).toDynamicValue(UserRepositoryProvider.provide)
  bind(USER_TYPES.UseCases.CreateUser).to(CreateUserUseCase)
  bind(USER_TYPES.Controllers.CreateUser).to(CreateUserController)
})
```

**Bootstrap** em `src/bootstrap/setup-{domain}-module.ts`:
```typescript
export function setupUserModule(): ModuleControllers {
  return { controllers: [resolve(USER_TYPES.Controllers.CreateUser)] }
}
```

## Padrao de Controller
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

## Padrao de Use Case
```typescript
@injectable()
export class CreateUserUseCase {
  constructor(
    @inject(USER_TYPES.Repositories.User) private readonly userRepository: UserRepository,
    @inject(SHARED_TYPES.Queue) private readonly queue: Queue,
    @inject(SHARED_TYPES.UnitOfWork) private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(input: CreateUserUseCaseInput): Promise<CreateUserOutput> {
    const userFound = await this.userRepository.get(UserQuery.from(input).addField("email"))
    if (userFound) return failure(new UserAlreadyExistsError())
    const userResult = User.create(input)
    if (userResult.isFailure()) return failure(userResult.value)
    await this.unitOfWork.performTransaction(async (tx) => {
      await this.userRepository.withTransaction(tx).save(userResult.value)
    })
    DomainEventPublisher.instance.publish(new UserCreatedEvent({ email: user.email }))
    return success({ email: user.email })
  }
}
```

## Padrao de Entidade de Dominio
Entidades estendem `Observable` e usam factory methods com validacao:
```typescript
export class User extends Observable {
  private constructor(props: UserConstructor) { super(); /* assign props */ }
  
  static create(props: UserCreate): Either<UserValidationErrors[], User> {
    const validationResult = Result.combine([Name.create(props.name), Email.create(props.email)])
    if (validationResult.isFailure()) return failure(validationResult.value)
    return success(new User({ ...validatedProps }))
  }
  
  static restore(props: UserRestore): User { /* bypass validation */ }
}
```

## Estrategia de Testes
- **`*.test.ts`**: Testes unidade (domain/application) com repositorios in-memory
- **`*.business-flow-test.ts`**: Testes de integracao HTTP com supertest

**Setup de teste de unidade**:
```typescript
beforeEach(() => {
  container.snapshot()
  userRepository = setupInMemoryRepositories().userRepository
  sut = container.get(USER_TYPES.UseCases.CreateUser)
})
afterEach(() => container.restore())
```

**Setup de business-flow**:
```typescript
beforeEach(async () => {
  container.snapshot()
  container.rebindSync(USER_TYPES.Repositories.User).toConstantValue(new InMemoryUserRepository())
  fastifyServer = await serverBuildForTest()
})
```

## Comandos Essenciais
```bash
npm run dev                        # Desenvolvimento com hot-reload
npm run test                       # Testes de unidade
npm run test:business-flow         # Testes de integracao
npm run fit:validate-dependencies  # Validar arquitetura
docker compose up -d               # PostgreSQL + Redis + RabbitMQ
npm run prisma:migrate:dev         # Executar migrations
```

## Checklist para Nova Feature
1. Criar entidade/value objects em `{domain}/domain/`
2. Criar use case em `{domain}/application/use-case/{feature}.usecase.ts`
3. Criar teste de unidade `{feature}.usecase.test.ts`
4. Adicionar interface de repository em `{domain}/application/repository/`
5. Criar controller em `{domain}/infra/controller/{feature}.controller.ts`
6. Criar teste business-flow `{feature}.business-flow-test.ts`
7. Adicionar types em `src/shared/infra/ioc/module/service-identifier/{domain}-types.ts`
8. Registrar bindings em `src/shared/infra/ioc/module/{domain}/{domain}-container.ts`
9. Registrar controller em `src/bootstrap/setup-{domain}-module.ts`
