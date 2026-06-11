# Task 1: Backend DAO — Interface + UserDAOMemory

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/busca-usuarios-admin-design.md`

## Visão Geral

Adicionar campo `query?: string` à interface `FetchUsersInput` e atualizar `UserDAOMemory.fetchAndCountUsers()` para filtrar usuários em memória por nome ou email (case-insensitive, substring match). Incluir testes unitários no use case test existente cobrindo os novos cenários de busca.

## Arquivos

- Modify: `apps/backend/src/user/application/persistence/dao/user-dao.ts`
- Modify: `apps/backend/src/shared/infra/database/dao/in-memory/user-dao-memory.ts`
- Modify: `apps/backend/src/user/application/use-case/fetch-users.usecase.test.ts`

## Conformidade com as Competências Padrão

- `test-driven-development`: escrever testes que falham antes de implementar
- `no-workarounds`: implementar filtro no DAO, não na camada de uso

## Passos

- [ ] **Step 1: Escrever os testes que falham**

Abrir `apps/backend/src/user/application/use-case/fetch-users.usecase.test.ts` e adicionar os seguintes testes ao final do `describe("FetchUsersUseCase")`:

```typescript
test("Deve filtrar usuários por nome parcial (case-insensitive)", async () => {
  userDAO.createFakeUser({ id: "u-joao", name: "João Silva", email: "joao@example.com" })
  userDAO.createFakeUser({ id: "u-maria", name: "Maria Santos", email: "maria@example.com" })
  const input: FetchUsersUseCaseInput = { page: 1, limit: 10, query: "joão" }
  const result = await sut.execute(input)
  expect(result.data).toHaveLength(1)
  expect(result.data[0].id).toBe("u-joao")
  expect(result.pagination.total).toBe(1)
})

test("Deve filtrar usuários por email parcial", async () => {
  userDAO.createFakeUser({ id: "u-joao", name: "João Silva", email: "joao@example.com" })
  userDAO.createFakeUser({ id: "u-maria", name: "Maria Santos", email: "maria@example.com" })
  const input: FetchUsersUseCaseInput = { page: 1, limit: 10, query: "maria@" }
  const result = await sut.execute(input)
  expect(result.data).toHaveLength(1)
  expect(result.data[0].id).toBe("u-maria")
  expect(result.pagination.total).toBe(1)
})

test("Deve retornar todos os usuários quando query está ausente", async () => {
  userDAO.bulkCreateFakeUsers(5)
  const input: FetchUsersUseCaseInput = { page: 1, limit: 10 }
  const result = await sut.execute(input)
  expect(result.data).toHaveLength(5)
  expect(result.pagination.total).toBe(5)
})

test("Deve realizar busca case-insensitive (query em maiúsculas)", async () => {
  userDAO.createFakeUser({ id: "u-joao", name: "João Silva", email: "joao@example.com" })
  const input: FetchUsersUseCaseInput = { page: 1, limit: 10, query: "JOÃO" }
  const result = await sut.execute(input)
  expect(result.data).toHaveLength(1)
  expect(result.data[0].id).toBe("u-joao")
})

test("Deve retornar lista vazia quando nenhum usuário corresponde à query", async () => {
  userDAO.createFakeUser({ id: "u-joao", name: "João Silva", email: "joao@example.com" })
  const input: FetchUsersUseCaseInput = { page: 1, limit: 10, query: "xyz_sem_match" }
  const result = await sut.execute(input)
  expect(result.data).toHaveLength(0)
  expect(result.pagination.total).toBe(0)
})

test("Deve paginar corretamente os resultados filtrados", async () => {
  for (let i = 1; i <= 15; i++) {
    userDAO.createFakeUser({ id: `u-silva-${i}`, name: `Silva ${i}`, email: `silva${i}@example.com` })
  }
  userDAO.createFakeUser({ id: "u-outro", name: "Outro Nome", email: "outro@example.com" })
  const input: FetchUsersUseCaseInput = { page: 1, limit: 10, query: "silva" }
  const result = await sut.execute(input)
  expect(result.data).toHaveLength(10)
  expect(result.pagination.total).toBe(15)

  const page2 = await sut.execute({ page: 2, limit: 10, query: "silva" })
  expect(page2.data).toHaveLength(5)
  expect(page2.pagination.total).toBe(15)
})
```

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm --filter backend test:run -- -t "Deve filtrar usuários por nome parcial"
```

Resultado esperado: `FAIL` com erro de tipo (TypeScript não aceita `query` em `FetchUsersUseCaseInput` ainda).

- [ ] **Step 3: Adicionar `query?: string` à interface `FetchUsersInput`**

Abrir `apps/backend/src/user/application/persistence/dao/user-dao.ts` e alterar:

```typescript
import type { RoleTypes } from "@/user/domain/value-object/role"
import type { StatusTypes } from "@/user/domain/value-object/status"

export interface FetchUsersInput {
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

export interface FetchUsersOutput {
	usersData: FetchUsersData[]
	total: number
}

export interface UserDAO {
	fetchAndCountUsers(input: FetchUsersInput): Promise<FetchUsersOutput>
}
```

- [ ] **Step 4: Atualizar `UserDAOMemory.fetchAndCountUsers()` para filtrar por query**

Abrir `apps/backend/src/shared/infra/database/dao/in-memory/user-dao-memory.ts` e substituir o método `fetchAndCountUsers`:

```typescript
public async fetchAndCountUsers(
  input: FetchUsersInput,
): Promise<FetchUsersOutput> {
  const allUsers = this.usersData.toArray()
  const filtered = input.query
    ? allUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(input.query!.toLowerCase()) ||
          u.email.toLowerCase().includes(input.query!.toLowerCase()),
      )
    : allUsers
  const usersData = filtered.slice(
    (input.page - 1) * input.limit,
    input.page * input.limit,
  )
  return {
    usersData,
    total: filtered.length,
  }
}
```

- [ ] **Step 5: Rodar os testes para confirmar que passam**

```bash
pnpm --filter backend test:run -- -t "FetchUsersUseCase"
```

Resultado esperado: todos os testes do `FetchUsersUseCase` passando, incluindo os novos.

- [ ] **Step 6: Verificar TypeScript e lint**

```bash
pnpm --filter backend tsc:check && pnpm --filter backend biome:fix
```

Resultado esperado: zero erros.

- [ ] **Step 7: Commit**

```bash
cd apps/backend && git add src/user/application/persistence/dao/user-dao.ts src/shared/infra/database/dao/in-memory/user-dao-memory.ts src/user/application/use-case/fetch-users.usecase.test.ts && git commit -m "feat(user): adiciona suporte a busca por nome/email no DAO e UserDAOMemory

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `FetchUsersInput` tem `query?: string`
- `UserDAOMemory.fetchAndCountUsers()` filtra por nome e email (case-insensitive, substring)
- `total` retornado reflete o número de usuários filtrados, não o total geral
- Paginação sobre resultados filtrados funciona corretamente
- Todos os testes unitários do `FetchUsersUseCase` passam
- `tsc:check` e `biome:fix` passam sem erros
