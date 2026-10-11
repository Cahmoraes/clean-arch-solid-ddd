import { randomUUID } from "node:crypto"
import { inject, injectable } from "inversify"
import type { ClientSession, Collection, Filter } from "mongodb"
import type {
	FindManyNotificationsInput,
	FindManyNotificationsOutput,
	NotificationRepository,
	SaveNotificationResponse,
} from "@/notification/application/repository/notification.repository.js"
import {
	Notification,
	type NotificationType,
} from "@/notification/domain/notification.js"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import {
	runInTransaction,
	sessionOptions,
} from "@/shared/infra/database/repository/unit-of-work/mongo-session"
import { MongoUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work"
import { env } from "@/shared/infra/env/index.js"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"

export type NotificationDocument = {
	_id: string
	user_id: string
	type: NotificationType
	title: string
	message: string
	gym_name: string | null
	reason: string | null
	created_at: Date
	updated_at: Date
}

export type UserNotificationDocument = {
	_id: string
	notification_id: string
	user_id: string
	read_at: Date | null
	deleted_at: Date | null
	created_at: Date
	updated_at: Date
}

type UserNotificationWithNotification = UserNotificationDocument & {
	notification: NotificationDocument
}

@injectable()
export class MongoNotificationRepository implements NotificationRepository {
	private session: ClientSession | undefined

	constructor(
		@inject(SHARED_TYPES.Mongo.Connection)
		private readonly connection: MongoConnection,
	) {}

	public withTransaction<TX extends object>(tx: TX): NotificationRepository {
		if (!MongoUnitOfWork.isClientSession(tx)) {
			throw new InvalidTransactionInstance(tx)
		}
		const repository = new MongoNotificationRepository(this.connection)
		repository.session = tx
		return repository
	}

	public async save(
		notification: Notification,
	): Promise<SaveNotificationResponse> {
		await runInTransaction(this.connection, this.session, async (session) => {
			await this.notifications().updateOne(
				{ _id: notification.id },
				{
					$set: { updated_at: notification.updatedAt },
					$setOnInsert: {
						user_id: notification.userId,
						type: notification.type,
						title: notification.title,
						message: notification.message,
						gym_name: notification.gymName ?? null,
						reason: notification.reason ?? null,
						created_at: notification.createdAt,
					},
				},
				{ upsert: true, session },
			)
			await this.userNotifications().updateOne(
				{ notification_id: notification.id, user_id: notification.userId },
				{
					$set: {
						read_at: notification.readAt ?? null,
						deleted_at: notification.deletedAt ?? null,
						updated_at: notification.updatedAt,
					},
					$setOnInsert: {
						_id: randomUUID(),
						created_at: notification.createdAt,
					},
				},
				{ upsert: true, session },
			)
		})
		return { id: notification.id }
	}

	public async saveMany(notifications: Notification[]): Promise<void> {
		if (notifications.length === 0) return
		await runInTransaction(this.connection, this.session, async (session) => {
			await this.notifications().insertMany(
				notifications.map((notification) => ({
					_id: notification.id,
					user_id: notification.userId,
					type: notification.type,
					title: notification.title,
					message: notification.message,
					gym_name: notification.gymName ?? null,
					reason: notification.reason ?? null,
					created_at: notification.createdAt,
					updated_at: notification.updatedAt,
				})),
				{ session },
			)
			await this.userNotifications().insertMany(
				notifications.map((notification) => ({
					_id: randomUUID(),
					notification_id: notification.id,
					user_id: notification.userId,
					read_at: notification.readAt ?? null,
					deleted_at: notification.deletedAt ?? null,
					created_at: notification.createdAt,
					updated_at: notification.updatedAt,
				})),
				{ session },
			)
		})
	}

	public async findById(id: string): Promise<Notification | null> {
		const notification = await this.notifications().findOne(
			{ _id: id },
			sessionOptions(this.session),
		)
		if (!notification) return null
		const userNotification = await this.userNotifications().findOne(
			{ notification_id: id },
			sessionOptions(this.session),
		)
		return this.toDomain(notification, userNotification)
	}

	public async findManyByUserId(
		input: FindManyNotificationsInput,
	): Promise<FindManyNotificationsOutput> {
		const match = this.buildMatch(input)
		const { skip, take } = this.resolvePagination(input)
		const [rows, total] = await Promise.all([
			this.userNotifications()
				.aggregate<UserNotificationWithNotification>(
					[
						{ $match: match },
						{
							$lookup: {
								from: COLLECTIONS.NOTIFICATIONS,
								localField: "notification_id",
								foreignField: "_id",
								as: "notification",
							},
						},
						{ $unwind: "$notification" },
						{
							$sort: { "notification.created_at": -1, "notification._id": -1 },
						},
						{ $skip: skip },
						{ $limit: take },
					],
					sessionOptions(this.session),
				)
				.toArray(),
			this.userNotifications().countDocuments(
				match,
				sessionOptions(this.session),
			),
		])
		return {
			items: rows.map(({ notification, ...userNotification }) =>
				this.toDomain(notification, userNotification),
			),
			total,
		}
	}

	public async countUnreadByUserId(userId: string): Promise<number> {
		return this.userNotifications().countDocuments(
			{ user_id: userId, read_at: null, deleted_at: null },
			sessionOptions(this.session),
		)
	}

	public async markAllAsReadByUserId(userId: string): Promise<void> {
		const now = new Date()
		await this.userNotifications().updateMany(
			{ user_id: userId, read_at: null, deleted_at: null },
			{ $set: { read_at: now, updated_at: now } },
			sessionOptions(this.session),
		)
	}

	private notifications(): Collection<NotificationDocument> {
		return this.connection.collection<NotificationDocument>(
			COLLECTIONS.NOTIFICATIONS,
		)
	}

	private userNotifications(): Collection<UserNotificationDocument> {
		return this.connection.collection<UserNotificationDocument>(
			COLLECTIONS.USER_NOTIFICATIONS,
		)
	}

	private buildMatch(
		input: FindManyNotificationsInput,
	): Filter<UserNotificationDocument> {
		const match: Filter<UserNotificationDocument> = {
			user_id: input.userId,
			deleted_at: null,
		}
		if (input.onlyUnread) match.read_at = null
		return match
	}

	private resolvePagination(input: FindManyNotificationsInput): {
		skip: number
		take: number
	} {
		if (input.offset !== undefined && input.limit !== undefined) {
			return { skip: input.offset, take: input.limit }
		}
		return {
			skip: (input.page - 1) * env.ITEMS_PER_PAGE,
			take: env.ITEMS_PER_PAGE,
		}
	}

	private toDomain(
		notification: NotificationDocument,
		userNotification: UserNotificationDocument | null,
	): Notification {
		return Notification.restore({
			id: notification._id,
			userId: notification.user_id,
			type: notification.type,
			title: notification.title,
			message: notification.message,
			gymName: notification.gym_name ?? undefined,
			reason: notification.reason ?? undefined,
			readAt: userNotification?.read_at ?? undefined,
			deletedAt: userNotification?.deleted_at ?? undefined,
			createdAt: notification.created_at,
			updatedAt: notification.updated_at,
		})
	}
}
