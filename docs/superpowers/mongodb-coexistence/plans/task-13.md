# Task 13: Seed equivalente para o Mongo [FR-018]

**Status:** PENDING

**PRD:** `../prd/prd-mongodb-coexistence.md`

**Spec:** `../specs/mongodb-coexistence-design.md`

**Tier:** standard

## Visão Geral

Esta task entrega o equivalente Mongo do `prisma/seed.ts`: o super admin, 50 membros, 50 academias e até 8 check-ins por membro em 90 dias, gravados pelos repositórios Mongo (a mesma porta que a API usa) e não por inserções diretas. A geração dos dados é uma função pura e determinística (`faker.seed(42)`, ids estáveis), o que torna a execução idempotente: rodar de novo não duplica nada. O script fica em `apps/backend/scripts/seed-mongo.ts`, junto do outro script de Mongo (o ETL), porque o `prisma/` do projeto guarda só o que depende do Prisma.

## Arquivos

- Create: `apps/backend/scripts/seed/seed-data-factory.ts`
- Create: `apps/backend/scripts/seed-mongo.ts`
- Modify: `apps/backend/package.json`
- Test: `apps/backend/scripts/seed/seed-data-factory.test.ts`
- Test: `apps/backend/scripts/seed/seed-mongo.integration-test.ts`

## Interfaces

- **Consome:**
  - `class MongoConnection { constructor(url: string, dbName?: string); collection<T extends Document>(name: string): Collection<T>; client(): MongoClient; disconnect(): Promise<void> }` e `COLLECTIONS` de `@/shared/infra/database/connection/mongo/mongo-connection` (task-02)
  - `createTestMongoConnection(dbName?: string): Promise<MongoConnection>` de `test/mongo/create-test-mongo-connection` (task-02)
  - `class MongoUserRepository { constructor(connection: MongoConnection); save(user: User): Promise<void>; update(user: User): Promise<void>; userOfEmail(email: string): Promise<User | null>; userOfId(id: string): Promise<User | null> }` de `@/shared/infra/database/repository/mongo/mongo-user-repository` (task-04; `save` grava `is_super_admin: false`, como o `PrismaUserRepository`, e `update` grava o valor real)
  - `class MongoGymRepository { constructor(connection: MongoConnection); save(gym: Gym): Promise<SaveGymResult>; gymOfId(id: string, options?: GymFetchOptions): Promise<Gym | null>; fetchGyms(input: FetchGymsInput): Promise<FetchGymsOutput> }` de `@/shared/infra/database/repository/mongo/mongo-gym-repository` (task-05)
  - `class MongoCheckInRepository { constructor(connection: MongoConnection); save(checkIn: CheckIn): Promise<SaveResponse>; checkOfById(id: string): Promise<CheckIn | null> }` de `@/shared/infra/database/repository/mongo/mongo-check-in-repository` (task-06)
  - `initializeMongo(connection: MongoConnection): Promise<void>` de `@/shared/infra/database/connection/mongo/initialize-mongo` (task-11)
- **Produz:**
  - `buildSeedData(input: { memberPasswordHash: string; now?: Date }): SeedData` com `interface SeedData { users: User[]; gyms: Gym[]; checkIns: CheckIn[] }`, em `scripts/seed/seed-data-factory`
  - `seedMongo(connection: MongoConnection, options?: { now?: Date }): Promise<SeedMongoResult>` com `interface SeedMongoResult { superAdminEmail: string; usersCreated: number; gymsCreated: number; checkInsCreated: number; skippedRandomSeeding: boolean }`, em `scripts/seed-mongo`
  - Script `seed:mongo` no `package.json`

### Skills a invocar

- `typescript-advanced`: `SeedData` e `SeedMongoResult` tipados; as entidades são criadas por `User.restore`, `Gym.restore` e `CheckIn.restore` com os tipos do domínio, sem `any`.
- `no-workarounds`: o seed grava pelos repositórios Mongo (a mesma porta da API), e o super admin passa por `save` seguido de `update` porque `save` não grava `is_super_admin`; nada de inserir direto na coleção para contornar isso.
- `test-antipatterns`: o teste de integração roda o seed de verdade numa base Mongo descartável e confere contagens e referências; o teste unitário só toca a função pura de geração.

## Passos

- **Step 1: Confirm the seed helpers and entity props**

Abrir `apps/backend/prisma/seed.ts`, `apps/backend/prisma/lib/brazilian-cnpj.ts` e `apps/backend/prisma/lib/brazilian-phone.ts` e confirmar as assinaturas `generateValidCnpjFromIndex(index: number): string` e `generateBrazilianMobilePhone(): string` (usadas pelo seed Prisma), e que `Password.create(raw)` devolve `Either` com `.value.value` sendo o hash (como `hashPassword` do seed). O `faker.date.past` e o `faker.date.soon` aceitam `refDate`.

- **Step 2: Write the failing unit test**

`apps/backend/scripts/seed/seed-data-factory.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { buildSeedData } from "./seed-data-factory"

const NOW = new Date("2026-06-15T10:00:00.000Z")

function build() {
	return buildSeedData({ memberPasswordHash: "hashed-member-password", now: NOW })
}

describe("buildSeedData", () => {
	it("FR-018: builds 50 members and 50 gyms like the Prisma seed", () => {
		const data = build()

		expect(data.users).toHaveLength(50)
		expect(data.users.map((user) => user.email)).toEqual(
			Array.from({ length: 50 }, (_, index) => `member${index + 1}@example.com`),
		)
		expect(data.users.every((user) => user.role === "MEMBER")).toBe(true)
		expect(data.gyms).toHaveLength(50)
		expect(new Set(data.gyms.map((gym) => gym.cnpj)).size).toBe(50)
	})

	it("FR-018: gives each member at most 8 check-ins on distinct UTC days within 90 days", () => {
		const data = build()

		const byUser = new Map<string, Date[]>()
		for (const checkIn of data.checkIns) {
			byUser.set(checkIn.userId, [...(byUser.get(checkIn.userId) ?? []), checkIn.createdAt])
		}
		for (const dates of byUser.values()) {
			expect(dates.length).toBeLessThanOrEqual(8)
			const days = dates.map((date) => date.toISOString().slice(0, 10))
			expect(new Set(days).size).toBe(days.length)
		}
		const oldest = Math.min(...data.checkIns.map((checkIn) => checkIn.createdAt.getTime()))
		expect(NOW.getTime() - oldest).toBeLessThanOrEqual(91 * 24 * 3_600_000)
		expect(data.checkIns.every((checkIn) => data.users.some((user) => user.id === checkIn.userId))).toBe(true)
		expect(data.checkIns.every((checkIn) => data.gyms.some((gym) => gym.id === checkIn.gymId))).toBe(true)
	})

	it("FR-018: is deterministic, so a second run produces the same ids", () => {
		const first = build()
		const second = build()

		expect(second.users.map((user) => user.id)).toEqual(first.users.map((user) => user.id))
		expect(second.gyms.map((gym) => gym.id)).toEqual(first.gyms.map((gym) => gym.id))
		expect(second.checkIns.map((checkIn) => checkIn.id)).toEqual(
			first.checkIns.map((checkIn) => checkIn.id),
		)
	})
})
```

- **Step 3: Run test to verify it fails**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts scripts/seed/seed-data-factory.test.ts`
Expected: FAIL with "Failed to resolve import "./seed-data-factory""

- **Step 4: Write the pure data builder**

`apps/backend/scripts/seed/seed-data-factory.ts`:

```ts
import { faker } from "@faker-js/faker"
import { CheckIn } from "@/check-in/domain/check-in"
import { Gym } from "@/gym/domain/gym"
import { User } from "@/user/domain/user"
import { generateValidCnpjFromIndex } from "../../prisma/lib/brazilian-cnpj.js"
import { generateBrazilianMobilePhone } from "../../prisma/lib/brazilian-phone.js"

export const USER_COUNT = 50
export const GYM_COUNT = 50
const MAX_CHECK_INS_PER_USER = 8
const CHECK_IN_DAY_WINDOW = 90
const SEED = 42
const USER_STATUSES = ["activated", "activated", "activated", "suspended"] as const
const CHECK_IN_OUTCOMES = ["approved", "approved", "approved", "rejected", "pending"] as const
const DAY_POOL = Array.from({ length: CHECK_IN_DAY_WINDOW }, (_, index) => index + 1)

type CheckInOutcome = (typeof CHECK_IN_OUTCOMES)[number]

export interface SeedData {
	users: User[]
	gyms: Gym[]
	checkIns: CheckIn[]
}

function buildCheckInDates(
	createdAt: Date,
	outcome: CheckInOutcome,
): { validatedAt?: Date; rejectedAt?: Date } {
	if (outcome === "approved") {
		return { validatedAt: faker.date.soon({ days: 1, refDate: createdAt }) }
	}
	if (outcome === "rejected") {
		return { rejectedAt: faker.date.soon({ days: 1, refDate: createdAt }) }
	}
	return {}
}

// Built at noon UTC so each day offset maps to one UTC day (the unique check-in per user and day).
function buildCreatedAtFromOffset(daysAgo: number, now: Date): Date {
	return new Date(
		Date.UTC(
			now.getUTCFullYear(),
			now.getUTCMonth(),
			now.getUTCDate() - daysAgo,
			12,
			faker.number.int({ min: 0, max: 59 }),
			0,
			0,
		),
	)
}

export function buildSeedData(input: {
	memberPasswordHash: string
	now?: Date
}): SeedData {
	const now = input.now ?? new Date()
	faker.seed(SEED)

	const users = Array.from({ length: USER_COUNT }, (_, index) => {
		const sex = faker.person.sexType()
		const firstName = faker.person.firstName(sex)
		const lastName = faker.person.lastName(sex)
		const createdAt = faker.date.past({ years: 1, refDate: now })
		return User.restore({
			id: faker.string.uuid(),
			name: faker.person.fullName({ firstName, lastName, sex }),
			email: `member${index + 1}@example.com`,
			password: input.memberPasswordHash,
			createdAt,
			updatedAt: createdAt,
			role: "MEMBER",
			status: faker.helpers.arrayElement(USER_STATUSES),
			isSuperAdmin: false,
		})
	})

	const gyms = Array.from({ length: GYM_COUNT }, (_, index) =>
		Gym.restore({
			id: faker.string.uuid(),
			cnpj: generateValidCnpjFromIndex(index + 1),
			title: `${faker.company.name()} Gym`,
			description: faker.company.catchPhrase(),
			phone: generateBrazilianMobilePhone(),
			address: faker.location.streetAddress({ useFullAddress: true }),
			latitude: faker.location.latitude(),
			longitude: faker.location.longitude(),
			status: "activated",
			operatingHours: null,
		}),
	)

	const checkIns = users.flatMap((user) => {
		const total = faker.number.int({ min: 0, max: MAX_CHECK_INS_PER_USER })
		const dayOffsets = faker.helpers.arrayElements(DAY_POOL, total)
		return dayOffsets.map((daysAgo) => {
			const gym = faker.helpers.arrayElement(gyms)
			const createdAt = buildCreatedAtFromOffset(daysAgo, now)
			const outcome = faker.helpers.arrayElement(CHECK_IN_OUTCOMES)
			return CheckIn.restore({
				id: faker.string.uuid(),
				gymId: gym.id,
				userId: user.id,
				createdAt,
				userLatitude: gym.latitude,
				userLongitude: gym.longitude,
				...buildCheckInDates(createdAt, outcome),
			})
		})
	})

	return { users, gyms, checkIns }
}
```

- **Step 5: Run test to verify it passes**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts scripts/seed/seed-data-factory.test.ts`
Expected: PASS (3 testes)

- **Step 6: Write the failing integration test**

`apps/backend/scripts/seed/seed-mongo.integration-test.ts`:

```ts
import { randomUUID } from "node:crypto"
import type { Document } from "mongodb"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { seedMongo } from "../seed-mongo"

describe("seedMongo", () => {
	const dbName = `seed_${randomUUID().replaceAll("-", "")}`
	let connection: MongoConnection
	let firstRun: Awaited<ReturnType<typeof seedMongo>>

	function count(name: string): Promise<number> {
		return connection.collection<Document>(name).countDocuments({})
	}

	async function ids(name: string): Promise<string[]> {
		const documents = await connection
			.collection<Document>(name)
			.find({}, { projection: { _id: 1 } })
			.sort({ _id: 1 })
			.toArray()
		return documents.map((document) => String(document._id))
	}

	beforeAll(async () => {
		connection = await createTestMongoConnection(dbName)
		firstRun = await seedMongo(connection)
	}, 120_000)

	afterAll(async () => {
		await connection.client().db(dbName).dropDatabase()
		await connection.disconnect()
	})

	it("FR-018: creates the super admin, 50 members and 50 gyms", async () => {
		expect(firstRun.skippedRandomSeeding).toBe(false)
		expect(await count(COLLECTIONS.USERS)).toBe(51)
		expect(await count(COLLECTIONS.GYMS)).toBe(50)
		expect(firstRun.usersCreated).toBe(50)
		expect(firstRun.gymsCreated).toBe(50)
		const superAdmin = await connection
			.collection<Document>(COLLECTIONS.USERS)
			.findOne({ email: firstRun.superAdminEmail })
		expect(superAdmin).toMatchObject({
			role: "ADMIN",
			status: "activated",
			is_super_admin: true,
			deleted_at: null,
		})
	})

	it("FR-018: gives each member at most 8 check-ins that reference existing users and gyms", async () => {
		const perUser = await connection
			.collection<Document>(COLLECTIONS.CHECK_INS)
			.aggregate<{ _id: string; total: number }>([
				{ $group: { _id: "$user_id", total: { $sum: 1 } } },
			])
			.toArray()
		const userIds = new Set(await ids(COLLECTIONS.USERS))
		const gymIds = new Set(await ids(COLLECTIONS.GYMS))
		const checkIns = await connection
			.collection<Document>(COLLECTIONS.CHECK_INS)
			.find({})
			.toArray()

		expect(firstRun.checkInsCreated).toBe(await count(COLLECTIONS.CHECK_INS))
		expect(perUser.every((row) => row.total <= 8)).toBe(true)
		expect(checkIns.every((checkIn) => userIds.has(checkIn.user_id))).toBe(true)
		expect(checkIns.every((checkIn) => gymIds.has(checkIn.gym_id))).toBe(true)
	})

	it("FR-018: running the seed again changes nothing", async () => {
		const before = {
			users: await ids(COLLECTIONS.USERS),
			gyms: await ids(COLLECTIONS.GYMS),
			checkIns: await ids(COLLECTIONS.CHECK_INS),
		}

		const secondRun = await seedMongo(connection)

		expect(secondRun.skippedRandomSeeding).toBe(true)
		expect(await ids(COLLECTIONS.USERS)).toEqual(before.users)
		expect(await ids(COLLECTIONS.GYMS)).toEqual(before.gyms)
		expect(await ids(COLLECTIONS.CHECK_INS)).toEqual(before.checkIns)
	}, 60_000)

	it("FR-018: after a partial run the seed completes the missing documents without duplicates", async () => {
		const partialDb = `seed_${randomUUID().replaceAll("-", "")}`
		const partial = await createTestMongoConnection(partialDb)
		try {
			await seedMongo(partial)
			const gyms = partial.collection<Document>(COLLECTIONS.GYMS)
			const removed = await gyms.find({}).limit(10).toArray()
			await partial.collection<Document>(COLLECTIONS.CHECK_INS).deleteMany({
				gym_id: { $in: removed.map((gym) => gym._id) },
			})
			await gyms.deleteMany({ _id: { $in: removed.map((gym) => gym._id) } })

			const rerun = await seedMongo(partial)

			expect(rerun.skippedRandomSeeding).toBe(false)
			expect(await gyms.countDocuments({})).toBe(50)
			expect(rerun.gymsCreated).toBe(10)
			expect(await partial.collection<Document>(COLLECTIONS.USERS).countDocuments({})).toBe(51)
		} finally {
			await partial.client().db(partialDb).dropDatabase()
			await partial.disconnect()
		}
	}, 180_000)
})
```

- **Step 7: Run test to verify it fails**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts scripts/seed/seed-mongo.integration-test.ts`
Expected: FAIL with "Failed to resolve import "../seed-mongo""

- **Step 8: Write the seed script**

`apps/backend/scripts/seed-mongo.ts`:

```ts
import { randomUUID } from "node:crypto"
import { pathToFileURL } from "node:url"
import { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"
import { initializeMongo } from "@/shared/infra/database/connection/mongo/initialize-mongo"
import { MongoCheckInRepository } from "@/shared/infra/database/repository/mongo/mongo-check-in-repository"
import { MongoGymRepository } from "@/shared/infra/database/repository/mongo/mongo-gym-repository"
import { MongoUserRepository } from "@/shared/infra/database/repository/mongo/mongo-user-repository"
import { env } from "@/shared/infra/env"
import { User } from "@/user/domain/user"
import { Password } from "@/user/domain/value-object/password.js"
import { buildSeedData, GYM_COUNT } from "./seed/seed-data-factory"

const SUPER_ADMIN_EMAIL = process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@admin.com"
const SUPER_ADMIN_PASSWORD = process.env.SEED_SUPER_ADMIN_PASSWORD ?? "admin@admin"
const SUPER_ADMIN_NAME = "Super Admin"
const MEMBER_PASSWORD = "Member123!"

export interface SeedMongoResult {
	superAdminEmail: string
	usersCreated: number
	gymsCreated: number
	checkInsCreated: number
	skippedRandomSeeding: boolean
}

async function hashPassword(rawPassword: string): Promise<string> {
	const passwordResult = await Password.create(rawPassword)
	if (passwordResult.isFailure()) {
		throw new Error(`Invalid seed password: ${passwordResult.value.message}`)
	}
	return passwordResult.value.value
}

async function seedSuperAdmin(users: MongoUserRepository): Promise<void> {
	const existing = await users.userOfEmail(SUPER_ADMIN_EMAIL)
	const now = new Date()
	const admin = User.restore({
		id: existing?.id ?? randomUUID(),
		name: existing?.name ?? SUPER_ADMIN_NAME,
		email: SUPER_ADMIN_EMAIL,
		password: existing?.password ?? (await hashPassword(SUPER_ADMIN_PASSWORD)),
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
		role: "ADMIN",
		status: "activated",
		isSuperAdmin: true,
	})
	if (!existing) await users.save(admin)
	// save() does not write is_super_admin (same as the Prisma repository), so update() sets it.
	await users.update(admin)
}

export async function seedMongo(
	connection: MongoConnection,
	options: { now?: Date } = {},
): Promise<SeedMongoResult> {
	const users = new MongoUserRepository(connection)
	const gyms = new MongoGymRepository(connection)
	const checkIns = new MongoCheckInRepository(connection)

	await seedSuperAdmin(users)

	const existingGyms = await gyms.fetchGyms({ page: 1 })
	if (existingGyms.total >= GYM_COUNT) {
		return {
			superAdminEmail: SUPER_ADMIN_EMAIL,
			usersCreated: 0,
			gymsCreated: 0,
			checkInsCreated: 0,
			skippedRandomSeeding: true,
		}
	}

	const data = buildSeedData({
		memberPasswordHash: await hashPassword(MEMBER_PASSWORD),
		now: options.now,
	})
	let usersCreated = 0
	let gymsCreated = 0
	let checkInsCreated = 0
	for (const user of data.users) {
		if (await users.userOfId(user.id)) continue
		await users.save(user)
		usersCreated += 1
	}
	for (const gym of data.gyms) {
		if (await gyms.gymOfId(gym.id)) continue
		await gyms.save(gym)
		gymsCreated += 1
	}
	for (const checkIn of data.checkIns) {
		if (await checkIns.checkOfById(checkIn.id)) continue
		await checkIns.save(checkIn)
		checkInsCreated += 1
	}
	return {
		superAdminEmail: SUPER_ADMIN_EMAIL,
		usersCreated,
		gymsCreated,
		checkInsCreated,
		skippedRandomSeeding: false,
	}
}

async function main(): Promise<void> {
	if (!env.DATABASE_URL_MONGO) {
		throw new Error("DATABASE_URL_MONGO is required to seed MongoDB")
	}
	const connection = new MongoConnection(env.DATABASE_URL_MONGO)
	try {
		await initializeMongo(connection)
		const result = await seedMongo(connection)
		console.log("Seed (mongo):", result)
	} finally {
		await connection.disconnect()
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		console.error("Seed failed:", error)
		process.exit(1)
	})
}
```

Em `apps/backend/package.json`, ao lado de `prisma:seed`:

```json
"seed:mongo": "npx tsx scripts/seed-mongo.ts",
```

- **Step 9: Run tests to verify they pass**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts scripts/seed/seed-mongo.integration-test.ts`
Expected: PASS (4 testes; exige o MongoDB do compose; cada teste usa uma base descartável removida no fim)

- **Step 10: Commit** *(only when `workflow.auto_commit` is true — the implementer's prompt says so; otherwise skip this step and report the files instead.)*

```bash
git add apps/backend/scripts apps/backend/package.json
git commit -m "feat(backend): seed equivalente para o Mongo sobre os repositórios"
```

## Critérios de Sucesso

- FR-018: `pnpm --filter backend seed:mongo` cria o super admin, 50 membros, 50 academias e até 8 check-ins por membro em 90 dias pelos repositórios Mongo, e reexecutar não duplica nada (testes `FR-018`, incluindo a retomada após execução parcial).
- A geração dos dados é determinística (`faker.seed(42)`, ids estáveis) e respeita a unicidade de um check-in por usuário e dia UTC.
- A verificação de saúde do banco no provider `mongo` (outra metade de FR-018) foi entregue com `MongoDatabaseHealthProvider` e ligada na task de seleção por provider.
