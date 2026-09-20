import { describe, expect, test } from "vitest"
import {
	NOTIFICATION_TYPE_VALUES,
	Notification,
} from "@/notification/domain/notification.js"
import { notificationTypeSchema } from "@/notification/infra/controller/schema/notification-type.schema.js"
import { $Enums } from "@/shared/infra/database/generated/prisma/client"

describe("contrato do enum NotificationType", () => {
	test("inclui o tipo NOTICE", () => {
		expect(NOTIFICATION_TYPE_VALUES).toContain("NOTICE")
	})

	test.each(
		NOTIFICATION_TYPE_VALUES,
	)("Notification.create aceita o tipo %s", (type) => {
		const notification = Notification.create({
			userId: "user-1",
			type,
			title: "Titulo",
			message: "Mensagem",
		})
		expect(notification.type).toBe(type)
	})

	test.each(
		NOTIFICATION_TYPE_VALUES,
	)("o schema zod do GET aceita o tipo %s", (type) => {
		expect(notificationTypeSchema.safeParse(type).success).toBe(true)
	})

	test("o enum do Prisma tem exatamente os valores do dominio", () => {
		expect(Object.values($Enums.NotificationType).sort()).toEqual(
			[...NOTIFICATION_TYPE_VALUES].sort(),
		)
	})
})
