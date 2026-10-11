# Task 4: Repositório e DAO de usuário no Mongo com suíte de contrato compartilhada [FR-004, FR-005, FR-006, FR-012, FR-019, FR-020]

**Status:** DONE

**PRD:** `../prd/prd-mongodb-coexistence.md`

**Spec:** `../specs/mongodb-coexistence-design.md`

**Tier:** standard

## Visão Geral

Esta task entrega `MongoUserRepository` e `MongoUserDao` com o mesmo contrato dos adaptadores Prisma: exclusão lógica por `deleted_at`, ids UUID como `_id`, listagem filtrada e paginada, estatísticas e participação em transações por `withTransaction(session)`. Ela também cria a suíte de contrato compartilhada do usuário (repositório e DAO) e os utilitários de teste que as demais entidades reutilizam, e a invoca contra in-memory, Prisma e Mongo para provar que os três lados se comportam igual.

## Arquivos

- Create: `apps/backend/src/shared/infra/database/repository/mongo/mongo-user-repository.ts`
- Create: `apps/backend/src/shared/infra/database/repository/mongo/escape-regexp.ts`
- Create: `apps/backend/src/shared/infra/database/dao/mongo/mongo-user-dao.ts`
- Create: `apps/backend/test/repository-contract/id-recorder.ts`
- Create: `apps/backend/test/repository-contract/user-repository-contract.ts`
- Create: `apps/backend/test/repository-contract/user-dao-contract.ts`
- Create: `apps/backend/test/mongo/delete-documents-referencing.ts`
- Test: `apps/backend/src/shared/infra/database/repository/mongo/escape-regexp.test.ts`
- Test: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.contract.test.ts`
- Test: `apps/backend/src/shared/infra/database/repository/prisma/prisma-user-repository.contract.integration-test.ts`
- Test: `apps/backend/src/shared/infra/database/repository/mongo/mongo-user-repository.integration-test.ts`
- Test: `apps/backend/src/shared/infra/database/dao/in-memory/user-dao-memory.contract.test.ts`
- Test: `apps/backend/src/shared/infra/database/dao/prisma/prisma-user-dao.contract.integration-test.ts`
- Test: `apps/backend/src/shared/infra/database/dao/mongo/mongo-user-dao.integration-test.ts`

## Interfaces

- **Consome:**
  - `class MongoConnection { collection<T extends Document>(name: string): Collection<T> }`, `COLLECTIONS.USERS`, `COLLECTIONS.CHECK_INS` de `@/shared/infra/database/connection/mongo/mongo-connection` (task-02)
  - `isDuplicateKeyError(error: unknown): error is MongoServerError` e `duplicateKeyFields(error: MongoServerError): string[]` de `@/shared/infra/database/connection/mongo/mongo-duplicate-key` (task-02)
  - `createTestMongoConnection(dbName?: string): Promise<MongoConnection>` de `test/mongo/create-test-mongo-connection` (task-02)
  - `SHARED_TYPES.Mongo.Connection` de `@/shared/infra/ioc/types` (task-02)
  - `MongoUnitOfWork.isClientSession(obj: unknown): obj is ClientSession` e `new MongoUnitOfWork(connection: MongoConnection)` com `runTransaction<T>(callback: Callback<T>): Promise<T>` de `@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work` (task-03)
  - `sessionOptions(session: ClientSession | undefined): { session?: ClientSession }` de `@/shared/infra/database/repository/unit-of-work/mongo-session` (task-03)
- **Produz:**
  - `class MongoUserRepository implements UserRepository` (`@injectable()`, construtor `(connection: MongoConnection)`), `type UserDocument` em `@/shared/infra/database/repository/mongo/mongo-user-repository`
  - `class MongoUserDao implements UserDAO` (`@injectable()`, construtor `(connection: MongoConnection)`) em `@/shared/infra/database/dao/mongo/mongo-user-dao`
  - `escapeRegExp(text: string): string` em `@/shared/infra/database/repository/mongo/escape-regexp`
  - `class IdRecorder { newId(): string; get ids(): readonly string[] }` em `test/repository-contract/id-recorder`
  - `describeUserRepositoryContract(name: string, factory: () => Promise<UserRepositoryContractContext>): void` com `interface UserRepositoryContractContext { repository: UserRepository; newId(): string; cleanup(): Promise<void> }` em `test/repository-contract/user-repository-contract`
  - `describeUserDaoContract(name: string, factory: () => Promise<UserDaoContractContext>): void` com `interface UserDaoContractContext { dao: UserDAO; seed(users: DaoSeedUser[]): Promise<void>; newId(): string; cleanup(): Promise<void> }` e `interface DaoSeedUser { id: string; name: string; email: string; role: RoleTypes; status: StatusTypes; createdAt: Date; isSuperAdmin: boolean; deletedAt: Date | null }` em `test/repository-contract/user-dao-contract`
  - `deleteDocumentsReferencing(connection: MongoConnection, ids: readonly string[], targets: ReadonlyArray<{ collection: string; fields: readonly string[] }>): Promise<void>` em `test/mongo/delete-documents-referencing`
  - Convenção dos documentos de usuário (colunas Prisma em snake_case, `_id` = UUID): `_id`, `name`, `email`, `password_hash`, `google_id`, `created_at`, `role`, `updated_at`, `status`, `billing_customer_id`, `is_super_admin`, `deleted_at`

### Skills a invocar

- `typescript-advanced`: `UserDocument` como `type` alias (compatível com `Document`), filtros tipados `Filter<UserDocument>` e mapeamento de `UserQuery.fields` sem `any`.
- `no-workarounds`: nada de `as any` no `get(UserQuery)`; um campo de `UserQuery` sem coluna correspondente deve falhar de forma explícita, não ser ignorado.
- `test-antipatterns`: o contrato roda contra bancos reais (Postgres e Mongo) e contra o in-memory real; cada teste limpa só os ids que criou e nenhum teste testa o comportamento de um mock.
- `context7`: ajustar `find().sort().skip().limit()`, `updateMany` e `$regex` com `$options: "i"` à API do driver `mongodb` instalado.

## Passos

- **Step 1: Write the failing tests (shared helpers and contracts)**

`apps/backend/test/repository-contract/id-recorder.ts`:

```ts
import { randomUUID } from "node:crypto"

export class IdRecorder {
	private readonly recorded: string[] = []

	public newId(): string {
		const id = randomUUID()
		this.recorded.push(id)
		return id
	}

	public get ids(): readonly string[] {
		return this.recorded
	}
}
```

`apps/backend/test/mongo/delete-documents-referencing.ts`:

```ts
import type { Document } from "mongodb"
import type { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"

export interface CleanupTarget {
	collection: string
	fields: readonly string[]
}

export async function deleteDocumentsReferencing(
	connection: MongoConnection,
	ids: readonly string[],
	targets: readonly CleanupTarget[],
): Promise<void> {
	if (ids.length === 0) return
	for (const target of targets) {
		await connection.collection<Document>(target.collection).deleteMany({
			$or: target.fields.map((field) => ({ [field]: { $in: [...ids] } })),
		})
	}
}
```

`apps/backend/test/repository-contract/user-repository-contract.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { UserQuery } from "@/user/application/persistence/repository/user-query"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository"
import { User } from "@/user/domain/user"

export interface UserRepositoryContractContext {
	repository: UserRepository
	newId(): string
	cleanup(): Promise<void>
}

type UserProps = Parameters<typeof User.restore>[0]

export function describeUserRepositoryContract(
	name: string,
	factory: () => Promise<UserRepositoryContractContext>,
): void {
	describe(`UserRepository contract (${name})`, () => {
		let context: UserRepositoryContractContext

		beforeEach(async () => {
			context = await factory()
		})

		afterEach(async () => {
			await context.cleanup()
		})

		function buildUser(overrides: Partial<UserProps> = {}): User {
			const id = overrides.id ?? context.newId()
			return User.restore({
				id,
				name: "Contract User",
				email: `${id}@contract.test`,
				password: "hashed-password",
				createdAt: new Date("2026-01-10T12:00:00.000Z"),
				updatedAt: new Date("2026-01-10T12:00:00.000Z"),
				role: "MEMBER",
				status: "activated",
				isSuperAdmin: false,
				...overrides,
			})
		}

		it("saves a user and finds it by id, e-mail and Google id", async () => {
			const user = buildUser({ googleId: `google-${context.newId()}` })
			await context.repository.save(user)

			const byId = await context.repository.userOfId(user.id)
			const byEmail = await context.repository.userOfEmail(user.email)
			const byGoogleId = await context.repository.userOfGoogleId(
				user.googleId ?? "",
			)

			expect(byId?.id).toBe(user.id)
			expect(byId?.email).toBe(user.email)
			expect(byId?.role).toBe("MEMBER")
			expect(byId?.status).toBe("activated")
			expect(byId?.createdAt.toISOString()).toBe("2026-01-10T12:00:00.000Z")
			expect(byEmail?.id).toBe(user.id)
			expect(byGoogleId?.id).toBe(user.id)
		})

		it("returns null for an unknown id, e-mail and Google id", async () => {
			const unknown = context.newId()
			expect(await context.repository.userOfId(unknown)).toBeNull()
			expect(
				await context.repository.userOfEmail(`${unknown}@contract.test`),
			).toBeNull()
			expect(await context.repository.userOfGoogleId(unknown)).toBeNull()
		})

		it("FR-006: hides a soft-deleted user from every lookup", async () => {
			const user = buildUser({
				googleId: `google-${context.newId()}`,
				deletedAt: new Date("2026-02-01T00:00:00.000Z"),
			})
			await context.repository.save(user)

			expect(await context.repository.userOfId(user.id)).toBeNull()
			expect(await context.repository.userOfEmail(user.email)).toBeNull()
			expect(
				await context.repository.userOfGoogleId(user.googleId ?? ""),
			).toBeNull()
			expect(await context.repository.usersOfIds([user.id])).toEqual([])
		})

		it("update persists the changed profile fields", async () => {
			const id = context.newId()
			await context.repository.save(buildUser({ id }))

			await context.repository.update(
				buildUser({ id, name: "Renamed User", status: "suspended" }),
			)

			const found = await context.repository.userOfId(id)
			expect(found?.name).toBe("Renamed User")
			expect(found?.status).toBe("suspended")
		})

		it("usersOfIds returns only the stored, non-deleted users", async () => {
			const first = buildUser()
			const second = buildUser()
			const deleted = buildUser({ deletedAt: new Date("2026-02-01T00:00:00.000Z") })
			await context.repository.save(first)
			await context.repository.save(second)
			await context.repository.save(deleted)

			const found = await context.repository.usersOfIds([
				first.id,
				second.id,
				deleted.id,
				context.newId(),
			])

			expect(found.map((user) => user.id).sort()).toEqual(
				[first.id, second.id].sort(),
			)
		})

		it("updateManyStatus changes only users not already in the target status and returns how many changed", async () => {
			const active = buildUser({ status: "activated" })
			const alreadySuspended = buildUser({ status: "suspended" })
			await context.repository.save(active)
			await context.repository.save(alreadySuspended)

			const changed = await context.repository.updateManyStatus(
				[active.id, alreadySuspended.id],
				"suspended",
			)

			expect(changed).toBe(1)
			expect((await context.repository.userOfId(active.id))?.status).toBe(
				"suspended",
			)
			expect(
				(await context.repository.userOfId(alreadySuspended.id))?.status,
			).toBe("suspended")
		})

		it("get finds a user by the fields of a UserQuery", async () => {
			const user = buildUser()
			await context.repository.save(user)

			const found = await context.repository.get(
				UserQuery.from({ email: user.email }).addField("email"),
			)

			expect(found?.id).toBe(user.id)
		})
	})
}
```

`apps/backend/test/repository-contract/user-dao-contract.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { UserDAO } from "@/user/application/persistence/dao/user-dao"
import type { RoleTypes } from "@/user/domain/value-object/role"
import type { StatusTypes } from "@/user/domain/value-object/status"

export interface DaoSeedUser {
	id: string
	name: string
	email: string
	role: RoleTypes
	status: StatusTypes
	createdAt: Date
	isSuperAdmin: boolean
	deletedAt: Date | null
}

export interface UserDaoContractContext {
	dao: UserDAO
	seed(users: DaoSeedUser[]): Promise<void>
	newId(): string
	cleanup(): Promise<void>
}

export function describeUserDaoContract(
	name: string,
	factory: () => Promise<UserDaoContractContext>,
): void {
	describe(`UserDAO contract (${name})`, () => {
		let context: UserDaoContractContext
		let token: string
		let alice: DaoSeedUser
		let bob: DaoSeedUser
		let carol: DaoSeedUser
		let dave: DaoSeedUser

		function seedUser(
			label: string,
			overrides: Partial<DaoSeedUser>,
		): DaoSeedUser {
			const id = context.newId()
			return {
				id,
				name: `${token} ${label}`,
				email: `${label.toLowerCase()}-${token}@dao.test`,
				role: "MEMBER",
				status: "activated",
				createdAt: new Date("2026-03-01T10:00:00.000Z"),
				isSuperAdmin: false,
				deletedAt: null,
				...overrides,
			}
		}

		beforeEach(async () => {
			context = await factory()
			token = context.newId().slice(0, 8)
			alice = seedUser("Alice", {
				role: "ADMIN",
				createdAt: new Date("2026-03-01T10:00:00.000Z"),
			})
			bob = seedUser("Bob", { createdAt: new Date("2026-03-02T10:00:00.000Z") })
			carol = seedUser("Carol", {
				status: "suspended",
				createdAt: new Date("2026-03-03T10:00:00.000Z"),
			})
			dave = seedUser("Dave", {
				deletedAt: new Date("2026-04-01T00:00:00.000Z"),
			})
		})

		afterEach(async () => {
			await context.cleanup()
		})

		it("filters by a case-insensitive text query on name and e-mail, excluding deleted users", async () => {
			await context.seed([alice, bob, carol, dave])

			const output = await context.dao.fetchAndCountUsers({
				page: 1,
				limit: 10,
				query: token.toUpperCase(),
			})

			expect(output.total).toBe(3)
			expect(output.usersData.map((user) => user.id).sort()).toEqual(
				[alice.id, bob.id, carol.id].sort(),
			)
		})

		it("filters by role", async () => {
			await context.seed([alice, bob, carol])

			const output = await context.dao.fetchAndCountUsers({
				page: 1,
				limit: 10,
				query: token,
				role: "ADMIN",
			})

			expect(output.usersData.map((user) => user.id)).toEqual([alice.id])
			expect(output.total).toBe(1)
		})

		it("maps status active to activated and inactive to suspended", async () => {
			await context.seed([alice, bob, carol])

			const active = await context.dao.fetchAndCountUsers({
				page: 1,
				limit: 10,
				query: token,
				status: "active",
			})
			const inactive = await context.dao.fetchAndCountUsers({
				page: 1,
				limit: 10,
				query: token,
				status: "inactive",
			})

			expect(active.usersData.map((user) => user.id).sort()).toEqual(
				[alice.id, bob.id].sort(),
			)
			expect(inactive.usersData.map((user) => user.id)).toEqual([carol.id])
		})

		it("FR-012: paginates with limit and page and reports the total of the whole filter", async () => {
			await context.seed([alice, bob, carol])

			const firstPage = await context.dao.fetchAndCountUsers({
				page: 1,
				limit: 2,
				query: token,
			})
			const secondPage = await context.dao.fetchAndCountUsers({
				page: 2,
				limit: 2,
				query: token,
			})

			expect(firstPage.usersData).toHaveLength(2)
			expect(secondPage.usersData).toHaveLength(1)
			expect(firstPage.total).toBe(3)
			expect(secondPage.total).toBe(3)
			const returnedIds = [...firstPage.usersData, ...secondPage.usersData]
				.map((user) => user.id)
				.sort()
			expect(returnedIds).toEqual([alice.id, bob.id, carol.id].sort())
		})

		it("returns the user fields the API needs", async () => {
			await context.seed([bob])

			const output = await context.dao.fetchAndCountUsers({
				page: 1,
				limit: 10,
				query: token,
			})

			expect(output.usersData).toEqual([
				{
					id: bob.id,
					email: bob.email,
					name: bob.name,
					role: "MEMBER",
					status: "activated",
					isSuperAdmin: false,
					createdAt: "2026-03-02T10:00:00.000Z",
				},
			])
		})

		it("countUserStats counts the seeded users on top of the existing totals", async () => {
			const before = await context.dao.countUserStats()
			await context.seed([alice, bob, carol, dave])

			const after = await context.dao.countUserStats()

			expect(after.total - before.total).toBe(3)
			expect(after.members - before.members).toBe(2)
			expect(after.admins - before.admins).toBe(1)
			expect(after.active - before.active).toBe(2)
			expect(after.inactive - before.inactive).toBe(1)
		})
	})
}
```

`apps/backend/src/shared/infra/database/repository/mongo/escape-regexp.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { escapeRegExp } from "./escape-regexp"

describe("escapeRegExp", () => {
	it("escapes every regular expression metacharacter", () => {
		expect(escapeRegExp("a.b*c")).toBe("a\\.b\\*c")
	})

	it("produces a pattern that matches the original text literally", () => {
		const text = "(x)+[y]?"
		expect(new RegExp(escapeRegExp(text)).test(text)).toBe(true)
		expect(new RegExp(escapeRegExp("a.b")).test("aXb")).toBe(false)
	})
})
```

Invocadores do contrato (in-memory, unit):

`apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository.contract.test.ts`:

```ts
import { describeUserRepositoryContract } from "test/repository-contract/user-repository-contract"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { InMemoryUserRepository } from "./in-memory-user-repository"

describeUserRepositoryContract("in-memory", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new InMemoryUserRepository(),
		newId: () => recorder.newId(),
		cleanup: async () => {},
	}
})
```

`apps/backend/src/shared/infra/database/dao/in-memory/user-dao-memory.contract.test.ts`:

```ts
import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeUserDaoContract } from "test/repository-contract/user-dao-contract"
import { UserDAOMemory } from "./user-dao-memory"

describeUserDaoContract("in-memory", async () => {
	const dao = new UserDAOMemory()
	const recorder = new IdRecorder()
	return {
		dao,
		newId: () => recorder.newId(),
		seed: async (users) => {
			for (const user of users) {
				dao.createFakeUser({
					id: user.id,
					name: user.name,
					email: user.email,
					role: user.role,
					status: user.status,
					createdAt: user.createdAt.toISOString(),
					isSuperAdmin: user.isSuperAdmin,
					deletedAt: user.deletedAt ? user.deletedAt.toISOString() : null,
				})
			}
		},
		cleanup: async () => dao.clear(),
	}
})
```

Invocadores Prisma (integração, Postgres real):

`apps/backend/src/shared/infra/database/repository/prisma/prisma-user-repository.contract.integration-test.ts`:

```ts
import { afterAll } from "vitest"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeUserRepositoryContract } from "test/repository-contract/user-repository-contract"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaUserRepository } from "./prisma-user-repository"

afterAll(async () => {
	await prismaClient.$disconnect()
})

describeUserRepositoryContract("prisma", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new PrismaUserRepository(prismaClient),
		newId: () => recorder.newId(),
		cleanup: async () => {
			await prismaClient.user.deleteMany({
				where: { id: { in: [...recorder.ids] } },
			})
		},
	}
})
```

`apps/backend/src/shared/infra/database/dao/prisma/prisma-user-dao.contract.integration-test.ts`:

```ts
import { afterAll } from "vitest"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeUserDaoContract } from "test/repository-contract/user-dao-contract"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaUserDAO } from "./prisma-user-dao"

afterAll(async () => {
	await prismaClient.$disconnect()
})

describeUserDaoContract("prisma", async () => {
	const recorder = new IdRecorder()
	return {
		dao: new PrismaUserDAO(prismaClient),
		newId: () => recorder.newId(),
		seed: async (users) => {
			await prismaClient.user.createMany({
				data: users.map((user) => ({
					id: user.id,
					name: user.name,
					email: user.email,
					role: user.role,
					status: user.status,
					created_at: user.createdAt,
					is_super_admin: user.isSuperAdmin,
					deleted_at: user.deletedAt,
				})),
			})
		},
		cleanup: async () => {
			await prismaClient.user.deleteMany({
				where: { id: { in: [...recorder.ids] } },
			})
		},
	}
})
```

Invocador e testes específicos do Mongo (repositório):

`apps/backend/src/shared/infra/database/repository/mongo/mongo-user-repository.integration-test.ts`:

```ts
import { randomUUID } from "node:crypto"
import type { Document } from "mongodb"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeUserRepositoryContract } from "test/repository-contract/user-repository-contract"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import {
	duplicateKeyFields,
	isDuplicateKeyError,
} from "@/shared/infra/database/connection/mongo/mongo-duplicate-key"
import { MongoUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { User } from "@/user/domain/user"
import { MongoUserRepository } from "./mongo-user-repository"

type UserProps = Parameters<typeof User.restore>[0]

async function duplicateFieldsOf(operation: Promise<unknown>): Promise<string[]> {
	const error = await operation.then(
		() => undefined,
		(caught: unknown) => caught,
	)
	if (!isDuplicateKeyError(error)) throw new Error("expected a duplicate key error")
	return duplicateKeyFields(error)
}

describe("MongoUserRepository", () => {
	let connection: MongoConnection
	let repository: MongoUserRepository
	const recorder = new IdRecorder()

	function buildUser(overrides: Partial<UserProps> = {}): User {
		const id = overrides.id ?? recorder.newId()
		return User.restore({
			id,
			name: "Mongo User",
			email: `${id}@mongo.test`,
			password: "hashed-password",
			createdAt: new Date("2026-01-10T12:00:00.000Z"),
			updatedAt: new Date("2026-01-10T12:00:00.000Z"),
			role: "MEMBER",
			status: "activated",
			isSuperAdmin: false,
			...overrides,
		})
	}

	async function cleanup(): Promise<void> {
		await deleteDocumentsReferencing(connection, recorder.ids, [
			{ collection: COLLECTIONS.USERS, fields: ["_id"] },
		])
	}

	beforeAll(async () => {
		connection = await createTestMongoConnection()
		repository = new MongoUserRepository(connection)
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	describeUserRepositoryContract("mongo", async () => {
		const contractRecorder = new IdRecorder()
		return {
			repository: new MongoUserRepository(connection),
			newId: () => contractRecorder.newId(),
			cleanup: () =>
				deleteDocumentsReferencing(connection, contractRecorder.ids, [
					{ collection: COLLECTIONS.USERS, fields: ["_id"] },
				]),
		}
	})

	describe("mongo specifics", () => {
		afterEach(cleanup)

		it("INV-02: the unique index rejects a second user with the same e-mail", async () => {
			const first = buildUser({ email: `${randomUUID()}@mongo.test` })
			await repository.save(first)
			const second = buildUser({ email: first.email })

			expect(await duplicateFieldsOf(repository.save(second))).toEqual(["email"])
		})

		it("INV-02: the unique index rejects a second user with the same Google id", async () => {
			const googleId = `google-${randomUUID()}`
			await repository.save(buildUser({ googleId }))

			expect(
				await duplicateFieldsOf(repository.save(buildUser({ googleId }))),
			).toEqual(["google_id"])
		})

		it("INV-02: the unique index rejects a second user with the same billing customer id", async () => {
			const billingCustomerId = `cus_${randomUUID()}`
			await repository.save(buildUser({ billingCustomerId }))

			expect(
				await duplicateFieldsOf(repository.save(buildUser({ billingCustomerId }))),
			).toEqual(["billing_customer_id"])
		})

		it("users without Google id or billing customer id do not collide on the partial unique indexes", async () => {
			await repository.save(buildUser())
			await expect(repository.save(buildUser())).resolves.toBeUndefined()
		})

		it("AC-02: a repeated e-mail is found by the lookup the use case runs first, and the index blocks the second insert", async () => {
			const first = buildUser()
			await repository.save(first)

			const existing = await repository.userOfEmail(first.email)
			const failedFields = await duplicateFieldsOf(
				repository.save(buildUser({ email: first.email })),
			)

			expect(existing?.id).toBe(first.id)
			expect(failedFields).toEqual(["email"])
		})

		it("a soft-deleted user keeps its e-mail reserved, as the Prisma unique column does", async () => {
			const deleted = buildUser({
				deletedAt: new Date("2026-02-01T00:00:00.000Z"),
			})
			await repository.save(deleted)

			expect(await repository.userOfEmail(deleted.email)).toBeNull()
			expect(
				await duplicateFieldsOf(repository.save(buildUser({ email: deleted.email }))),
			).toEqual(["email"])
		})

		it("stores the document with the Prisma column names and the UUID as _id", async () => {
			const user = buildUser({ googleId: `google-${randomUUID()}` })
			await repository.save(user)

			const document = await connection
				.collection<Document>(COLLECTIONS.USERS)
				.findOne({ _id: user.id })

			expect(document).toMatchObject({
				_id: user.id,
				name: "Mongo User",
				email: user.email,
				password_hash: "hashed-password",
				google_id: user.googleId,
				role: "MEMBER",
				status: "activated",
				billing_customer_id: null,
				is_super_admin: false,
				deleted_at: null,
			})
			expect(document?.created_at).toBeInstanceOf(Date)
		})

		it("withTransaction rejects an object that is not a unit of work session", () => {
			expect(() => repository.withTransaction({})).toThrow(
				InvalidTransactionInstance,
			)
		})

		it("withTransaction writes inside the unit of work and rolls back when it fails", async () => {
			const unitOfWork = new MongoUnitOfWork(connection)
			const user = buildUser()

			await expect(
				unitOfWork.runTransaction(async (tx) => {
					await repository.withTransaction(tx).save(user)
					throw new Error("rollback")
				}),
			).rejects.toThrow("rollback")

			expect(await repository.userOfId(user.id)).toBeNull()
		})
	})
})
```

Invocador e teste específico do Mongo (DAO):

`apps/backend/src/shared/infra/database/dao/mongo/mongo-user-dao.integration-test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeUserDaoContract } from "test/repository-contract/user-dao-contract"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import type { UserDocument } from "@/shared/infra/database/repository/mongo/mongo-user-repository"
import { MongoUserDao } from "./mongo-user-dao"

describe("MongoUserDao", () => {
	let connection: MongoConnection

	function toDocument(user: {
		id: string
		name: string
		email: string
		role: UserDocument["role"]
		status: UserDocument["status"]
		createdAt: Date
		isSuperAdmin: boolean
		deletedAt: Date | null
	}): UserDocument {
		return {
			_id: user.id,
			name: user.name,
			email: user.email,
			password_hash: null,
			google_id: null,
			created_at: user.createdAt,
			role: user.role,
			updated_at: user.createdAt,
			status: user.status,
			billing_customer_id: null,
			is_super_admin: user.isSuperAdmin,
			deleted_at: user.deletedAt,
		}
	}

	beforeAll(async () => {
		connection = await createTestMongoConnection()
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	describeUserDaoContract("mongo", async () => {
		const recorder = new IdRecorder()
		return {
			dao: new MongoUserDao(connection),
			newId: () => recorder.newId(),
			seed: async (users) => {
				await connection
					.collection<UserDocument>(COLLECTIONS.USERS)
					.insertMany(users.map(toDocument))
			},
			cleanup: () =>
				deleteDocumentsReferencing(connection, recorder.ids, [
					{ collection: COLLECTIONS.USERS, fields: ["_id"] },
				]),
		}
	})

	describe("mongo specifics", () => {
		it("treats regular expression metacharacters in the query as literal text", async () => {
			const recorder = new IdRecorder()
			const token = recorder.newId().slice(0, 8)
			const literal = recorder.newId()
			const lookalike = recorder.newId()
			const base = {
				role: "MEMBER" as const,
				status: "activated" as const,
				createdAt: new Date("2026-03-01T10:00:00.000Z"),
				isSuperAdmin: false,
				deletedAt: null,
			}
			await connection.collection<UserDocument>(COLLECTIONS.USERS).insertMany([
				toDocument({ ...base, id: literal, name: `${token} a.b`, email: `${literal}@dao.test` }),
				toDocument({ ...base, id: lookalike, name: `${token} aXb`, email: `${lookalike}@dao.test` }),
			])
			try {
				const output = await new MongoUserDao(connection).fetchAndCountUsers({
					page: 1,
					limit: 10,
					query: `${token} a.b`,
				})
				expect(output.usersData.map((user) => user.id)).toEqual([literal])
			} finally {
				await deleteDocumentsReferencing(connection, recorder.ids, [
					{ collection: COLLECTIONS.USERS, fields: ["_id"] },
				])
			}
		})
	})
})
```

- **Step 2: Run tests to verify they fail**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/repository/mongo/escape-regexp.test.ts`
Expected: FAIL with "Failed to resolve import "./escape-regexp""

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/repository/in-memory/in-memory-user-repository.contract.test.ts`
Expected: se o `InMemoryUserRepository` já cumpre o contrato, PASS (7 testes); qualquer falha aponta divergência real do in-memory e deve ser corrigida no in-memory, nunca relaxando o contrato.

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/dao/in-memory/user-dao-memory.contract.test.ts`
Expected: se o `UserDAOMemory` já cumpre o contrato, PASS (6 testes); divergências são corrigidas no in-memory.

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/prisma/prisma-user-repository.contract.integration-test.ts`
Expected: PASS (7 testes) se o contrato descreve o comportamento atual do Prisma; qualquer falha indica contrato errado e deve ser corrigida no contrato.

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/dao/prisma/prisma-user-dao.contract.integration-test.ts`
Expected: PASS (6 testes), mesma regra

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-user-repository.integration-test.ts`
Expected: FAIL with "Failed to resolve import "./mongo-user-repository""

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/dao/mongo/mongo-user-dao.integration-test.ts`
Expected: FAIL with "Failed to resolve import "./mongo-user-dao""

- **Step 3: Write minimal implementation**

`apps/backend/src/shared/infra/database/repository/mongo/escape-regexp.ts`:

```ts
export function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
```

`apps/backend/src/shared/infra/database/repository/mongo/mongo-user-repository.ts`:

```ts
import { inject, injectable } from "inversify"
import type { ClientSession, Collection, Filter } from "mongodb"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { sessionOptions } from "@/shared/infra/database/repository/unit-of-work/mongo-session"
import { MongoUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { UserQuery } from "@/user/application/persistence/repository/user-query"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository"
import { User } from "@/user/domain/user"
import type { RoleTypes } from "@/user/domain/value-object/role"
import type { StatusTypes } from "@/user/domain/value-object/status"

export type UserDocument = {
	_id: string
	name: string
	email: string
	password_hash: string | null
	google_id: string | null
	created_at: Date
	role: RoleTypes
	updated_at: Date
	status: StatusTypes
	billing_customer_id: string | null
	is_super_admin: boolean
	deleted_at: Date | null
}

@injectable()
export class MongoUserRepository implements UserRepository {
	private session: ClientSession | undefined

	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public withTransaction<TX extends object>(tx: TX): UserRepository {
		if (!MongoUnitOfWork.isClientSession(tx)) {
			throw new InvalidTransactionInstance(tx)
		}
		const repository = new MongoUserRepository(this.connection)
		repository.session = tx
		return repository
	}

	public async get(userQuery: UserQuery): Promise<User | null> {
		const document = await this.users().findOne(
			this.queryFilter(userQuery),
			sessionOptions(this.session),
		)
		return document ? this.restoreUser(document) : null
	}

	public async userOfId(id: string): Promise<User | null> {
		const document = await this.users().findOne(
			{ _id: id, deleted_at: null },
			sessionOptions(this.session),
		)
		return document ? this.restoreUser(document) : null
	}

	public async userOfEmail(email: string): Promise<User | null> {
		const document = await this.users().findOne(
			{ email, deleted_at: null },
			sessionOptions(this.session),
		)
		return document ? this.restoreUser(document) : null
	}

	public async userOfGoogleId(googleId: string): Promise<User | null> {
		const document = await this.users().findOne(
			{ google_id: googleId, deleted_at: null },
			sessionOptions(this.session),
		)
		return document ? this.restoreUser(document) : null
	}

	public async usersOfIds(ids: string[]): Promise<User[]> {
		const documents = await this.users()
			.find({ _id: { $in: ids }, deleted_at: null }, sessionOptions(this.session))
			.toArray()
		return documents.map((document) => this.restoreUser(document))
	}

	public async updateManyStatus(
		ids: string[],
		status: StatusTypes,
	): Promise<number> {
		const result = await this.users().updateMany(
			{ _id: { $in: ids }, status: { $ne: status } },
			{ $set: { status } },
			sessionOptions(this.session),
		)
		return result.modifiedCount
	}

	public async save(user: User): Promise<void> {
		await this.users().insertOne(
			{
				_id: user.id,
				name: user.name,
				email: user.email,
				password_hash: user.password ?? null,
				google_id: user.googleId ?? null,
				created_at: user.createdAt,
				role: user.role,
				updated_at: new Date(),
				status: user.status,
				billing_customer_id: user.billingCustomerId ?? null,
				// Same as PrismaUserRepository.save: the flag is not written on create.
				is_super_admin: false,
				deleted_at: user.deletedAt ?? null,
			},
			sessionOptions(this.session),
		)
	}

	public async update(user: User): Promise<void> {
		await this.users().updateOne(
			{ _id: user.id },
			{
				$set: {
					email: user.email,
					name: user.name,
					password_hash: user.password ?? null,
					google_id: user.googleId ?? null,
					created_at: user.createdAt,
					role: user.role,
					status: user.status,
					billing_customer_id: user.billingCustomerId ?? null,
					is_super_admin: user.isSuperAdmin,
					updated_at: user.updatedAt ? user.updatedAt : new Date(),
					deleted_at: user.deletedAt ?? null,
				},
			},
			sessionOptions(this.session),
		)
	}

	private users(): Collection<UserDocument> {
		return this.connection.collection<UserDocument>(COLLECTIONS.USERS)
	}

	private queryFilter(userQuery: UserQuery): Filter<UserDocument> {
		const filter: Filter<UserDocument> = { deleted_at: null }
		const {
			id,
			name,
			email,
			password,
			role,
			createdAt,
			updatedAt,
			status,
			billingCustomerId,
		} = userQuery.fields
		if (id !== undefined) filter._id = id
		if (name !== undefined) filter.name = name
		if (email !== undefined) filter.email = email
		if (password !== undefined) filter.password_hash = password
		if (role !== undefined) filter.role = role
		if (createdAt !== undefined) filter.created_at = createdAt
		if (updatedAt !== undefined) filter.updated_at = updatedAt
		if (status !== undefined) filter.status = status
		if (billingCustomerId !== undefined) {
			filter.billing_customer_id = billingCustomerId
		}
		return filter
	}

	private restoreUser(document: UserDocument): User {
		return User.restore({
			id: document._id,
			email: document.email,
			name: document.name,
			password: document.password_hash ?? undefined,
			googleId: document.google_id ?? undefined,
			createdAt: new Date(document.created_at),
			updatedAt: new Date(document.updated_at),
			role: document.role,
			status: document.status,
			billingCustomerId: document.billing_customer_id ?? undefined,
			deletedAt: document.deleted_at ?? undefined,
			isSuperAdmin: document.is_super_admin ?? false,
		})
	}
}
```

`apps/backend/src/shared/infra/database/dao/mongo/mongo-user-dao.ts`:

```ts
import { inject, injectable } from "inversify"
import type { Filter } from "mongodb"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { escapeRegExp } from "@/shared/infra/database/repository/mongo/escape-regexp"
import type { UserDocument } from "@/shared/infra/database/repository/mongo/mongo-user-repository"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type {
	FetchUsersInput,
	FetchUsersOutput,
	UserDAO,
	UserStatsOutput,
} from "@/user/application/persistence/dao/user-dao"

@injectable()
export class MongoUserDao implements UserDAO {
	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public async fetchAndCountUsers(
		input: FetchUsersInput,
	): Promise<FetchUsersOutput> {
		const filter = this.buildFilter(input)
		const users = this.connection.collection<UserDocument>(COLLECTIONS.USERS)
		const [documents, total] = await Promise.all([
			users
				.find(filter)
				.sort({ created_at: 1, _id: 1 })
				.skip((input.page - 1) * input.limit)
				.limit(input.limit)
				.toArray(),
			users.countDocuments(filter),
		])
		return {
			total,
			usersData: documents.map((document) => ({
				id: document._id,
				email: document.email,
				name: document.name,
				role: document.role,
				status: document.status,
				isSuperAdmin: document.is_super_admin,
				createdAt: document.created_at.toISOString(),
			})),
		}
	}

	public async countUserStats(): Promise<UserStatsOutput> {
		const users = this.connection.collection<UserDocument>(COLLECTIONS.USERS)
		const [total, members, admins, active, inactive] = await Promise.all([
			users.countDocuments({ deleted_at: null }),
			users.countDocuments({ deleted_at: null, role: "MEMBER" }),
			users.countDocuments({ deleted_at: null, role: "ADMIN" }),
			users.countDocuments({ deleted_at: null, status: "activated" }),
			users.countDocuments({ deleted_at: null, status: "suspended" }),
		])
		return { total, members, admins, active, inactive }
	}

	private buildFilter(input: FetchUsersInput): Filter<UserDocument> {
		const filter: Filter<UserDocument> = { deleted_at: null }
		if (input.query) {
			const pattern = escapeRegExp(input.query)
			filter.$or = [
				{ name: { $regex: pattern, $options: "i" } },
				{ email: { $regex: pattern, $options: "i" } },
			]
		}
		if (input.role) filter.role = input.role
		if (input.status === "active") filter.status = "activated"
		if (input.status === "inactive") filter.status = "suspended"
		return filter
	}
}
```

Se o `UserStatsOutput`/`FetchUsersOutput` do repositório divergir do formato acima (campos `isSuperAdmin`, `createdAt` em ISO), copiar exatamente o formato devolvido por `PrismaUserDAO`.

- **Step 4: Run tests to verify they pass**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/repository/mongo/escape-regexp.test.ts`
Expected: PASS (2 testes)

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-user-repository.integration-test.ts`
Expected: PASS (16 testes: 7 do contrato e 9 específicos)

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/dao/mongo/mongo-user-dao.integration-test.ts`
Expected: PASS (7 testes: 6 do contrato e 1 específico)

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/repository/in-memory/in-memory-user-repository.contract.test.ts`
Expected: PASS (7 testes)

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/dao/in-memory/user-dao-memory.contract.test.ts`
Expected: PASS (6 testes)

- **Step 5: Commit** *(only when `workflow.auto_commit` is true — the implementer's prompt says so; otherwise skip this step and report the files instead.)*

```bash
git add apps/backend/src/shared/infra/database apps/backend/test/repository-contract apps/backend/test/mongo
git commit -m "feat(backend): repositório e DAO de usuário no Mongo com contrato compartilhado"
```

## Critérios de Sucesso

- INV-02 [db]: E-mail, CNPJ e `billing_subscription_id` são únicos · Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-user-repository.integration-test.ts`
- Nesta task o INV-02 cobre e-mail, `google_id` e `billing_customer_id` do usuário; o CNPJ é provado na task de academia e o `billing_subscription_id` na de assinatura.
- AC-02 [int]: WHEN um e-mail, CNPJ ou check-in do dia repete THEN a resposta é a mesma do provider `prisma`
- Nesta task o AC-02 cobre apenas o e-mail: o índice impede a duplicata e o caso de uso continua checando antes por `get`/`userOfEmail`.
- FR-004, FR-005, FR-006: o `MongoUserRepository` cumpre a porta `UserRepository` com `_id` UUID, `deleted_at: null` em todas as consultas e `withTransaction(session)` validado.
- FR-012: `MongoUserDao` pagina por `limit`/`page`, devolve o `total` do filtro completo e mapeia `active`/`inactive` para `activated`/`suspended`.
- FR-019: `describeUserRepositoryContract` e `describeUserDaoContract` passam em in-memory, Prisma e Mongo.
- FR-020: os testes de integração do repositório e do DAO de usuário rodam contra um MongoDB real.
