# Task 1: Estender UserRepository com busca por IDs e atualização em massa [FR-007, FR-009]

**Status:** DONE
**PRD:** ../prd/prd-bulk-user-status-actions.md
**Spec:** ../specs/bulk-user-status-actions-design.md
**Tier:** standard
**Depends on:** N/A

## Visão Geral

`BulkChangeUserStatusUseCase` (Task 2/3) precisa de dois métodos novos em
`UserRepository` para funcionar sem N+1 queries: `usersOfIds(ids)` para buscar todos os
candidatos de uma seleção em massa numa única chamada, e `updateManyStatus(ids, status)`
para persistir a mudança de status de todos os elegíveis numa única escrita. Esta task
adiciona os dois métodos à interface `UserRepository` e implementa ambos em
`InMemoryUserRepository` (com testes) e em `PrismaUserRepository` (sem teste de
integração automatizado nesta task — a cobertura de integração do Prisma vem dos testes
business-flow das Tasks 4/5, que exercitam a stack completa via HTTP).

## Arquivos

- Modify: `apps/backend/src/user/application/persistence/repository/user-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/prisma/prisma-user-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: a interface `UserRepository` e os dois novos métodos precisam de tipos precisos (`StatusTypes`, `Promise<User[]>`, `Promise<number>`) consistentes com o restante do domínio de usuário.
- `context7`: consultar a documentação do Prisma Client (`findMany`/`updateMany` com `where: { id: { in: [...] } }`) antes de escrever `PrismaUserRepository.usersOfIds`/`updateManyStatus`, para confirmar a assinatura correta da versão do Prisma usada no projeto.
- `vitest`: os testes de `InMemoryUserRepository` seguem a convenção `describe`/`test` já usada no arquivo de teste existente deste repositório.
- `test-antipatterns`: os testes devem exercitar o comportamento público do repositório (retorno de `usersOfIds`/`updateManyStatus`), nunca inspecionar o `Set` interno `users` diretamente.

## Passos

- **Step 1: Escrever o teste falho para `usersOfIds`**

Adicionar ao final do arquivo `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.test.ts` (mesmo arquivo, reaproveitando o helper `makeUser` já existente no topo do arquivo):

```ts
describe("usersOfIds", () => {
	test("retorna apenas os usuários cujos IDs estão na lista, ignorando IDs inexistentes", async () => {
		const sut = new InMemoryUserRepository()
		const userA = await makeUser({ id: "user-a", email: "a@example.com" })
		const userB = await makeUser({ id: "user-b", email: "b@example.com" })
		const userC = await makeUser({ id: "user-c", email: "c@example.com" })
		await sut.save(userA)
		await sut.save(userB)
		await sut.save(userC)

		const result = await sut.usersOfIds([
			"user-a",
			"user-c",
			"user-nonexistent",
		])

		expect(result).toHaveLength(2)
		expect(result.map((user) => user.id).sort()).toEqual(["user-a", "user-c"])
	})
})
```

- **Step 2: Rodar o teste para confirmar a falha**

Run: `pnpm --filter backend test:run -- -t "retorna apenas os usuários cujos IDs estão na lista"`
Expected: FAIL — erro de compilação TypeScript `Property 'usersOfIds' does not exist on type 'InMemoryUserRepository'` (o método ainda não existe).

- **Step 3: Adicionar `usersOfIds` à interface e implementar no InMemoryUserRepository**

Em `apps/backend/src/user/application/persistence/repository/user-repository.ts`, adicionar ao final da interface (mantendo os métodos existentes intactos):

```ts
export interface UserRepository {
	get(userQuery: UserQuery): Promise<User | null>
	userOfEmail(email: string): Promise<User | null>
	userOfGoogleId(googleId: string): Promise<User | null>
	userOfId(id: string): Promise<User | null>
	save(user: User): Promise<void>
	update(user: User): Promise<void>
	withTransaction<TX extends object>(object: TX): UserRepository
	usersOfIds(ids: string[]): Promise<User[]>
	updateManyStatus(ids: string[], status: StatusTypes): Promise<number>
}
```

(Adicionar o import `import type { StatusTypes } from "@/user/domain/value-object/status"` no topo do arquivo.)

Em `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.ts`, adicionar o método (a classe já expõe `public users = new ExtendedSet<User>()`, que tem `.filter()`/`.toArray()` — não usar `Array.from` para essa leitura, `ExtendedSet` já oferece a API funcional):

```ts
	public async usersOfIds(ids: string[]): Promise<User[]> {
		return this.users.filter((user) => ids.includes(user.id)).toArray()
	}
```

- **Step 4: Rodar o teste para confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "retorna apenas os usuários cujos IDs estão na lista"`
Expected: PASS

- **Step 5: Commit**

```bash
git add apps/backend/src/user/application/persistence/repository/user-repository.ts apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.ts apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.test.ts
git commit -m "feat: adiciona usersOfIds ao UserRepository e ao InMemoryUserRepository"
```

- **Step 6: Escrever o teste falho para `updateManyStatus` (idempotência)**

Adicionar ao mesmo arquivo de teste:

```ts
describe("updateManyStatus", () => {
	test("atualiza apenas os usuários com status diferente do alvo e é idempotente", async () => {
		const sut = new InMemoryUserRepository()
		const suspendedUser = await makeUser({
			id: "user-suspended",
			email: "suspended@example.com",
		})
		suspendedUser.suspend()
		const alreadyActivatedUser = await makeUser({
			id: "user-already-activated",
			email: "already@example.com",
		})
		await sut.save(suspendedUser)
		await sut.save(alreadyActivatedUser)

		const firstCallCount = await sut.updateManyStatus(
			["user-suspended", "user-already-activated"],
			"activated",
		)

		expect(firstCallCount).toBe(1)
		const updatedUser = await sut.userOfId("user-suspended")
		expect(updatedUser?.status).toBe("activated")

		const secondCallCount = await sut.updateManyStatus(
			["user-suspended", "user-already-activated"],
			"activated",
		)

		expect(secondCallCount).toBe(0)
	})
})
```

- **Step 7: Rodar o teste para confirmar a falha**

Run: `pnpm --filter backend test:run -- -t "atualiza apenas os usuários com status diferente do alvo"`
Expected: FAIL — `Property 'updateManyStatus' does not exist on type 'InMemoryUserRepository'`.

- **Step 8: Implementar `updateManyStatus` no InMemoryUserRepository**

Em `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.ts`, adicionar (reaproveitando o método `update()` já existente na mesma classe, e o mecanismo de transição de status já exposto pela entidade `User` via `activate()`/`suspend()`/`lock()` — sem inventar uma forma nova de mutar o status):

```ts
	public async updateManyStatus(
		ids: string[],
		status: StatusTypes,
	): Promise<number> {
		const targets = this.users
			.filter((user) => ids.includes(user.id) && user.status !== status)
			.toArray()
		for (const user of targets) {
			if (status === "activated") user.activate()
			else if (status === "suspended") user.suspend()
			else user.lock()
			await this.update(user)
		}
		return targets.length
	}
```

(Adicionar `import type { StatusTypes } from "@/user/domain/value-object/status"` no topo do arquivo.)

- **Step 9: Rodar o teste para confirmar que passa**

Run: `pnpm --filter backend test:run -- -t "atualiza apenas os usuários com status diferente do alvo"`
Expected: PASS

- **Step 10: Implementar os dois métodos em `PrismaUserRepository`**

Em `apps/backend/src/shared/infra/database/repository/prisma/prisma-user-repository.ts`, a classe já tem um método privado `restoreUser(userData: UserData): Promise<User>` usado por `get()`/`userOfId()`/`userOfEmail()`/`userOfGoogleId()` para hidratar `User` a partir de uma row do Prisma via `User.restore(...)` — reaproveitar exatamente esse método (não criar um mapper novo). Adicionar, dentro da classe, logo após `userOfGoogleId`:

```ts
	public async usersOfIds(ids: string[]): Promise<User[]> {
		const rows = await this.prisma.user.findMany({
			where: { id: { in: ids }, deleted_at: null },
		})
		return Promise.all(rows.map((row) => this.restoreUser(row)))
	}

	public async updateManyStatus(
		ids: string[],
		status: StatusTypes,
	): Promise<number> {
		const result = await this.prisma.user.updateMany({
			where: { id: { in: ids }, status: { not: status } },
			data: { status },
		})
		return result.count
	}
```

Não há teste de integração Prisma automatizado nesta task — a cobertura via HTTP real vem dos testes business-flow das Tasks 4 e 5, que exercitam a stack completa (controller → use case → `PrismaUserRepository` ou `InMemoryUserRepository`, conforme o ambiente de teste).

- **Step 11: Rodar a suíte completa de backend e o type-check para garantir que nada quebrou**

Run: `pnpm --filter backend test:run`
Expected: PASS (todos os testes, incluindo os dois novos)

Run: `pnpm --filter backend tsc:check`
Expected: sem erros de tipo (a interface `UserRepository` agora exige `usersOfIds`/`updateManyStatus` em toda implementação — `PrismaUserRepository` e `InMemoryUserRepository` já os implementam).

- **Step 12: Commit**

```bash
git add apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.ts apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.test.ts apps/backend/src/shared/infra/database/repository/prisma/prisma-user-repository.ts
git commit -m "feat: adiciona updateManyStatus ao UserRepository, InMemoryUserRepository e PrismaUserRepository"
```

## Critérios de Sucesso

- `UserRepository` expõe `usersOfIds(ids: string[]): Promise<User[]>` e `updateManyStatus(ids: string[], status: StatusTypes): Promise<number>` (FR-009: base para a revalidação de política que Task 2 fará em memória sobre os candidatos buscados aqui).
- `InMemoryUserRepository.usersOfIds` retorna somente os usuários existentes cujos IDs estão na lista informada, ignorando silenciosamente IDs inexistentes.
- `InMemoryUserRepository.updateManyStatus` atualiza somente os usuários cujo status difere do `status` alvo, retorna a contagem exata de atualizados, e é idempotente (uma segunda chamada idêntica retorna `0`) — base de FR-007 (escrita em lote).
- `PrismaUserRepository` implementa os mesmos dois métodos via `findMany`/`updateMany` do Prisma, mantendo a interface `UserRepository` satisfeita para as duas implementações.
- `pnpm --filter backend test:run` e `pnpm --filter backend tsc:check` passam sem erros.
