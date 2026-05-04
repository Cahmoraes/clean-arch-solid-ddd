import ExtendedSet from "@cahmoraes93/extended-set"
import { injectable } from "inversify"

import type {
	CheckInRepository,
	FindManyInput,
	FindManyOutput,
	SaveResponse,
} from "@/check-in/application/repository/check-in-repository"
import { CheckIn } from "@/check-in/domain/check-in"
import { env } from "@/shared/infra/env"

@injectable()
export class InMemoryCheckInRepository implements CheckInRepository {
	public ITEMS_PER_PAGE = 20

	public checkIns = new ExtendedSet<CheckIn>()

	public withTransaction(): CheckInRepository {
		return this
	}

	public async save(checkIn: CheckIn): Promise<SaveResponse> {
		const checkInWithId = CheckIn.restore({
			id: checkIn.id,
			userId: checkIn.userId,
			gymId: checkIn.gymId,
			createdAt: new Date(),
			validatedAt: checkIn.validatedAt,
			userLatitude: checkIn.latitude,
			userLongitude: checkIn.longitude,
			isValidated: false,
		})
		this.checkIns.add(checkInWithId)
		return {
			id: checkIn.id,
		}
	}

	public async checkOfById(id: string): Promise<CheckIn | null> {
		return this.checkIns.find((checkIn) => checkIn.id === id)
	}

	public async onSameDateOfUserId(
		userId: string,
		date: Date,
	): Promise<boolean> {
		const startOfDay = new Date(date)
		startOfDay.setHours(0, 0, 0, 0)
		const endOfDay = new Date(date)
		endOfDay.setHours(23, 59, 59, 999)
		return this.checkIns.some((checkIn) => {
			const checkInDate = checkIn.createdAt
			const isSameUserId = checkIn.userId === userId
			const checkInOnRangeDate =
				checkInDate >= startOfDay && checkInDate <= endOfDay
			return isSameUserId && checkInOnRangeDate
		})
	}

	public async findMany(input: FindManyInput): Promise<FindManyOutput> {
		let filtered = this.checkIns.toArray()
		if (input.userId) {
			filtered = filtered.filter((checkIn) => checkIn.userId === input.userId)
		}
		if (input.status === "pending") {
			filtered = filtered.filter((checkIn) => !checkIn.isValidated)
		} else if (input.status === "validated") {
			filtered = filtered.filter((checkIn) => checkIn.isValidated)
		}
		const total = filtered.length
		const start = (input.page - 1) * env.ITEMS_PER_PAGE
		const items = filtered.slice(start, start + env.ITEMS_PER_PAGE)
		return { items, total }
	}
}
