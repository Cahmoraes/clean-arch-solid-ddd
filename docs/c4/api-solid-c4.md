# Análise de Diagramas C4 - API Solid

## Visão Geral do Projeto

A **API Solid** é um sistema de gerenciamento de check-ins em academias desenvolvido seguindo os princípios de Clean Architecture e Domain-Driven Design (DDD). O sistema é estruturado em bounded contexts bem definidos, com separação clara de responsabilidades entre as camadas de domínio, aplicação e infraestrutura.

## Contextos Delimitados (Bounded Contexts)

O sistema está organizado em 5 bounded contexts principais:

### 1. User Context
Responsável pelo gerenciamento de usuários e seus perfis.

**Funcionalidades:**
- Criação e gerenciamento de usuários
- Perfil de usuário
- Alteração de senha
- Listagem de usuários
- Ativação/suspensão de contas
- Exclusão de usuários
- Métricas de usuários

### 2. Session Context
Gerencia autenticação e sessões de usuários.

**Funcionalidades:**
- Autenticação via JWT
- Refresh token
- Logout
- Gerenciamento de sessões via Redis

### 3. Gym Context
Administra o cadastro e busca de academias.

**Funcionalidades:**
- Criação de academias
- Busca de academias (por nome, localização)
- Validação de CNPJ
- Gerenciamento de coordenadas geográficas

### 4. Check-in Context
Controla o registro e validação de check-ins.

**Funcionalidades:**
- Realização de check-in
- Validação de check-in (apenas admins)
- Histórico de check-ins
- Validação de distância (máximo 100m da academia)
- Validação de tempo (máximo 20 minutos após check-in)
- Limite de 1 check-in por dia por usuário

### 5. Subscription Context
Gerencia assinaturas e integração com Stripe.

**Funcionalidades:**
- Criação de assinaturas
- Webhook handler para eventos do Stripe
- Gerenciamento de status de assinatura

## Decisões Arquiteturais

### Clean Architecture + DDD

O projeto segue uma estrutura rigorosa em 3 camadas por contexto:

```
{context}/
  domain/          # Entidades, Value Objects, Domain Events
  application/     # Use Cases, Repository interfaces, Errors
  infra/          # Controllers, Repositories, Adapters
```

**Regras de Dependência:**
- Domain: não depende de Application nem Infra
- Application: depende de Domain, não depende de Infra
- Infra: depende de Application e Domain
- Shared: disponível para todas as camadas

### Pattern Either para Tratamento de Erros

O projeto utiliza o pattern **Either<Left, Right>** para tratamento de erros sem exceções, promovendo:
- Tratamento explícito de erros
- Fluxo de código mais legível
- Type safety em TypeScript

**Exemplo:**
```typescript
const result = await createUser.execute(input)
if (result.isFailure()) {
  return this.handleError(result)
}
const user = result.value
```

### Inversify IoC Container

O sistema utiliza **Inversify** para injeção de dependências, com:
- Service Identifiers via Symbols
- Container Modules por bounded context
- Providers para factories complexas
- Lifecycle management (Singleton/Transient)

### Value Objects e Validações

Todas as validações de domínio são realizadas através de Value Objects:
- **Email**: Validação de formato de e-mail
- **Name**: Validação de nome (tamanho, caracteres)
- **PasswordHash**: Hash e comparação de senhas com bcrypt
- **CNPJ**: Validação de CNPJ brasileiro
- **Coordinates**: Validação de latitude/longitude

### Domain Events

O sistema utiliza o pattern Observer para eventos de domínio:
- **UserCreatedEvent**: Disparado ao criar usuário
- **CheckInValidatedEvent**: Disparado ao validar check-in
- Eventos são publicados via RabbitMQ para processamento assíncrono

## Stack Tecnológica

### Core
- **Node.js 20**: Runtime JavaScript
- **TypeScript**: Tipagem estática
- **Fastify**: Web framework (alta performance)
- **Inversify**: IoC container
- **Zod**: Validação de schemas

### Persistência
- **PostgreSQL**: Banco de dados relacional
- **Prisma ORM**: ORM e migrations
- **Redis**: Cache e sessões

### Comunicação Assíncrona
- **RabbitMQ**: Message broker
- **AMQP**: Protocolo de mensageria

### Serviços Externos
- **Stripe**: Gateway de pagamento
- **NodeMailer**: Envio de e-mails

### Observabilidade
- **Winston**: Logging estruturado

### Infraestrutura
- **Nginx**: Reverse proxy
- **Docker Compose**: Orquestração local

## Padrões de Design Implementados

1. **Factory Pattern**: Para criação de entidades com validação
2. **Repository Pattern**: Para abstração de persistência
3. **Unit of Work**: Para transações
4. **Strategy Pattern**: Para diferentes implementações de repositórios
5. **Observer Pattern**: Para eventos de domínio
6. **Provider Pattern**: Para resolução dinâmica de dependências
7. **Either Monad**: Para tratamento funcional de erros

## Pontos Fortes da Arquitetura

1. **Separação de Responsabilidades**: Cada camada tem responsabilidades bem definidas
2. **Testabilidade**: Arquitetura facilita testes unitários e de integração
3. **Manutenibilidade**: Código organizado por contextos de negócio
4. **Escalabilidade**: Bounded contexts podem evoluir independentemente
5. **Type Safety**: TypeScript + Zod garantem segurança de tipos
6. **Dependency Cruiser**: Validação automática de dependências entre camadas

## Considerações de Segurança

1. **Autenticação JWT**: Tokens assinados e validados
2. **Refresh Token**: Rotação de tokens via cookies HTTP-only
3. **Hash de Senhas**: bcrypt com salt rounds
4. **Validação de Input**: Zod schemas em todos os endpoints
5. **CORS**: Configuração de origens permitidas
6. **Rate Limiting**: Via Nginx (configurável)

## Padrões de Testes

- **Testes Unitários** (`*.test.ts`): Domain e Application com repositórios in-memory
- **Testes de Integração** (`*.business-flow-test.ts`): Testes HTTP com supertest
- **Setup de Teste**: Isolation de schemas PostgreSQL por teste
- **Vitest**: Framework de testes

## Conclusão

A API Solid demonstra uma implementação robusta de Clean Architecture + DDD em TypeScript, com ênfase em:
- Separação de camadas e contextos
- Tratamento explícito de erros
- Validações de domínio via Value Objects
- Injeção de dependências via Inversify
- Testabilidade e manutenibilidade

A arquitetura suporta evolução independente de bounded contexts e facilita a manutenção e extensão do sistema ao longo do tempo.

## Diagramas Gerados

1. **C1 - System Context**: Visão de alto nível do sistema e seus usuários
2. **C2 - Container**: Containers e infraestrutura (API, Database, Redis, RabbitMQ, Nginx)
3. **C3 - Component**: Componentes internos da API (Controllers, Use Cases, Repositories)
4. **C4 - Code**: Exemplo detalhado do User Context (classes, interfaces, relacionamentos)

Para visualizar os diagramas, utilize o PlantUML plugin no VS Code ou acesse [PlantUML Online](http://www.plantuml.com/plantuml/uml/).
