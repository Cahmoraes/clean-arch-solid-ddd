import { randomUUID } from "node:crypto"
import { pathToFileURL } from "node:url"
import { initializeMongo } from "@/shared/infra/database/connection/mongo/initialize-mongo"
import { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"
import { MongoCheckInRepository } from "@/shared/infra/database/repository/mongo/mongo-check-in-repository"
import { MongoGymRepository } from "@/shared/infra/database/repository/mongo/mongo-gym-repository"
import { MongoUserRepository } from "@/shared/infra/database/repository/mongo/mongo-user-repository"
import { env } from "@/shared/infra/env"
import { User } from "@/user/domain/user"
import { Password } from "@/user/domain/value-object/password.js"
import { buildSeedData } from "./seed/seed-data-factory"

const SUPER_ADMIN_EMAIL =
	process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@admin.com"
const SUPER_ADMIN_PASSWORD =
	process.env.SEED_SUPER_ADMIN_PASSWORD ?? "admin@admin"
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

function isSeededSuperAdmin(user: User): boolean {
	return (
		user.role === "ADMIN" && user.status === "activated" && user.isSuperAdmin
	)
}

async function buildSuperAdmin(
	existing: User | null,
	now: Date,
): Promise<User> {
	return User.restore({
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
}

async function seedSuperAdmin(
	users: MongoUserRepository,
	now: Date,
): Promise<User> {
	const existing = await users.userOfEmail(SUPER_ADMIN_EMAIL)
	if (existing && isSeededSuperAdmin(existing)) return existing
	const admin = await buildSuperAdmin(existing, now)
	if (!existing) await users.save(admin)
	// save() does not write is_super_admin (same as the Prisma repository), so update() sets it.
	await users.update(admin)
	return admin
}

async function saveMissing<T>(
	items: T[],
	exists: (item: T) => Promise<unknown>,
	save: (item: T) => Promise<unknown>,
): Promise<number> {
	let created = 0
	for (const item of items) {
		if (await exists(item)) continue
		await save(item)
		created += 1
	}
	return created
}

export async function seedMongo(
	connection: MongoConnection,
	options: { now?: Date } = {},
): Promise<SeedMongoResult> {
	const users = new MongoUserRepository(connection)
	const gyms = new MongoGymRepository(connection)
	const checkIns = new MongoCheckInRepository(connection)

	// The super admin's createdAt is persisted on the first run, so it anchors the
	// generated dates across runs: a resume on another day regenerates identical data.
	const superAdmin = await seedSuperAdmin(users, options.now ?? new Date())
	const data = buildSeedData({
		memberPasswordHash: await hashPassword(MEMBER_PASSWORD),
		now: superAdmin.createdAt,
	})
	const usersCreated = await saveMissing(
		data.users,
		(user) => users.userOfId(user.id),
		(user) => users.save(user),
	)
	const gymsCreated = await saveMissing(
		data.gyms,
		(gym) => gyms.gymOfId(gym.id),
		(gym) => gyms.save(gym),
	)
	const checkInsCreated = await saveMissing(
		data.checkIns,
		(checkIn) => checkIns.checkOfById(checkIn.id),
		(checkIn) => checkIns.save(checkIn),
	)
	return {
		superAdminEmail: SUPER_ADMIN_EMAIL,
		usersCreated,
		gymsCreated,
		checkInsCreated,
		skippedRandomSeeding: usersCreated + gymsCreated + checkInsCreated === 0,
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

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	main().catch((error) => {
		console.error("Seed failed:", error)
		process.exit(1)
	})
}
