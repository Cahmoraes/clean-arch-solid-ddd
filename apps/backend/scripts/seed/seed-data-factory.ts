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
const DAY_POOL = Array.from(
	{ length: CHECK_IN_DAY_WINDOW },
	(_, index) => index + 1,
)

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
