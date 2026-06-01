import { faker } from "@faker-js/faker"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { Password } from "@/user/domain/value-object/password.js"

const SUPER_ADMIN_EMAIL =
	process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@admin.com"
const SUPER_ADMIN_PASSWORD =
	process.env.SEED_SUPER_ADMIN_PASSWORD ?? "admin@admin"
const SUPER_ADMIN_NAME = "Super Admin"

const USER_COUNT = 50
const GYM_COUNT = 50
const MEMBER_PASSWORD = "Member123!"
const MAX_CHECK_INS_PER_USER = 8
const CHECK_IN_DAY_WINDOW = 90
const USER_STATUSES = [
	"activated",
	"activated",
	"activated",
	"suspended",
] as const
const CHECK_IN_OUTCOMES = [
	"approved",
	"approved",
	"approved",
	"rejected",
	"pending",
] as const

type CheckInOutcome = (typeof CHECK_IN_OUTCOMES)[number]

async function hashPassword(rawPassword: string): Promise<string> {
	const passwordResult = await Password.create(rawPassword)
	if (passwordResult.isFailure()) {
		throw new Error(`Invalid seed password: ${passwordResult.value.message}`)
	}
	return passwordResult.value.value
}

async function seedSuperAdmin(): Promise<void> {
	const passwordHash = await hashPassword(SUPER_ADMIN_PASSWORD)
	const user = await prismaClient.user.upsert({
		where: { email: SUPER_ADMIN_EMAIL },
		update: {
			role: "ADMIN",
			status: "activated",
			is_super_admin: true,
			deleted_at: null,
		},
		create: {
			name: SUPER_ADMIN_NAME,
			email: SUPER_ADMIN_EMAIL,
			password_hash: passwordHash,
			role: "ADMIN",
			status: "activated",
			is_super_admin: true,
		},
	})
	console.log(`Seed: super admin ready -> ${user.email} (${user.role})`)
}

async function seedUsers(): Promise<void> {
	const passwordHash = await hashPassword(MEMBER_PASSWORD)
	const data = Array.from({ length: USER_COUNT }, (_, index) => {
		const sex = faker.person.sexType()
		const firstName = faker.person.firstName(sex)
		const lastName = faker.person.lastName(sex)
		return {
			name: faker.person.fullName({ firstName, lastName, sex }),
			email: `member${index + 1}@example.com`,
			password_hash: passwordHash,
			role: "MEMBER" as const,
			status: faker.helpers.arrayElement(USER_STATUSES),
			created_at: faker.date.past({ years: 1 }),
		}
	})
	await prismaClient.user.createMany({ data, skipDuplicates: true })
	console.log(
		`Seed: ${data.length} random members created (pw ${MEMBER_PASSWORD})`,
	)
}

async function seedGyms(): Promise<void> {
	const data = Array.from({ length: GYM_COUNT }, (_, index) => ({
		cnpj: String(index + 1).padStart(14, "0"),
		title: `${faker.company.name()} Gym`,
		description: faker.company.catchPhrase(),
		phone: faker.phone.number(),
		address: faker.location.streetAddress({ useFullAddress: true }),
		latitude: faker.location.latitude(),
		longitude: faker.location.longitude(),
	}))
	await prismaClient.gym.createMany({ data, skipDuplicates: true })
	console.log(`Seed: ${data.length} random gyms created`)
}

function buildCheckInDates(
	createdAt: Date,
	outcome: CheckInOutcome,
): {
	validated_at: Date | null
	rejected_at: Date | null
} {
	if (outcome === "approved") {
		return {
			validated_at: faker.date.soon({ days: 1, refDate: createdAt }),
			rejected_at: null,
		}
	}
	if (outcome === "rejected") {
		return {
			validated_at: null,
			rejected_at: faker.date.soon({ days: 1, refDate: createdAt }),
		}
	}
	return { validated_at: null, rejected_at: null }
}

function buildCreatedAtFromOffset(daysAgo: number): Date {
	// Build at noon UTC so the offset maps bijectively to date(created_at) in the
	// DB — a near-midnight local time would shift across a day on UTC conversion
	// and collide with check_ins_user_day_unique.
	const now = new Date()
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

const DAY_POOL = Array.from(
	{ length: CHECK_IN_DAY_WINDOW },
	(_, index) => index + 1,
)

async function seedCheckIns(): Promise<void> {
	const members = await prismaClient.user.findMany({
		where: { role: "MEMBER" },
		select: { id: true },
	})
	const gyms = await prismaClient.gym.findMany({
		select: { id: true, latitude: true, longitude: true },
	})
	if (members.length === 0 || gyms.length === 0) {
		console.log("Seed: skipping check-ins (no members or gyms)")
		return
	}

	const data = members.flatMap((member) => {
		const total = faker.number.int({ min: 0, max: MAX_CHECK_INS_PER_USER })
		// Unique day offsets per user: check_ins_user_day_unique allows only one
		// check-in per (user_id, calendar day).
		const dayOffsets = faker.helpers.arrayElements(DAY_POOL, total)
		return dayOffsets.map((daysAgo) => {
			const gym = faker.helpers.arrayElement(gyms)
			const createdAt = buildCreatedAtFromOffset(daysAgo)
			const outcome = faker.helpers.arrayElement(CHECK_IN_OUTCOMES)
			return {
				user_id: member.id,
				gym_id: gym.id,
				latitude: gym.latitude,
				longitude: gym.longitude,
				created_at: createdAt,
				...buildCheckInDates(createdAt, outcome),
			}
		})
	})

	await prismaClient.checkIn.createMany({ data })
	const approved = data.filter((row) => row.validated_at !== null).length
	const rejected = data.filter((row) => row.rejected_at !== null).length
	const pending = data.length - approved - rejected
	console.log(
		`Seed: ${data.length} check-ins created (approved ${approved}, rejected ${rejected}, pending ${pending})`,
	)
}

async function main(): Promise<void> {
	faker.seed(42)
	await seedSuperAdmin()

	const existingGyms = await prismaClient.gym.count()
	if (existingGyms >= GYM_COUNT) {
		console.log("Seed: sample data already present, skipping random seeding")
		return
	}

	await seedUsers()
	await seedGyms()
	await seedCheckIns()
}

main()
	.catch((error) => {
		console.error("Seed failed:", error)
		process.exit(1)
	})
	.finally(async () => {
		await prismaClient.$disconnect()
	})
