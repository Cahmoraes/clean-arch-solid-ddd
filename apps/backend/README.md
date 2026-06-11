# Backend — API Solid

API desenvolvida com princípios de Clean Architecture e DDD, utilizando TypeScript,
Node.js, Fastify e Prisma ORM. Projetada para ser escalável, testável e fácil de manter.

Faz parte do monorepo — veja o [README raiz](../../README.md) para a visão geral.

> Execução local-only: roda na sua máquina com a infraestrutura via Docker Compose
> (Postgres + Redis + RabbitMQ). Não há deploy em nuvem associado a este projeto.

## Estrutura do Projeto

A estrutura segue Clean Architecture, dividindo o código em camadas bem definidas:

- **Domain**: entidades e objetos de valor do domínio.
- **Application**: casos de uso e lógica de aplicação.
- **Infra**: implementação de infraestrutura — repositórios, controllers e serviços externos.

## Funcionalidades

- **Autenticação de Usuários**: criação, autenticação e gerenciamento de perfis.
- **Gerenciamento de Academias**: criação, busca e validação de academias.
- **Check-ins**: registro e validação de check-ins de usuários em academias.
- **Métricas de Usuários**: consulta de métricas e histórico de check-ins.

## Tecnologias

- **Node.js** — ambiente de execução JavaScript.
- **TypeScript** — superset de JavaScript com tipagem estática.
- **Fastify** — framework web para Node.js.
- **Prisma ORM** — ORM para Node.js e TypeScript (PostgreSQL).
- **Inversify** — container de injeção de dependência.
- **Redis** — cache.
- **RabbitMQ** — barramento de mensagens para comunicação assíncrona.
- **NodeMailer** — disparo de e-mails (SMTP; usa conta Ethereal de teste se vazio).
- **Zod** — validação de esquemas.
- **Vitest** — testes unitários e de integração.

## Pré-requisitos

- [Node.js](https://nodejs.org) 20+
- [pnpm](https://pnpm.io) 11.5.2
- [Docker](https://www.docker.com) + Docker Compose

## Setup

A partir da raiz do monorepo:

```sh
# 1. Instalar dependências
pnpm install

# 2. Criar o arquivo de ambiente a partir do exemplo
cp apps/backend/.env.example apps/backend/.env

# 3. Subir a infraestrutura local (Postgres + Redis + RabbitMQ + Nginx)
pnpm --filter backend docker:up

# 4. Rodar as migrações do Prisma
pnpm --filter backend prisma:migrate:dev
```

## Desenvolvimento

```sh
pnpm --filter backend dev
```

A API sobe em `http://localhost:3333`. O script `dev` já executa `docker:up` e
aguarda Postgres e RabbitMQ ficarem prontos automaticamente.

## Scripts

```sh
pnpm --filter backend build                 # Build de produção (tsup → ./build)
pnpm --filter backend start                 # Inicia o build de produção
pnpm --filter backend tsc:check             # Type checking
pnpm --filter backend biome:fix             # Lint/format com Biome
pnpm --filter backend test:run              # Testes unitários
pnpm --filter backend test:business-flow    # Testes de integração HTTP
pnpm --filter backend test:e2e:prisma       # Testes de integração Prisma
pnpm --filter backend test:fitness          # Fitness functions de arquitetura
pnpm --filter backend prisma:studio         # Prisma Studio
pnpm --filter backend docker:up             # Sobe a infra local
pnpm --filter backend docker:down           # Derruba a infra local
```

## Configuração do Dependency Cruiser

O arquivo `.dependency-cruiser.js` define as regras de dependência entre camadas.
Principais regras:

- **noDomainToApplicationExceptPermitted**: impede `domain` depender de `application`, exceto arquivos permitidos.
- **noDomainToInfraExceptPermitted**: impede `domain` depender de `infra`, exceto arquivos permitidos.
- **noApplicationToInfraExceptPermitted**: impede `application` depender de `infra`, exceto arquivos permitidos.
- **allowInfraCircularDependency**: permite ciclos dentro de `infra/`, mas impede ciclos nas demais camadas.

As regras ficam na seção `forbidden` do arquivo. Para mais detalhes, consulte
[.dependency-cruiser.js](./.dependency-cruiser.js).

```sh
pnpm --filter backend fit:validate-dependencies
```

## Licença

MIT — desenvolvido por Caique Vinícius de Moraes.
