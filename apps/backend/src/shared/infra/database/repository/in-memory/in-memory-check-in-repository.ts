import ExtendedSet from "@cahmoraes93/extended-set"
import { injectable } from "inversify"
import type {
	CheckInRepository,
	CheckInStats,
	FindManyInput,
	FindManyOutput,
	SaveResponse,
} from "@/check-in/application/repository/check-in-repository"
import type { CheckIn } from "@/check-in/domain/check-in"
import { env } from "@/shared/infra/env"

@injectable()
export class InMemoryCheckInRepository implements CheckInRepository {
	public ITEMS_PER_PAGE = 20

	public checkIns = new ExtendedSet<CheckIn>()

	public withTransaction(): CheckInRepository {
		return this
	}

	public async save(checkIn: CheckIn): Promise<SaveResponse> {
		const existing = this.checkIns.find((item) => item.id === checkIn.id)
		if (existing) {
			this.checkIns.delete(existing)
		}
		this.checkIns.add(checkIn)
		return {
			id: checkIn.id,
		}
	}

	public async checkOfById(id: string): Promise<CheckIn | null> {
		return this.checkIns.find((checkIn) => checkIn.id === id) ?? null
	}

	public async onSameDateOfUserId(
		userId: string,
		date: Date,
	): Promise<boolean> {
		const startOfDay = new Date(date)
		startOfDay.setHours(0, 0, 0, 0)
		const startOfNextDay = new Date(startOfDay)
		startOfNextDay.setDate(startOfNextDay.getDate() + 1)
		return this.checkIns.some((checkIn) => {
			const checkInDate = checkIn.createdAt
			const isSameUserId = checkIn.userId === userId
			const checkInOnRangeDate =
				checkInDate >= startOfDay && checkInDate < startOfNextDay
			return isSameUserId && checkInOnRangeDate
		})
	}

	public async countByStatus(userId?: string): Promise<CheckInStats> {
		const all = userId
			? this.checkIns.toArray().filter((c) => c.userId === userId)
			: this.checkIns.toArray()
		const total = all.length
		const pending = all.filter((c) => c.status === "pending").length
		const validated = all.filter((c) => c.status === "validated").length
		const rejected = all.filter((c) => c.status === "rejected").length
		return { total, pending, validated, rejected }
	}

	public async findMany(input: FindManyInput): Promise<FindManyOutput> {
		let filtered = this.checkIns.toArray()
		if (input.userId) {
			filtered = filtered.filter((checkIn) => checkIn.userId === input.userId)
		}
		if (input.status) {
			filtered = filtered.filter((checkIn) => checkIn.status === input.status)
		}
		if (input.sortOrder) {
			filtered = filtered.sort((a, b) => {
				const diff = a.createdAt.getTime() - b.createdAt.getTime()
				return input.sortOrder === "asc" ? diff : -diff
			})
		}
		const total = filtered.length
		const start = (input.page - 1) * env.ITEMS_PER_PAGE
		const items = filtered.slice(start, start + env.ITEMS_PER_PAGE)
		return { items, total }
	}
}
