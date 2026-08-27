import { inject, injectable } from "inversify"
import type { PrismaClient } from "@/shared/infra/database/generated/prisma/client"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type {
	UserActivityDao,
	UserActivityItem,
	UserActivityItemType,
	UserActivityPage,
} from "@/user/application/persistence/dao/user-activity-dao"

@injectable()
export class PrismaUserActivityDao implements UserActivityDao {
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prisma: PrismaClient,
	) {}

	public async findActivityPage(
		userId: string,
		page: number,
		pageSize: number,
	): Promise<UserActivityPage> {
		const skip = (page - 1) * pageSize
		const sourceTake = skip + pageSize
		const [activityEvents, checkIns, activityEventsTotal, checkInsTotal] =
			await Promise.all([
				this.prisma.userActivityEvent.findMany({
					where: { userId },
					orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
					take: sourceTake,
				}),
				this.prisma.checkIn.findMany({
					where: { user_id: userId },
					orderBy: [{ created_at: "desc" }, { id: "desc" }],
					take: sourceTake,
					include: { gym: true },
				}),
				this.prisma.userActivityEvent.count({ where: { userId } }),
				this.prisma.checkIn.count({ where: { user_id: userId } }),
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

		const total = activityEventsTotal + checkInsTotal
		const items = [...mappedEvents, ...mappedCheckIns]
			.sort((a, b) => {
				const occurredAtDifference =
					b.occurredAt.getTime() - a.occurredAt.getTime()
				if (occurredAtDifference !== 0) return occurredAtDifference
				return Number(b.id > a.id) - Number(b.id < a.id)
			})
			.slice(skip, skip + pageSize)

		return {
			items,
			pagination: {
				page,
				pageSize,
				total,
				totalPages: Math.ceil(total / pageSize),
			},
		}
	}
}
