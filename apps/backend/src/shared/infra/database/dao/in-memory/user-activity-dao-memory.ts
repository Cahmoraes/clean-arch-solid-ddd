import { injectable } from "inversify"
import type {
	UserActivityDao,
	UserActivityItem,
	UserActivityPage,
} from "@/user/application/persistence/dao/user-activity-dao"

@injectable()
export class InMemoryUserActivityDao implements UserActivityDao {
	private readonly items: UserActivityItem[]

	constructor(initialItems: UserActivityItem[] = []) {
		this.items = [...initialItems]
	}

	public async findActivityPage(
		_userId: string,
		page: number,
		pageSize: number,
	): Promise<UserActivityPage> {
		const sortedItems = [...this.items].sort((a, b) => {
			const occurredAtDifference =
				b.occurredAt.getTime() - a.occurredAt.getTime()
			if (occurredAtDifference !== 0) return occurredAtDifference
			return Number(b.id > a.id) - Number(b.id < a.id)
		})
		const total = sortedItems.length
		const skip = (page - 1) * pageSize
		if (!Number.isSafeInteger(skip)) {
			return {
				items: [],
				pagination: {
					page,
					pageSize,
					total,
					totalPages: Math.ceil(total / pageSize),
				},
			}
		}

		return {
			items: sortedItems.slice(skip, skip + pageSize),
			pagination: {
				page,
				pageSize,
				total,
				totalPages: Math.ceil(total / pageSize),
			},
		}
	}
}
