# Task 5: Repositório de academia no Mongo com busca por proximidade [FR-004, FR-006, FR-010]

**Status:** PENDING

**PRD:** `../prd/prd-mongodb-coexistence.md`

**Spec:** `../specs/mongodb-coexistence-design.md`

**Tier:** standard

## Visão Geral

Esta task entrega `MongoGymRepository`: persistência de academias com `_id` UUID, filtro de academia inativa por `includeInactive`, listagem paginada por título e a busca por proximidade a 10 km com `$geoNear`. Toda gravação e atualização deriva o campo GeoJSON `location` (`[longitude, latitude]`), que é o que a busca geoespacial consulta. A task cria a suíte de contrato de academia e um teste de paridade que compara a busca a 10 km do adaptador Prisma com a do Mongo.

## Arquivos

- Create: `apps/backend/src/shared/infra/database/repository/mongo/mongo-gym-repository.ts`
- Create: `apps/backend/test/repository-contract/gym-repository-contract.ts`
- Test: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.contract.test.ts`
- Test: `apps/backend/src/shared/infra/database/repository/prisma/prisma-gym-repository.contract.integration-test.ts`
- Test: `apps/backend/src/shared/infra/database/repository/mongo/mongo-gym-repository.integration-test.ts`
- Test: `apps/backend/src/shared/infra/database/repository/mongo/mongo-gym-repository.parity.integration-test.ts`

## Interfaces

- **Consome:**
  - `class MongoConnection { collection<T extends Document>(name: string): Collection<T> }`, `COLLECTIONS.GYMS` de `@/shared/infra/database/connection/mongo/mongo-connection` (task-02)
  - `isDuplicateKeyError(error: unknown): error is MongoServerError`, `duplicateKeyFields(error: MongoServerError): string[]` de `@/shared/infra/database/connection/mongo/mongo-duplicate-key` (task-02)
  - `createTestMongoConnection(dbName?: string): Promise<MongoConnection>` de `test/mongo/create-test-mongo-connection` (task-02)
  - `SHARED_TYPES.Mongo.Connection` de `@/shared/infra/ioc/types` (task-02)
  - `MongoUnitOfWork.isClientSession(obj: unknown): obj is ClientSession` e `new MongoUnitOfWork(connection)` com `runTransaction` (task-03)
  - `sessionOptions(session: ClientSession | undefined): { session?: ClientSession }` de `@/shared/infra/database/repository/unit-of-work/mongo-session` (task-03)
  - `escapeRegExp(text: string): string` de `@/shared/infra/database/repository/mongo/escape-regexp` (task-04)
  - `class IdRecorder { newId(): string; get ids(): readonly string[] }` de `test/repository-contract/id-recorder` (task-04)
  - `deleteDocumentsReferencing(connection, ids, targets)` de `test/mongo/delete-documents-referencing` (task-04)
- **Produz:**
  - `class MongoGymRepository implements GymRepository` (`@injectable()`, construtor `(connection: MongoConnection)`), `type GymDocument`, `type GeoPoint` e `toGeoPoint(latitude: number, longitude: number): GeoPoint` em `@/shared/infra/database/repository/mongo/mongo-gym-repository`
  - `describeGymRepositoryContract(name: string, factory: () => Promise<GymRepositoryContractContext>): void` com `interface GymRepositoryContractContext { repository: GymRepository; newId(): string; cleanup(): Promise<void> }` em `test/repository-contract/gym-repository-contract` (não cobre `fetchNearbyCoord`: o in-memory usa 1 km, por isso a busca a 10 km tem teste de paridade próprio)
  - Convenção do documento de academia: `_id`, `cnpj`, `title`, `description`, `phone`, `address`, `image_key`, `latitude`, `longitude` (números), `status`, `operating_hours` (array JSON ou `null`), `location` (`{ type: "Point", coordinates: [longitude, latitude] }`), `created_at`, `updated_at`

### Skills a invocar

- `typescript-advanced`: `GymDocument` como `type` alias com `location` tipado como tupla `[number, number]`; `Filter<GymDocument>` montado sem cast.
- `no-workarounds`: `location` é derivado em todo `save`/`update` pelo mesmo `toGeoPoint`; não se compensa a falta de `location` com um segundo caminho de busca por distância em memória.
- `test-antipatterns`: a paridade usa Postgres (PostGIS) e Mongo reais com os mesmos ids; o contrato roda no in-memory real; nenhum teste verifica um mock.
- `context7`: confirmar `$geoNear` (`near`, `distanceField`, `maxDistance`, `spherical`, `query`) e o índice `2dsphere` na documentação do MongoDB/driver instalado.

## Passos

- **Step 1: Confirm how the Prisma adapter reports a repeated CNPJ**

Ler `apps/backend/src/shared/infra/database/repository/prisma/prisma-gym-repository.ts` e `apps/backend/src/gym/application/use-case/create-gym.usecase.ts`. Fatos já verificados ao escrever esta task: o `PrismaGymRepository.save` não traduz `P2002` (propaga o erro cru do banco) e a resposta de CNPJ repetido vem do caso de uso, que chama `gymOfCNPJ` antes de `save` e devolve `GymWithCNPJAlreadyExistsError`. Se o código atual divergir disso (por exemplo, se o repositório passar a lançar um erro de domínio), o `MongoGymRepository.save` deve traduzir o código 11000 do campo `cnpj` para esse mesmo erro, e o teste `AC-02` abaixo passa a esperar esse erro.

- **Step 2: Write the failing tests (contract, parity and Mongo specifics)**

`apps/backend/test/repository-contract/gym-repository-contract.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { GymRepository } from "@/gym/application/repository/gym-repository"
import { Gym } from "@/gym/domain/gym"

export interface GymRepositoryContractContext {
	repository: GymRepository
	newId(): string
	cleanup(): Promise<void>
}

type GymProps = Parameters<typeof Gym.restore>[0]

export function randomCnpj(): string {
	return Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join("")
}

export function describeGymRepositoryContract(
	name: string,
	factory: () => Promise<GymRepositoryContractContext>,
): void {
	describe(`GymRepository contract (${name})`, () => {
		let context: GymRepositoryContractContext
		let token: string

		beforeEach(async () => {
			context = await factory()
			token = context.newId().slice(0, 8)
		})

		afterEach(async () => {
			await context.cleanup()
		})

		function buildGym(overrides: Partial<GymProps> = {}): Gym {
			return Gym.restore({
				id: overrides.id ?? context.newId(),
				title: `${token} Gym`,
				description: "Contract gym",
				phone: "+5511999999999",
				address: "Rua do Contrato, 1",
				latitude: -23.5505,
				longitude: -46.6333,
				cnpj: randomCnpj(),
				status: "activated",
				operatingHours: null,
				...overrides,
			})
		}

		it("saves a gym and finds it by id and by CNPJ", async () => {
			const gym = buildGym()

			const saved = await context.repository.save(gym)
			const byId = await context.repository.gymOfId(gym.id)
			const byCnpj = await context.repository.gymOfCNPJ(gym.cnpj)

			expect(saved).toEqual({ id: gym.id })
			expect(byId?.title).toBe(gym.title)
			expect(byId?.cnpj).toBe(gym.cnpj)
			expect(byId?.status).toBe("activated")
			expect(byId?.description).toBe("Contract gym")
			expect(byId?.address).toBe("Rua do Contrato, 1")
			expect(byId?.latitude).toBeCloseTo(-23.5505, 6)
			expect(byId?.longitude).toBeCloseTo(-46.6333, 6)
			expect(byCnpj?.id).toBe(gym.id)
		})

		it("returns null for an unknown id and an unknown CNPJ", async () => {
			expect(await context.repository.gymOfId(context.newId())).toBeNull()
			expect(await context.repository.gymOfCNPJ(randomCnpj())).toBeNull()
		})

		it("update persists the changed title and status", async () => {
			const id = context.newId()
			const cnpj = randomCnpj()
			await context.repository.save(buildGym({ id, cnpj }))

			await context.repository.update(
				buildGym({ id, cnpj, title: `${token} Renamed`, status: "deactivated" }),
			)

			const found = await context.repository.gymOfId(id)
			expect(found?.title).toBe(`${token} Renamed`)
			expect(found?.status).toBe("deactivated")
		})

		it("FR-006: gymOfId hides a deactivated gym only when includeInactive is false", async () => {
			const gym = buildGym({ status: "deactivated" })
			await context.repository.save(gym)

			expect(
				await context.repository.gymOfId(gym.id, { includeInactive: false }),
			).toBeNull()
			expect(
				(await context.repository.gymOfId(gym.id, { includeInactive: true }))
					?.id,
			).toBe(gym.id)
			expect((await context.repository.gymOfId(gym.id))?.id).toBe(gym.id)
		})

		it("fetchGyms filters by a case-insensitive title and by includeInactive", async () => {
			const active = buildGym({ title: `${token} Alpha` })
			const other = buildGym({ title: `${token} Beta` })
			const inactive = buildGym({ title: `${token} Gamma`, status: "deactivated" })
			await context.repository.save(active)
			await context.repository.save(other)
			await context.repository.save(inactive)

			const all = await context.repository.fetchGyms({
				title: token.toUpperCase(),
				page: 1,
			})
			const onlyActive = await context.repository.fetchGyms({
				title: token.toUpperCase(),
				page: 1,
				includeInactive: false,
			})
			const byName = await context.repository.fetchGyms({
				title: `${token} alpha`,
				page: 1,
			})

			expect(all.total).toBe(3)
			expect(all.items.map((gym) => gym.id).sort()).toEqual(
				[active.id, other.id, inactive.id].sort(),
			)
			expect(onlyActive.total).toBe(2)
			expect(onlyActive.items.map((gym) => gym.id).sort()).toEqual(
				[active.id, other.id].sort(),
			)
			expect(byName.items.map((gym) => gym.id)).toEqual([active.id])
		})

		it("fetchGyms past the last page returns no items but keeps the total", async () => {
			await context.repository.save(buildGym({ title: `${token} One` }))
			await context.repository.save(buildGym({ title: `${token} Two` }))

			const output = await context.repository.fetchGyms({
				title: token,
				page: 999,
			})

			expect(output.items).toEqual([])
			expect(output.total).toBe(2)
		})
	})
}
```

Invocadores do contrato:

`apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.contract.test.ts`:

```ts
import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeGymRepositoryContract } from "test/repository-contract/gym-repository-contract"
import { InMemoryGymRepository } from "./in-memory-gym-repository"

describeGymRepositoryContract("in-memory", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new InMemoryGymRepository(),
		newId: () => recorder.newId(),
		cleanup: async () => {},
	}
})
```

`apps/backend/src/shared/infra/database/repository/prisma/prisma-gym-repository.contract.integration-test.ts`:

```ts
import { afterAll } from "vitest"
import { describeGymRepositoryContract } from "test/repository-contract/gym-repository-contract"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaGymRepository } from "./prisma-gym-repository"

afterAll(async () => {
	await prismaClient.$disconnect()
})

describeGymRepositoryContract("prisma", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new PrismaGymRepository(prismaClient),
		newId: () => recorder.newId(),
		cleanup: async () => {
			await prismaClient.gym.deleteMany({
				where: { id: { in: [...recorder.ids] } },
			})
		},
	}
})
```

`apps/backend/src/shared/infra/database/repository/mongo/mongo-gym-repository.integration-test.ts`:

```ts
import { randomUUID } from "node:crypto"
import type { Document } from "mongodb"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import {
	describeGymRepositoryContract,
	randomCnpj,
} from "test/repository-contract/gym-repository-contract"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { Gym } from "@/gym/domain/gym"
import { OperatingHours } from "@/gym/domain/value-object/spec-gym-dates.js"
import { Coordinate } from "@/shared/domain/value-object/coordinate.js"
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
import { MongoGymRepository } from "./mongo-gym-repository"

type GymProps = Parameters<typeof Gym.restore>[0]

async function duplicateFieldsOf(operation: Promise<unknown>): Promise<string[]> {
	const error = await operation.then(
		() => undefined,
		(caught: unknown) => caught,
	)
	if (!isDuplicateKeyError(error)) throw new Error("expected a duplicate key error")
	return duplicateKeyFields(error)
}

describe("MongoGymRepository", () => {
	let connection: MongoConnection
	let repository: MongoGymRepository
	const recorder = new IdRecorder()

	function buildGym(overrides: Partial<GymProps> = {}): Gym {
		return Gym.restore({
			id: overrides.id ?? recorder.newId(),
			title: "Mongo Gym",
			description: "Mongo gym",
			phone: "+5511999999999",
			address: "Rua Mongo, 1",
			latitude: -30,
			longitude: -30,
			cnpj: randomCnpj(),
			status: "activated",
			operatingHours: null,
			...overrides,
		})
	}

	function buildOperatingHours(): OperatingHours {
		const result = OperatingHours.create([
			{ weekday: 1, intervals: [{ open: "06:00", close: "12:00" }] },
		])
		if (result.isFailure()) throw result.value
		return result.value
	}

	function around(latitude: number, longitude: number): Coordinate {
		return Coordinate.restore({ latitude, longitude })
	}

	async function cleanup(): Promise<void> {
		await deleteDocumentsReferencing(connection, recorder.ids, [
			{ collection: COLLECTIONS.GYMS, fields: ["_id"] },
		])
	}

	beforeAll(async () => {
		connection = await createTestMongoConnection()
		repository = new MongoGymRepository(connection)
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	describeGymRepositoryContract("mongo", async () => {
		const contractRecorder = new IdRecorder()
		return {
			repository: new MongoGymRepository(connection),
			newId: () => contractRecorder.newId(),
			cleanup: () =>
				deleteDocumentsReferencing(connection, contractRecorder.ids, [
					{ collection: COLLECTIONS.GYMS, fields: ["_id"] },
				]),
		}
	})

	describe("mongo specifics", () => {
		afterEach(cleanup)

		it("INV-02: the unique index rejects a second gym with the same CNPJ", async () => {
			const cnpj = randomCnpj()
			await repository.save(buildGym({ cnpj }))

			expect(await duplicateFieldsOf(repository.save(buildGym({ cnpj })))).toEqual([
				"cnpj",
			])
		})

		it("AC-02: a repeated CNPJ is found by the lookup the use case runs first, and the index blocks the second insert", async () => {
			const cnpj = randomCnpj()
			const first = buildGym({ cnpj })
			await repository.save(first)

			const existing = await repository.gymOfCNPJ(cnpj)
			const failedFields = await duplicateFieldsOf(repository.save(buildGym({ cnpj })))

			expect(existing?.id).toBe(first.id)
			expect(failedFields).toEqual(["cnpj"])
		})

		it("round-trips the operating hours JSON and a missing value", async () => {
			const withHours = buildGym({ operatingHours: buildOperatingHours() })
			const withoutHours = buildGym({ operatingHours: null })
			await repository.save(withHours)
			await repository.save(withoutHours)

			const foundWith = await repository.gymOfId(withHours.id)
			const foundWithout = await repository.gymOfId(withoutHours.id)

			expect(foundWith?.operatingHours?.toJSON()).toEqual([
				{ weekday: 1, intervals: [{ open: "06:00", close: "12:00" }] },
			])
			expect(foundWithout?.operatingHours).toBeNull()
		})

		it("withTransaction rejects an object that is not a unit of work session", () => {
			expect(() => repository.withTransaction({})).toThrow(
				InvalidTransactionInstance,
			)
		})

		it("withTransaction writes inside the unit of work and rolls back when it fails", async () => {
			const unitOfWork = new MongoUnitOfWork(connection)
			const gym = buildGym()

			await expect(
				unitOfWork.runTransaction(async (tx) => {
					await repository.withTransaction(tx).save(gym)
					throw new Error("rollback")
				}),
			).rejects.toThrow("rollback")

			expect(await repository.gymOfId(gym.id)).toBeNull()
		})

	})
})
```

- **Step 3: Review Focus: Academia gravada ou atualizada sem o campo `location` (também pelo ETL): `$geoNear` não a encontra e a busca por 10 km diverge do Prisma — Write the failing test**

No mesmo `mongo-gym-repository.integration-test.ts`, dentro de `describe("MongoGymRepository", ...)` e depois do bloco `mongo specifics`, acrescentar (o lado ETL do mesmo risco é coberto na task do ETL):

```ts
	describe("location is always derived", () => {
		afterEach(cleanup)

		it("Review Focus: save and update always write location as [longitude, latitude]", async () => {
			const id = recorder.newId()
			const cnpj = randomCnpj()
			await repository.save(buildGym({ id, cnpj, latitude: -30, longitude: -31 }))
			const gyms = connection.collection<Document>(COLLECTIONS.GYMS)

			const afterSave = await gyms.findOne({ _id: id })
			expect(afterSave?.location).toEqual({
				type: "Point",
				coordinates: [-31, -30],
			})

			await repository.update(
				buildGym({ id, cnpj, latitude: -40, longitude: -41 }),
			)
			const afterUpdate = await gyms.findOne({ _id: id })
			expect(afterUpdate?.location).toEqual({
				type: "Point",
				coordinates: [-41, -40],
			})
		})

		it("Review Focus: a gym moved by update is found only around its new place", async () => {
			const id = recorder.newId()
			const cnpj = randomCnpj()
			await repository.save(buildGym({ id, cnpj, latitude: -30, longitude: -30 }))
			await repository.update(
				buildGym({ id, cnpj, latitude: -30.3, longitude: -30 }),
			)

			const aroundOldPlace = await repository.fetchNearbyCoord(around(-30, -30))
			const aroundNewPlace = await repository.fetchNearbyCoord(around(-30.3, -30))

			expect(aroundOldPlace.map((gym) => gym.id)).not.toContain(id)
			expect(aroundNewPlace.map((gym) => gym.id)).toContain(id)
		})
	})
```

`apps/backend/src/shared/infra/database/repository/mongo/mongo-gym-repository.parity.integration-test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { randomCnpj } from "test/repository-contract/gym-repository-contract"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { Gym } from "@/gym/domain/gym"
import { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaGymRepository } from "@/shared/infra/database/repository/prisma/prisma-gym-repository"
import { MongoGymRepository } from "./mongo-gym-repository"

// Center in the open ocean so rows already present in the development databases do not interfere.
const CENTER = Coordinate.restore({ latitude: 0.5, longitude: -30.5 })

describe("gym nearby search parity (Prisma x Mongo)", () => {
	let connection: MongoConnection
	let prismaRepository: PrismaGymRepository
	let mongoRepository: MongoGymRepository
	const recorder = new IdRecorder()
	let nearId: string
	let nearInactiveId: string
	let farId: string

	function buildGym(
		id: string,
		latitude: number,
		longitude: number,
		status: "activated" | "deactivated",
	): Gym {
		return Gym.restore({
			id,
			title: `Parity ${id.slice(0, 8)}`,
			description: "parity",
			phone: "+5511999999999",
			address: "Rua Paridade, 1",
			latitude,
			longitude,
			cnpj: randomCnpj(),
			status,
			operatingHours: null,
		})
	}

	async function nearbyIds(
		repository: PrismaGymRepository | MongoGymRepository,
		options?: { includeInactive?: boolean },
	): Promise<string[]> {
		const ours = new Set([nearId, nearInactiveId, farId])
		const gyms = await repository.fetchNearbyCoord(CENTER, options)
		return gyms
			.map((gym) => gym.id)
			.filter((id) => ours.has(id))
			.sort()
	}

	beforeAll(async () => {
		connection = await createTestMongoConnection()
		prismaRepository = new PrismaGymRepository(prismaClient)
		mongoRepository = new MongoGymRepository(connection)
		nearId = recorder.newId()
		nearInactiveId = recorder.newId()
		farId = recorder.newId()
		// ~1.5 km, ~1.6 km (deactivated) and ~11.1 km from the center.
		const gyms = [
			buildGym(nearId, 0.5135, -30.5, "activated"),
			buildGym(nearInactiveId, 0.5, -30.5145, "deactivated"),
			buildGym(farId, 0.6, -30.5, "activated"),
		]
		for (const gym of gyms) {
			await prismaRepository.save(gym)
			await mongoRepository.save(gym)
		}
	})

	afterAll(async () => {
		await prismaClient.gym.deleteMany({
			where: { id: { in: [...recorder.ids] } },
		})
		await deleteDocumentsReferencing(connection, recorder.ids, [
			{ collection: COLLECTIONS.GYMS, fields: ["_id"] },
		])
		await prismaClient.$disconnect()
		await connection.disconnect()
	})

	it("AC-08: the default search returns the same gyms in both adapters, inactive ones included", async () => {
		const fromPrisma = await nearbyIds(prismaRepository)
		const fromMongo = await nearbyIds(mongoRepository)

		expect(fromMongo).toEqual(fromPrisma)
		expect(fromMongo).toEqual([nearId, nearInactiveId].sort())
	})

	it("AC-08: includeInactive false returns the same active gyms in both adapters", async () => {
		const fromPrisma = await nearbyIds(prismaRepository, { includeInactive: false })
		const fromMongo = await nearbyIds(mongoRepository, { includeInactive: false })

		expect(fromMongo).toEqual(fromPrisma)
		expect(fromMongo).toEqual([nearId])
	})

	it("AC-08: includeInactive true returns the same gyms as the default in both adapters", async () => {
		const fromPrisma = await nearbyIds(prismaRepository, { includeInactive: true })
		const fromMongo = await nearbyIds(mongoRepository, { includeInactive: true })

		expect(fromMongo).toEqual(fromPrisma)
		expect(fromMongo).toEqual([nearId, nearInactiveId].sort())
	})
})
```

- **Step 4: Run tests to verify they fail**

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/repository/in-memory/in-memory-gym-repository.contract.test.ts`
Expected: PASS (6 testes) se o in-memory já cumpre o contrato; qualquer falha é divergência real do in-memory e se corrige lá, nunca relaxando o contrato.

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/prisma/prisma-gym-repository.contract.integration-test.ts`
Expected: PASS (6 testes) se o contrato descreve o comportamento atual do Prisma; falha indica contrato errado e se corrige no contrato.

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-gym-repository.integration-test.ts`
Expected: FAIL with "Failed to resolve import "./mongo-gym-repository""

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-gym-repository.parity.integration-test.ts`
Expected: FAIL with "Failed to resolve import "./mongo-gym-repository""

- **Step 5: Write minimal implementation**

`apps/backend/src/shared/infra/database/repository/mongo/mongo-gym-repository.ts`:

```ts
import { inject, injectable } from "inversify"
import type { ClientSession, Collection, Document, Filter } from "mongodb"
import type {
	FetchGymsInput,
	FetchGymsOutput,
	GymFetchOptions,
	GymRepository,
	SaveGymResult,
} from "@/gym/application/repository/gym-repository"
import { Gym } from "@/gym/domain/gym"
import { GymStatusTypes } from "@/gym/domain/value-object/gym-status"
import { OperatingHours } from "@/gym/domain/value-object/spec-gym-dates.js"
import type { Coordinate } from "@/shared/domain/value-object/coordinate.js"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { escapeRegExp } from "@/shared/infra/database/repository/mongo/escape-regexp"
import { sessionOptions } from "@/shared/infra/database/repository/unit-of-work/mongo-session"
import { MongoUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work"
import { env } from "@/shared/infra/env"
import { InvalidPersistedGymError } from "@/shared/infra/errors/invalid-persisted-gym-error"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"

const NEARBY_RADIUS_METERS = 10_000

export type GeoPoint = { type: "Point"; coordinates: [number, number] }

export function toGeoPoint(latitude: number, longitude: number): GeoPoint {
	return { type: "Point", coordinates: [longitude, latitude] }
}

export type GymDocument = {
	_id: string
	cnpj: string
	title: string
	description: string | null
	phone: string | null
	address: string | null
	image_key: string | null
	latitude: number
	longitude: number
	status: "activated" | "deactivated"
	operating_hours: unknown
	location: GeoPoint
	created_at: Date
	updated_at: Date
}

@injectable()
export class MongoGymRepository implements GymRepository {
	private session: ClientSession | undefined

	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public withTransaction<TX extends object>(tx: TX): GymRepository {
		if (!MongoUnitOfWork.isClientSession(tx)) {
			throw new InvalidTransactionInstance(tx)
		}
		const repository = new MongoGymRepository(this.connection)
		repository.session = tx
		return repository
	}

	public async save(gym: Gym): Promise<SaveGymResult> {
		const now = new Date()
		await this.gyms().insertOne(
			{
				_id: gym.id,
				cnpj: gym.cnpj,
				title: gym.title,
				description: gym.description ?? null,
				phone: gym.phone ? gym.phone.toString() : null,
				address: gym.address ?? null,
				image_key: gym.imageKey ?? null,
				latitude: gym.latitude,
				longitude: gym.longitude,
				status: gym.status,
				operating_hours: gym.operatingHours?.toJSON() ?? null,
				location: toGeoPoint(gym.latitude, gym.longitude),
				created_at: now,
				updated_at: now,
			},
			sessionOptions(this.session),
		)
		return { id: gym.id }
	}

	public async update(gym: Gym): Promise<void> {
		await this.gyms().updateOne(
			{ _id: gym.id },
			{
				$set: {
					title: gym.title,
					description: gym.description ?? null,
					phone: gym.phone ? gym.phone.toString() : null,
					address: gym.address ?? null,
					image_key: gym.imageKey ?? null,
					latitude: gym.latitude,
					longitude: gym.longitude,
					cnpj: gym.cnpj,
					status: gym.status,
					operating_hours: gym.operatingHours?.toJSON() ?? null,
					location: toGeoPoint(gym.latitude, gym.longitude),
					updated_at: new Date(),
				},
			},
			sessionOptions(this.session),
		)
	}

	public async gymOfId(
		id: string,
		options?: GymFetchOptions,
	): Promise<Gym | null> {
		const filter: Filter<GymDocument> = { _id: id }
		if (options?.includeInactive === false) {
			filter.status = GymStatusTypes.ACTIVATED
		}
		const document = await this.gyms().findOne(
			filter,
			sessionOptions(this.session),
		)
		return document ? this.createGym(document) : null
	}

	public async gymOfCNPJ(cnpj: string): Promise<Gym | null> {
		const document = await this.gyms().findOne(
			{ cnpj },
			sessionOptions(this.session),
		)
		return document ? this.createGym(document) : null
	}

	public async fetchGyms(input: FetchGymsInput): Promise<FetchGymsOutput> {
		const filter: Filter<GymDocument> = {}
		if (input.title) {
			filter.title = { $regex: escapeRegExp(input.title), $options: "i" }
		}
		if (input.includeInactive === false) {
			filter.status = GymStatusTypes.ACTIVATED
		}
		const [documents, total] = await Promise.all([
			this.gyms()
				.find(filter, sessionOptions(this.session))
				.sort({ created_at: 1, _id: 1 })
				.skip((input.page - 1) * env.ITEMS_PER_PAGE)
				.limit(env.ITEMS_PER_PAGE)
				.toArray(),
			this.gyms().countDocuments(filter, sessionOptions(this.session)),
		])
		return { items: documents.map((document) => this.createGym(document)), total }
	}

	public async fetchNearbyCoord(
		coordinate: Coordinate,
		options?: GymFetchOptions,
	): Promise<Gym[]> {
		const geoNear: Document = {
			near: toGeoPoint(coordinate.latitude, coordinate.longitude),
			distanceField: "distance_meters",
			maxDistance: NEARBY_RADIUS_METERS,
			spherical: true,
		}
		if (options?.includeInactive === false) {
			geoNear.query = { status: GymStatusTypes.ACTIVATED }
		}
		const documents = await this.gyms()
			.aggregate<GymDocument>([{ $geoNear: geoNear }], sessionOptions(this.session))
			.toArray()
		return documents.map((document) => this.createGym(document))
	}

	private gyms(): Collection<GymDocument> {
		return this.connection.collection<GymDocument>(COLLECTIONS.GYMS)
	}

	private parseOperatingHours(
		rawHours: unknown,
		gymId: string,
	): OperatingHours | null {
		if (rawHours === null || rawHours === undefined) return null
		const result = OperatingHours.createFromUnknown(rawHours)
		if (result.isFailure()) {
			throw new InvalidPersistedGymError(gymId, result.value)
		}
		return result.value
	}

	private createGym(document: GymDocument): Gym {
		return Gym.restore({
			id: document._id,
			title: document.title,
			description: document.description ?? undefined,
			phone: document.phone ? document.phone : undefined,
			address: document.address ?? undefined,
			imageKey: document.image_key ?? undefined,
			latitude: document.latitude,
			longitude: document.longitude,
			cnpj: document.cnpj,
			status: document.status,
			operatingHours: this.parseOperatingHours(
				document.operating_hours,
				document._id,
			),
		})
	}
}
```

- **Step 6: Run tests to verify they pass**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-gym-repository.integration-test.ts`
Expected: PASS (13 testes: 6 do contrato e 7 específicos)

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-gym-repository.parity.integration-test.ts`
Expected: PASS (3 testes; exige Postgres com PostGIS e o MongoDB do compose)

Run: `cd apps/backend && npx vitest --run --config ./test/vite.config.app-domain.ts src/shared/infra/database/repository/in-memory/in-memory-gym-repository.contract.test.ts`
Expected: PASS (6 testes)

- **Step 7: Commit** *(only when `workflow.auto_commit` is true — the implementer's prompt says so; otherwise skip this step and report the files instead.)*

```bash
git add apps/backend/src/shared/infra/database/repository apps/backend/test/repository-contract
git commit -m "feat(backend): repositório de academia no Mongo com busca por proximidade"
```

## Critérios de Sucesso

- AC-08 [int]: WHEN se busca academias a 10 km THEN o resultado é o mesmo do adapter Prisma
- INV-02 [db]: E-mail, CNPJ e `billing_subscription_id` são únicos · Run: `cd apps/backend && npx vitest run --config ./test/vite.config.integration.ts src/shared/infra/database/repository/mongo/mongo-gym-repository.integration-test.ts`
- Nesta task o INV-02 cobre o CNPJ, no teste `INV-02` do repositório Mongo.
- AC-02 [int]: WHEN um e-mail, CNPJ ou check-in do dia repete THEN a resposta é a mesma do provider `prisma`
- Nesta task o AC-02 cobre apenas o CNPJ: o caso de uso consulta `gymOfCNPJ` antes e o índice único bloqueia a duplicata.
- FR-004, FR-006: o `MongoGymRepository` cumpre a porta `GymRepository`, com `includeInactive` aplicado em `gymOfId`, `fetchGyms` e `fetchNearbyCoord`.
- FR-010: a busca a 10 km usa `$geoNear` sobre `location`, gravado e reescrito em todo `save`/`update`.
- `describeGymRepositoryContract` passa em in-memory, Prisma e Mongo.
