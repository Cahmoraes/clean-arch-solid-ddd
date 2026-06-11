import { inject, injectable } from "inversify"

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
import type {
	Prisma,
	PrismaClient,
} from "@/shared/infra/database/generated/prisma/client"
import { PrismaUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/prisma-unit-of-work.js"
import { env } from "@/shared/infra/env/index.js"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"

@injectable()
export class PrismaNotificationRepository implements NotificationRepository {
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prismaClient: PrismaClient | Prisma.TransactionClient,
	) {}

	public withTransaction<TX extends object>(
		prismaClient: TX,
	): NotificationRepository {
		if (PrismaUnitOfWork.isClientTransaction(prismaClient)) {
			return new PrismaNotificationRepository(prismaClient)
		}
		throw new InvalidTransactionInstance(prismaClient)
	}

	public async save(
		notification: Notification,
	): Promise<SaveNotificationResponse> {
		await this.prismaClient.notification.upsert({
			where: { id: notification.id },
			create: this.toCreateInput(notification),
			update: this.toUpdateInput(notification),
		})
		return { id: notification.id }
	}

	private toCreateInput(notification: Notification) {
		return {
			id: notification.id,
			userId: notification.userId,
			type: notification.type,
			title: notification.title,
			message: notification.message,
			gymName: notification.gymName ?? null,
			reason: notification.reason ?? null,
			createdAt: notification.createdAt,
			updatedAt: notification.updatedAt,
			userNotifications: {
				create: {
					userId: notification.userId,
					readAt: notification.readAt ?? null,
					deletedAt: notification.deletedAt ?? null,
					createdAt: notification.createdAt,
					updatedAt: notification.updatedAt,
				},
			},
		}
	}

	private toUpdateInput(notification: Notification) {
		return {
			updatedAt: notification.updatedAt,
			userNotifications: {
				updateMany: {
					where: { userId: notification.userId },
					data: {
						readAt: notification.readAt ?? null,
						deletedAt: notification.deletedAt ?? null,
						updatedAt: notification.updatedAt,
					},
				},
			},
		}
	}

	public async findById(id: string): Promise<Notification | null> {
		const data = await this.prismaClient.notification.findUnique({
			where: { id },
			include: { userNotifications: { take: 1 } },
		})
		if (!data) return null
		return this.toDomain(data)
	}

	public async findManyByUserId(
		input: FindManyNotificationsInput,
	): Promise<FindManyNotificationsOutput> {
		const where = this.buildWhere(input)

		const [rows, total] = await Promise.all([
			this.prismaClient.notification.findMany({
				where,
				include: {
					userNotifications: {
						where: { userId: input.userId },
						take: 1,
					},
				},
				skip: (input.page - 1) * env.ITEMS_PER_PAGE,
				take: env.ITEMS_PER_PAGE,
				orderBy: { createdAt: "desc" },
			}),
			this.prismaClient.notification.count({ where }),
		])

		return {
			items: rows.map((row) => this.toDomain(row)),
			total,
		}
	}

	private buildWhere(
		input: FindManyNotificationsInput,
	): Prisma.NotificationWhereInput {
		return {
			userNotifications: {
				some: {
					userId: input.userId,
					deletedAt: null,
					...(input.onlyUnread ? { readAt: null } : {}),
				},
			},
		}
	}

	public async countUnreadByUserId(userId: string): Promise<number> {
		return this.prismaClient.userNotification.count({
			where: {
				userId,
				readAt: null,
				deletedAt: null,
			},
		})
	}

	public async markAllAsReadByUserId(userId: string): Promise<void> {
		await this.prismaClient.userNotification.updateMany({
			where: {
				userId,
				readAt: null,
				deletedAt: null,
			},
			data: {
				readAt: new Date(),
				updatedAt: new Date(),
			},
		})
	}

	private toDomain(row: {
		id: string
		userId: string
		type: NotificationType
		title: string
		message: string
		gymName: string | null
		reason: string | null
		createdAt: Date
		updatedAt: Date
		userNotifications: Array<{
			readAt: Date | null
			deletedAt: Date | null
		}>
	}): Notification {
		const un = row.userNotifications[0]
		return Notification.restore({
			id: row.id,
			userId: row.userId,
			type: row.type,
			title: row.title,
			message: row.message,
			gymName: row.gymName ?? undefined,
			reason: row.reason ?? undefined,
			readAt: un?.readAt ?? undefined,
			deletedAt: un?.deletedAt ?? undefined,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		})
	}
}
