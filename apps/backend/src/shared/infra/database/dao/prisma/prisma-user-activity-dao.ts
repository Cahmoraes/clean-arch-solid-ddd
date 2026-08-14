import { inject, injectable } from "inversify"
import type { PrismaClient } from "@/shared/infra/database/generated/prisma/client"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type {
	UserActivityDao,
	UserActivityItem,
	UserActivityItemType,
} from "@/user/application/persistence/dao/user-activity-dao"

@injectable()
export class PrismaUserActivityDao implements UserActivityDao {
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prisma: PrismaClient,
	) {}

	public async findRecentActivity(
		userId: string,
		limit: number,
	): Promise<UserActivityItem[]> {
		const [activityEvents, checkIns] = await Promise.all([
			this.prisma.userActivityEvent.findMany({
				where: { userId },
				orderBy: { occurredAt: "desc" },
				take: limit,
			}),
			this.prisma.checkIn.findMany({
				where: { user_id: userId },
				orderBy: { created_at: "desc" },
				take: limit,
				include: { gym: true },
			}),
		])

		const mappedEvents: UserActivityItem[] = activityEvents.map((event) => ({
			id: event.id,
			type: event.type as UserActivityItemType,
			description: event.description,
			occurredAt: event.occurredAt,
		}))

		const mappedCheckIns: UserActivityItem[] = checkIns.map((checkIn) => ({
			id: checkIn.id,
			type: "CHECK_IN",
			description: `Check-in — ${checkIn.gym.title}`,
			occurredAt: checkIn.created_at,
		}))

		return [...mappedEvents, ...mappedCheckIns]
			.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
			.slice(0, limit)
	}
}
