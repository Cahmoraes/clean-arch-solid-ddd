import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { deleteDocumentsReferencing } from "test/mongo/delete-documents-referencing"
import { IdRecorder } from "test/repository-contract/id-recorder"
import {
	buildNotificationProps,
	describeNotificationRepositoryContract,
	type NotificationProps,
} from "test/repository-contract/notification-repository-contract"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"
import { Notification } from "@/notification/domain/notification.js"
import {
	COLLECTIONS,
	type MongoConnection,
} from "@/shared/infra/database/connection/mongo/mongo-connection"
import { MongoUnitOfWork } from "@/shared/infra/database/repository/unit-of-work/mongo-unit-of-work"
import { InvalidTransactionInstance } from "@/shared/infra/errors/invalid-transaction-instance-error"
import {
	MongoNotificationRepository,
	type NotificationDocument,
	type UserNotificationDocument,
} from "./mongo-notification.repository"

const CLEANUP_TARGETS = [
	{ collection: COLLECTIONS.NOTIFICATIONS, fields: ["_id", "user_id"] },
	{
		collection: COLLECTIONS.USER_NOTIFICATIONS,
		fields: ["notification_id", "user_id"],
	},
]

describe("MongoNotificationRepository", () => {
	let connection: MongoConnection
	let repository: MongoNotificationRepository
	const recorder = new IdRecorder()

	function build(
		userId: string,
		overrides: Partial<NotificationProps> = {},
	): Notification {
		const id = overrides.id ?? recorder.newId()
		return Notification.restore(buildNotificationProps(id, userId, overrides))
	}

	beforeAll(async () => {
		connection = await createTestMongoConnection()
		repository = new MongoNotificationRepository(connection)
	})

	afterAll(async () => {
		await connection.disconnect()
	})

	describeNotificationRepositoryContract("mongo", async () => {
		const contractRecorder = new IdRecorder()
		return {
			repository: new MongoNotificationRepository(connection),
			newId: () => contractRecorder.newId(),
			ensureReferences: async () => {},
			cleanup: () =>
				deleteDocumentsReferencing(
					connection,
					contractRecorder.ids,
					CLEANUP_TARGETS,
				),
		}
	})

	describe("mongo specifics", () => {
		afterEach(() =>
			deleteDocumentsReferencing(connection, recorder.ids, CLEANUP_TARGETS),
		)

		it("FR-009: save writes the notification and its user notification", async () => {
			const userId = recorder.newId()
			const notification = build(userId)

			await repository.save(notification)

			const notifications = connection.collection<NotificationDocument>(
				COLLECTIONS.NOTIFICATIONS,
			)
			const userNotifications = connection.collection<UserNotificationDocument>(
				COLLECTIONS.USER_NOTIFICATIONS,
			)
			expect(
				await notifications.findOne({ _id: notification.id }),
			).toMatchObject({
				user_id: userId,
				type: "NOTICE",
				title: "Contract notice",
				gym_name: null,
				reason: null,
			})
			expect(
				await userNotifications.countDocuments({
					notification_id: notification.id,
				}),
			).toBe(1)
		})

		it("FR-009: saving the same notification again updates its user notification instead of creating another", async () => {
			const userId = recorder.newId()
			const id = recorder.newId()
			await repository.save(build(userId, { id }))

			await repository.save(
				build(userId, { id, readAt: new Date("2026-05-10T13:00:00.000Z") }),
			)

			const userNotifications = connection.collection<UserNotificationDocument>(
				COLLECTIONS.USER_NOTIFICATIONS,
			)
			expect(
				await userNotifications.countDocuments({ notification_id: id }),
			).toBe(1)
			expect(
				(await userNotifications.findOne({ notification_id: id }))?.read_at,
			).toEqual(new Date("2026-05-10T13:00:00.000Z"))
		})

		it("FR-009: saveMany writes notifications and user notifications in one transaction, so nothing stays when it fails", async () => {
			const userId = recorder.newId()
			const duplicated = build(userId)

			await expect(
				repository.saveMany([duplicated, duplicated]),
			).rejects.toThrow()

			expect(await repository.findById(duplicated.id)).toBeNull()
			expect(
				await connection
					.collection<UserNotificationDocument>(COLLECTIONS.USER_NOTIFICATIONS)
					.countDocuments({ notification_id: duplicated.id }),
			).toBe(0)
		})

		it("markAllAsReadByUserId leaves deleted user notifications untouched", async () => {
			const userId = recorder.newId()
			const deleted = build(userId, {
				deletedAt: new Date("2026-05-10T14:00:00.000Z"),
			})
			await repository.save(deleted)

			await repository.markAllAsReadByUserId(userId)

			const document = await connection
				.collection<UserNotificationDocument>(COLLECTIONS.USER_NOTIFICATIONS)
				.findOne({ notification_id: deleted.id })
			expect(document?.read_at).toBeNull()
		})

		it("withTransaction rejects an object that is not a unit of work session", () => {
			expect(() => repository.withTransaction({})).toThrow(
				InvalidTransactionInstance,
			)
		})

		it("withTransaction joins the unit of work and rolls back when it fails", async () => {
			const unitOfWork = new MongoUnitOfWork(connection)
			const notification = build(recorder.newId())

			await expect(
				unitOfWork.runTransaction(async (tx) => {
					await repository.withTransaction(tx).save(notification)
					throw new Error("rollback")
				}),
			).rejects.toThrow("rollback")

			expect(await repository.findById(notification.id)).toBeNull()
		})
	})
})
