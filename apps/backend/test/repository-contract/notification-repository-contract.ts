import { afterEach, beforeEach, describe, expect, it } from "vitest"
import type { NotificationRepository } from "@/notification/application/repository/notification.repository.js"
import { Notification } from "@/notification/domain/notification.js"

export interface NotificationRepositoryContractContext {
	repository: NotificationRepository
	newId(): string
	ensureReferences(references: { userIds: string[] }): Promise<void>
	cleanup(): Promise<void>
}

export type NotificationProps = Parameters<typeof Notification.restore>[0]

export function buildNotificationProps(
	id: string,
	userId: string,
	overrides: Partial<NotificationProps> = {},
): NotificationProps {
	return {
		id,
		userId,
		type: "NOTICE",
		title: "Contract notice",
		message: "Mensagem de contrato",
		createdAt: new Date("2026-05-10T12:00:00.000Z"),
		updatedAt: new Date("2026-05-10T12:00:00.000Z"),
		...overrides,
	}
}

export function describeNotificationRepositoryContract(
	name: string,
	factory: () => Promise<NotificationRepositoryContractContext>,
): void {
	describe(`NotificationRepository contract (${name})`, () => {
		let context: NotificationRepositoryContractContext
		let userId: string

		beforeEach(async () => {
			context = await factory()
			userId = context.newId()
			await context.ensureReferences({ userIds: [userId] })
		})

		afterEach(async () => {
			await context.cleanup()
		})

		function build(overrides: Partial<NotificationProps> = {}): Notification {
			const id = overrides.id ?? context.newId()
			return Notification.restore(buildNotificationProps(id, userId, overrides))
		}

		it("saves a notification and finds it by id", async () => {
			const notification = build()

			const saved = await context.repository.save(notification)
			const found = await context.repository.findById(notification.id)

			expect(saved).toEqual({ id: notification.id })
			expect(found?.userId).toBe(userId)
			expect(found?.type).toBe("NOTICE")
			expect(found?.title).toBe("Contract notice")
			expect(found?.message).toBe("Mensagem de contrato")
			expect(found?.isRead).toBe(false)
			expect(found?.createdAt.toISOString()).toBe("2026-05-10T12:00:00.000Z")
		})

		it("returns null for an unknown id", async () => {
			expect(await context.repository.findById(context.newId())).toBeNull()
		})

		it("saving the same id again persists the read date", async () => {
			const id = context.newId()
			await context.repository.save(build({ id }))

			await context.repository.save(
				build({
					id,
					readAt: new Date("2026-05-10T13:00:00.000Z"),
					updatedAt: new Date("2026-05-10T13:00:00.000Z"),
				}),
			)

			const found = await context.repository.findById(id)
			expect(found?.isRead).toBe(true)
			expect(found?.readAt?.toISOString()).toBe("2026-05-10T13:00:00.000Z")
		})

		it("saveMany stores every notification and accepts an empty list", async () => {
			const first = build()
			const second = build()

			await context.repository.saveMany([first, second])
			await expect(context.repository.saveMany([])).resolves.toBeUndefined()

			expect((await context.repository.findById(first.id))?.id).toBe(first.id)
			expect((await context.repository.findById(second.id))?.id).toBe(second.id)
		})

		it("FR-012: findManyByUserId hides deleted notifications, filters unread and paginates by offset and limit", async () => {
			const unread = build()
			const read = build({ readAt: new Date("2026-05-10T13:00:00.000Z") })
			const deleted = build({ deletedAt: new Date("2026-05-10T14:00:00.000Z") })
			await context.repository.saveMany([unread, read, deleted])

			const all = await context.repository.findManyByUserId({ userId, page: 1 })
			const onlyUnread = await context.repository.findManyByUserId({
				userId,
				page: 1,
				onlyUnread: true,
			})
			const paged = await context.repository.findManyByUserId({
				userId,
				page: 1,
				offset: 0,
				limit: 1,
			})

			expect(all.total).toBe(2)
			expect(all.items.map((item) => item.id).sort()).toEqual(
				[unread.id, read.id].sort(),
			)
			expect(onlyUnread.items.map((item) => item.id)).toEqual([unread.id])
			expect(onlyUnread.total).toBe(1)
			expect(paged.items).toHaveLength(1)
			expect(paged.total).toBe(2)
		})

		it("countUnreadByUserId and markAllAsReadByUserId", async () => {
			const first = build()
			const second = build()
			await context.repository.saveMany([first, second])

			expect(await context.repository.countUnreadByUserId(userId)).toBe(2)
			await context.repository.markAllAsReadByUserId(userId)

			expect(await context.repository.countUnreadByUserId(userId)).toBe(0)
			expect((await context.repository.findById(first.id))?.isRead).toBe(true)
		})
	})
}
