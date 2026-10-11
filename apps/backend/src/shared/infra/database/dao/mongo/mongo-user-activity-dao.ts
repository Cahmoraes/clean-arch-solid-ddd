import { inject, injectable } from "inversify"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import type { CheckInDocument } from "@/shared/infra/database/repository/mongo/mongo-check-in-repository"
import type { UserActivityEventDocument } from "@/shared/infra/database/repository/mongo/mongo-user-activity-repository"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type {
	UserActivityDao,
	UserActivityItem,
	UserActivityItemType,
	UserActivityPage,
} from "@/user/application/persistence/dao/user-activity-dao"

type GymTitleDocument = { _id: string; title: string }

@injectable()
export class MongoUserActivityDao implements UserActivityDao {
	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public async findActivityPage(
		userId: string,
		page: number,
		pageSize: number,
	): Promise<UserActivityPage> {
		const events = this.connection.collection<UserActivityEventDocument>(
			COLLECTIONS.USER_ACTIVITY_EVENTS,
		)
		const checkIns = this.connection.collection<CheckInDocument>(
			COLLECTIONS.CHECK_INS,
		)
		const [activityEventsTotal, checkInsTotal] = await Promise.all([
			events.countDocuments({ user_id: userId }),
			checkIns.countDocuments({ user_id: userId }),
		])
		const total = activityEventsTotal + checkInsTotal
		const totalPages = Math.ceil(total / pageSize)
		const pagination = { page, pageSize, total, totalPages }

		// Count first: out-of-range pages keep 200 + metadata without oversized queries.
		if (page > totalPages) return { items: [], pagination }

		const skip = (page - 1) * pageSize
		if (!Number.isSafeInteger(skip)) return { items: [], pagination }
		const sourceTake = skip + pageSize
		const [eventDocuments, checkInDocuments] = await Promise.all([
			events
				.find({ user_id: userId })
				.sort({ occurred_at: -1, _id: -1 })
				.limit(Math.min(sourceTake, activityEventsTotal))
				.toArray(),
			checkIns
				.find({ user_id: userId })
				.sort({ created_at: -1, _id: -1 })
				.limit(Math.min(sourceTake, checkInsTotal))
				.toArray(),
		])
		const gymTitles = await this.loadGymTitles(
			checkInDocuments.map((checkIn) => checkIn.gym_id),
		)

		const mappedEvents: UserActivityItem[] = eventDocuments.map((event) => ({
			id: event._id,
			type: event.type as UserActivityItemType,
			description: event.description,
			occurredAt: event.occurred_at,
		}))
		const mappedCheckIns: UserActivityItem[] = checkInDocuments.map(
			(checkIn) => {
				const title = gymTitles.get(checkIn.gym_id)
				if (title === undefined) {
					throw new Error(
						`Gym ${checkIn.gym_id} of check-in ${checkIn._id} was not found`,
					)
				}
				return {
					id: checkIn._id,
					type: "CHECK_IN",
					description: `Check-in — ${title}`,
					occurredAt: checkIn.created_at,
				}
			},
		)

		const items = [...mappedEvents, ...mappedCheckIns]
			.sort((a, b) => {
				const occurredAtDifference =
					b.occurredAt.getTime() - a.occurredAt.getTime()
				if (occurredAtDifference !== 0) return occurredAtDifference
				return Number(b.id > a.id) - Number(b.id < a.id)
			})
			.slice(skip, skip + pageSize)

		return { items, pagination }
	}

	private async loadGymTitles(gymIds: string[]): Promise<Map<string, string>> {
		if (gymIds.length === 0) return new Map()
		const gyms = await this.connection
			.collection<GymTitleDocument>(COLLECTIONS.GYMS)
			.find(
				{ _id: { $in: [...new Set(gymIds)] } },
				{ projection: { title: 1 } },
			)
			.toArray()
		return new Map(gyms.map((gym) => [gym._id, gym.title]))
	}
}
