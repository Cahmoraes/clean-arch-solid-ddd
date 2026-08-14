import { injectable } from "inversify"
import type {
	UserActivityDao,
	UserActivityItem,
} from "@/user/application/persistence/dao/user-activity-dao"

@injectable()
export class InMemoryUserActivityDao implements UserActivityDao {
	private readonly items: UserActivityItem[]

	constructor(initialItems: UserActivityItem[] = []) {
		this.items = [...initialItems]
	}

	public async findRecentActivity(
		_userId: string,
		limit: number,
	): Promise<UserActivityItem[]> {
		return [...this.items]
			.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
			.slice(0, limit)
	}
}
