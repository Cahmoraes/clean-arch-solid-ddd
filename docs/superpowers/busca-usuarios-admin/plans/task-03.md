# Task 3: Backend UseCase + Controller + testes de business flow

**Status:** PENDING
**PRD:** N/A
**Spec:** `../specs/busca-usuarios-admin-design.md`

## Visão Geral

Adicionar `query?: string` ao input do `FetchUsersUseCase`, atualizar a chave de cache Redis para incluir o query, e atualizar o `FetchUsersController` para extrair e repassar o parâmetro `query` do querystring. Adicionar testes de business flow cobrindo busca por nome, email e ausência de query.

**Pré-requisito:** Task 1 concluída (`FetchUsersInput` já tem `query?: string`).

## Arquivos

- Modify: `apps/backend/src/user/application/use-case/fetch-users.usecase.ts`
- Modify: `apps/backend/src/user/infra/controller/fetch-users.controller.ts`
- Modify: `apps/backend/src/user/infra/controller/fetch-users.business-flow-test.ts`

## Conformidade com as Competências Padrão

- `test-driven-development`: escrever testes de business flow antes de atualizar o controller
- `no-workarounds`: `query` fluir pela cadeia completa sem transformações intermediárias

## Passos

- [ ] **Step 1: Escrever os testes de business flow que falham**

Abrir `apps/backend/src/user/infra/controller/fetch-users.business-flow-test.ts` e adicionar os seguintes testes ao final do `describe("Buscar Usuários")`:

```typescript
test("Deve filtrar usuários por nome parcial via query param", async () => {
  userDAO.createFakeUser({
    id: "u-joao",
    name: "João Silva",
    email: "joao@example.com",
  })
  userDAO.createFakeUser({
    id: "u-maria",
    name: "Maria Santos",
    email: "maria@example.com",
  })
  const response = await request(fastifyServer.server)
    .get(UserRoutes.FETCH)
    .query({ page: 1, limit: 10, query: "João" })
    .set("Accept", "application/json")
    .set("Authorization", `Bearer ${token}`)

  expect(response.status).toBe(HTTP_STATUS.OK)
  expect(response.body.users).toHaveLength(1)
  expect(response.body.users[0].id).toBe("u-joao")
  expect(response.body.pagination.total).toBe(1)
})

test("Deve filtrar usuários por email parcial via query param", async () => {
  userDAO.createFakeUser({
    id: "u-joao",
    name: "João Silva",
    email: "joao@example.com",
  })
  userDAO.createFakeUser({
    id: "u-maria",
    name: "Maria Santos",
    email: "maria@example.com",
  })
  const response = await request(fastifyServer.server)
    .get(UserRoutes.FETCH)
    .query({ page: 1, limit: 10, query: "maria@" })
    .set("Accept", "application/json")
    .set("Authorization", `Bearer ${token}`)

  expect(response.status).toBe(HTTP_STATUS.OK)
  expect(response.body.users).toHaveLength(1)
  expect(response.body.users[0].id).toBe("u-maria")
  expect(response.body.pagination.total).toBe(1)
})

test("Deve retornar todos os usuários quando query está ausente", async () => {
  userDAO.bulkCreateFakeUsers(5)
  const response = await request(fastifyServer.server)
    .get(UserRoutes.FETCH)
    .query({ page: 1, limit: 10 })
    .set("Accept", "application/json")
    .set("Authorization", `Bearer ${token}`)

  expect(response.status).toBe(HTTP_STATUS.OK)
  expect(response.body.users).toHaveLength(5)
  expect(response.body.pagination.total).toBe(5)
})

test("Deve retornar lista vazia quando query não encontra usuários", async () => {
  userDAO.createFakeUser({ id: "u-joao", name: "João Silva", email: "joao@example.com" })
  const response = await request(fastifyServer.server)
    .get(UserRoutes.FETCH)
    .query({ page: 1, limit: 10, query: "xyz_sem_match" })
    .set("Accept", "application/json")
    .set("Authorization", `Bearer ${token}`)

  expect(response.status).toBe(HTTP_STATUS.OK)
  expect(response.body.users).toHaveLength(0)
  expect(response.body.pagination.total).toBe(0)
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm --filter backend test:business-flow -- -t "Deve filtrar usuários por nome parcial via query param"
```

Resultado esperado: `FAIL` (controller ainda não aceita `query`).

- [ ] **Step 3: Adicionar `query?: string` ao `FetchUsersUseCaseInput` e atualizar cache key**

Abrir `apps/backend/src/user/application/use-case/fetch-users.usecase.ts` e aplicar as seguintes mudanças:

**3a. Atualizar a interface de input (linha 10):**
```typescript
export interface FetchUsersUseCaseInput {
	page: number
	limit: number
	query?: string
}
```

**3b. Atualizar o método `createCacheKey` (linha 72):**
```typescript
private createCacheKey(input: FetchUsersUseCaseInput): string {
	return `fetch-users:${input.page}:${input.limit}:${input.query ?? ""}`
}
```

O arquivo completo após as mudanças fica assim:

```typescript
import { inject, injectable } from "inversify"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { env } from "@/shared/infra/env"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { Logger } from "@/shared/infra/logger/logger"
import type { RoleTypes } from "@/user/domain/value-object/role"
import type { StatusTypes } from "@/user/domain/value-object/status"
import type { FetchUsersOutput, UserDAO } from "../persistence/dao/user-dao"

export interface FetchUsersUseCaseInput {
	page: number
	limit: number
	query?: string
}

export interface FetchUsersData {
	id: string
	role: RoleTypes
	status: StatusTypes
	createdAt: string
	name: string
	email: string
}

export interface FetchUsersMeta {
	total: number
	page: number
	limit: number
}

export interface FetchUsersUseCaseOutput {
	data: FetchUsersData[]
	pagination: FetchUsersMeta
}

@injectable()
export class FetchUsersUseCase {
	constructor(
		@inject(USER_TYPES.DAO.User)
		private readonly userDAO: UserDAO,
		@inject(SHARED_TYPES.Redis)
		private readonly cacheDB: CacheDB,
		@inject(SHARED_TYPES.Logger)
		private readonly logger: Logger,
	) {}

	public async execute(
		input: FetchUsersUseCaseInput,
	): Promise<FetchUsersUseCaseOutput> {
		const usersCacheResult = await this.fetchUsersFromCache(input)
		this.logger.info(this, { usersCacheResult })
		if (usersCacheResult) return usersCacheResult
		const usersData = await this.userDAO.fetchAndCountUsers(input)
		void this.saveUserDataToCache(input, usersData).catch((error) => {
			this.logger.warn(this, `Falha ao salvar cache de usuários: ${error}`)
		})
		return {
			data: usersData.usersData,
			pagination: {
				total: usersData.total,
				page: input.page,
				limit: input.limit,
			},
		}
	}

	private async fetchUsersFromCache(
		input: FetchUsersUseCaseInput,
	): Promise<FetchUsersUseCaseOutput | null> {
		return this.cacheDB.get<FetchUsersUseCaseOutput>(this.createCacheKey(input))
	}

	private createCacheKey(input: FetchUsersUseCaseInput): string {
		return `fetch-users:${input.page}:${input.limit}:${input.query ?? ""}`
	}

	private async saveUserDataToCache(
		input: FetchUsersUseCaseInput,
		usersData: FetchUsersOutput,
	): Promise<void> {
		this.cacheDB.set(
			this.createCacheKey(input),
			{
				data: usersData.usersData,
				pagination: {
					total: usersData.total,
					page: input.page,
					limit: input.limit,
				},
			},
			env.TTL,
		)
	}
}
```

- [ ] **Step 4: Atualizar o `FetchUsersController` para aceitar `query` no querystring**

Abrir `apps/backend/src/user/infra/controller/fetch-users.controller.ts` e aplicar as seguintes mudanças:

**4a. Adicionar `query` ao schema Zod (após a linha do `page`):**
```typescript
const fetchUsersRequestSchema = z.object({
	limit: z.coerce
		.number()
		.meta({ description: "Number of users per page", example: 10 }),
	page: z.coerce.number().meta({ description: "Page number", example: 1 }),
	query: z
		.string()
		.optional()
		.meta({ description: "Search by name or email", example: "joao" }),
})
```

**4b. Extrair `query` no callback e passar ao use case:**
```typescript
private async callback(req: FastifyRequest, reply: FastifyReply) {
  const parsedQueryParamsOrError = this.parseRequest(
    fetchUsersRequestSchema,
    req.query,
  )
  if (parsedQueryParamsOrError.isFailure()) {
    return this.createResponseError(parsedQueryParamsOrError)
  }

  const { limit, page, query } = parsedQueryParamsOrError.value
  const result = await this.fetchUsers.execute({
    limit,
    page,
    query,
  })
  const users = this.presenter(req.headers.accept).format(result.data)
  if (req.headers.accept === MimeType.CSV) {
    reply.header("Content-Type", MimeType.CSV)
    return ResponseFactory.OK({ body: users })
  }

  return ResponseFactory.OK({
    body: {
      users,
      pagination: result.pagination,
    },
  })
}
```

- [ ] **Step 5: Rodar os testes de business flow para confirmar que passam**

```bash
pnpm --filter backend test:business-flow -- -t "Buscar Usuários"
```

Resultado esperado: todos os testes de `Buscar Usuários` passando.

- [ ] **Step 6: Rodar todos os testes unitários para confirmar que nada quebrou**

```bash
pnpm --filter backend test:run
```

Resultado esperado: todos os testes passando.

- [ ] **Step 7: Verificar TypeScript e lint**

```bash
pnpm --filter backend tsc:check && pnpm --filter backend biome:fix
```

Resultado esperado: zero erros.

- [ ] **Step 8: Commit**

```bash
git add apps/backend/src/user/application/use-case/fetch-users.usecase.ts apps/backend/src/user/infra/controller/fetch-users.controller.ts apps/backend/src/user/infra/controller/fetch-users.business-flow-test.ts && git commit -m "feat(user): adiciona query param de busca no UseCase e Controller

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `FetchUsersUseCaseInput` tem `query?: string`
- Cache key inclui `query` (ex: `fetch-users:1:10:joao`; `fetch-users:1:10:` quando ausente)
- `GET /users?query=joao` retorna apenas usuários cujo nome ou email contém "joao"
- `GET /users` sem `query` retorna comportamento idêntico ao original
- Todos os testes de business flow e unitários passam
- `tsc:check` e `biome:fix` passam sem erros
