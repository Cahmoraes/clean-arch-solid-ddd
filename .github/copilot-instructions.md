# Instruções do Copilot para o Projeto API Solid

# Restrições de alto nível para comunicação e respostas da AI
- Sempre responda e crie documentos em português PT-BR preservando termos técnicos de domínio.
- Nunca utilize emojis
- O projeto utiliza indentação de 2 espaços (2 space)
- O projeto adiciona sempre uma linha em branco ao final de cada arquivo de código

## Visão Geral da Arquitetura

Este é um projeto de **Clean Architecture** implementando uma API de gerenciamento de fitness/academia com TypeScript, Prisma, Fastify e Inversify IoC. O código está organizado em três camadas distintas por contexto delimitado de domínio:

```
src/{domain}/
├── domain/          # Entidades, value objects, events
├── application/     # Use cases, repositories (interfaces), errors
└── infra/          # Controllers, implementations, routes
```

### Domínios Principais
- **user/**: Autenticação, perfis, métricas
- **gym/**: Gerenciamento e busca de academias
- **check-in/**: Check-ins de usuários e validação
- **session/**: Gerenciamento de sessões e refresh tokens
- **shared/**: Preocupações transversais (logging, queue, database)

## Stack Tecnológica

### Core Framework e Runtime
- **Node.js**: Runtime JavaScript server-side
- **TypeScript 5.8.3**: Superset tipado do JavaScript com decorators experimentais
- **Fastify 5.4.0**: Framework web de alta performance com sistema de plugins
- **tsx**: Executor TypeScript para desenvolvimento

### Arquitetura e Dependency Injection
- **Inversify 6.0.3**: Container de injeção de dependências com decorators
- **Reflect Metadata 0.2.2**: Suporte para metadados e decorators

### Database e ORM
- **PostgreSQL**: Banco de dados relacional principal
- **Prisma 6.11.0**: ORM moderno com schema declarativo e migrations
- **Redis**: Cache e sessões via IORedis 5.6.1

### Validação e Tipos
- **Zod 3.24.1**: Schema validation e inferência de tipos
- **Class Validator**: Validação de entidades de domínio

### Autenticação e Segurança
- **bcryptjs 2.4.3**: Hash seguro de senhas
- **jsonwebtoken 9.0.2**: Geração e verificação de JWT tokens
- **Cookie 1.0.2**: Manipulação de cookies HTTP

### Message Queue e Background Jobs
- **RabbitMQ**: Message broker para comunicação assíncrona
- **amqplib 0.10.4**: Cliente Node.js para RabbitMQ
- **node-cron 4.2.0**: Agendamento de tarefas

### Logging e Monitoramento
- **Winston 3.19.0**: Sistema de logging estruturado
- **Pino**: Logger alternativo de alta performance (via Fastify)

### Utilities
- **dotenv 17.0.1**: Carregamento de variáveis de ambiente
- **Nodemailer 7.0.4**: Envio de emails transacionais

### Pagamentos
- **Stripe 18.3.0**: Processamento de pagamentos e assinaturas

### Testing
- **Vitest 2.1.8**: Framework de testes unitários e integração
- **@vitest/ui 2.1.8**: Interface web para execução de testes

### Development Tools
- **ESLint**: Linting de código
- **dependency-cruiser**: Validação de dependências entre camadas
- **tsup**: Build otimizado para produção
- **Docker Compose**: Orquestração de serviços locais

### Infraestrutura
- **Docker**: Containerização da aplicação
- **Nginx**: Reverse proxy e load balancer
- **GitHub Actions**: CI/CD pipeline

## Padrões e Convenções Principais

### Estrutura do Módulo
Cada domínio segue exatamente este padrão:
- `application/use-case/` - Lógica de negócio (ex: `create-user.usecase.ts`)
- `application/repository/` - Interfaces de repository
- `application/error/` - Erros específicos do domínio
- `infra/controller/` - Controllers HTTP com rotas Fastify
- `domain/` - Entidades, value objects, domain events

### Injeção de Dependência
- Usa container **Inversify** com identificadores de serviço baseados em symbols
- Types definidos em `src/shared/infra/ioc/types.ts` (USER_TYPES, GYM_TYPES, etc.)
- Controllers devem ser `@injectable()` e registrados nos módulos bootstrap
- Resolver dependências usando padrão `resolve<T>(TYPES.Symbol)`

### Padrão dos Controllers
```typescript
@injectable()
export class CreateUserController implements Controller {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify) private httpServer: HttpServer,
    @inject(USER_TYPES.UseCases.CreateUser) private createUser: CreateUserUseCase
  ) {}
  
  async init() {
    this.httpServer.register('POST', '/users', this.callback)
  }
}
```

### Padrão dos Use Cases
- Sempre retornar `Either<Error, Success>` para tratamento de erros
- Usar injeção de dependência para repositories e services
- Publicar domain events usando `DomainEventPublisher`
- Incluir validação abrangente usando entidades de domínio

### Tratamento de Erros
- Erros de domínio estendem classes de erro base
- Usar padrão `Either` monad: `Either<ErrorType, SuccessType>`
- Retornar `failure(error)` ou `success(data)` dos use cases

## Workflow de Desenvolvimento

### Comandos Principais
```bash
npm run dev                    # Iniciar servidor de desenvolvimento
npm run test                   # Testes unitários (camada domain/application)
npm run test:business-flow     # Testes de integração
npm run test:e2e:prisma       # Testes end-to-end com database
npm run build                  # Build para produção
```

### Database & Queue
```bash
npm run prisma:migrate:dev     # Executar migrações do database
npm run prisma:studio         # Abrir Prisma Studio
npm run setup-queue          # Inicializar exchanges do RabbitMQ
docker compose up -d          # Iniciar PostgreSQL + Redis + RabbitMQ
```

### Validação da Arquitetura
```bash
npm run fit:validate-dependencies  # Enforçar dependências entre camadas
npm run dependency:metrics         # Gerar gráfico de dependências
```

## Regras Críticas

### Dependências entre Camadas (Enforçadas pelo dependency-cruiser)
- **Domain** → Não pode importar de Application ou Infra
- **Application** → Pode importar Domain, não pode importar Infra (exceto arquivos permitidos)
- **Infra** → Pode importar Application e Domain
- **Shared** → Disponível para todas as camadas

### Estratégia de Testes
- **Testes unitários**: `*.test.ts` - Testam lógica domain/application em isolamento
- **Testes de fluxo de negócio**: `*.business-flow-test.ts` - Testam fluxos completos de use case
- **Testes de integração**: Interações com database em ambiente de teste

### Desenvolvimento de Nova Feature
1. Começar com entidade/value object do domínio em `{domain}/domain/`
2. Criar use case em `{domain}/application/use-case/`
3. Adicionar interface de repository em `{domain}/application/repository/`
4. Implementar controller em `{domain}/infra/controller/`
5. Registrar controller em `bootstrap/setup-{domain}-module.ts`
6. Adicionar identificadores de serviço aos types do IoC

### Schema do Database
- Usa Prisma com PostgreSQL
- Schema em `prisma/schema.prisma`
- Sempre criar migrações: `npm run prisma:migrate:dev`
- Nunca editar database diretamente - usar migrações

### Message Queue
- RabbitMQ para comunicação assíncrona
- Definir exchanges em `src/shared/infra/queue/exchanges.ts`
- Controllers publicam events, queue workers os consomem

## Referências das Bibliotecas

Para informações detalhadas sobre as principais bibliotecas utilizadas no projeto, consulte a documentação específica:

### Core Libraries
- **[TypeScript](../docs/libs/TYPESCRIPT.md)** - Superset tipado do JavaScript
- **[Fastify](../docs/libs/FASTIFY.md)** - Framework web rápido e eficiente
- **[Prisma](../docs/libs/PRISMA.md)** - ORM moderno para TypeScript/Node.js
- **[Inversify](../docs/libs/INVERSIFY.md)** - Container de injeção de dependência

### Validation & Types
- **[Zod](../docs/libs/ZOD.md)** - Schema validation para TypeScript
- **[Reflect Metadata](../docs/libs/REFLECT-METADATA.md)** - Suporte a decorators e metadados

### Authentication & Security
- **[bcryptjs](../docs/libs/BCRYPTJS.md)** - Hashing de senhas
- **[jsonwebtoken](../docs/libs/JSONWEBTOKEN.md)** - Geração e validação de JWT tokens
- **[Cookie](../docs/libs/COOKIE.md)** - Manipulação de cookies HTTP

### Database & Cache
- **[IORedis](../docs/libs/IOREDIS.md)** - Cliente Redis para Node.js

### Message Queue
- **[amqplib](../docs/libs/AMQPLIB.md)** - Cliente RabbitMQ para Node.js

### Utilities
- **[dotenv](../docs/libs/DOTENV.md)** - Carregamento de variáveis de ambiente
- **[Winston](../docs/libs/WINSTON.md)** - Biblioteca de logging
- **[node-cron](../docs/libs/NODE-CRON.md)** - Agendamento de tarefas
- **[Nodemailer](../docs/libs/NODEMAILER.md)** - Envio de emails

### External Services
- **[Stripe](../docs/libs/STRIPE.md)** - Processamento de pagamentos

### Testing
- **[Vitest](../docs/libs/VITEST.md)** - Framework de testes unitários e integração

## Anti-Padrões a Evitar
- Não importar camada infra de domain/application (quebra Clean Architecture)
- Não criar dependências circulares entre domínios
- Não contornar o container IoC - sempre usar injeção de dependência
- Não pular testes de unidade para use cases
- Não modificar schema do Prisma sem migrações
