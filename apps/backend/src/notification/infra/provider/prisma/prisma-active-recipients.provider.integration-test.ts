import { randomUUID } from "node:crypto"
import { afterAll, afterEach, describe, expect, test } from "vitest"
import { PrismaActiveRecipientsProvider } from "@/notification/infra/provider/prisma/prisma-active-recipients.provider"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client"

type UserStatusValue = "activated" | "suspended" | "locked"

const createdUserIds: string[] = []

async function createUser(status: UserStatusValue, deletedAt?: Date) {
	const id = randomUUID()
	createdUserIds.push(id)
	await prismaClient.user.create({
		data: {
			id,
			name: `Usuario ${status}`,
			email: `recipients-${id}@example.com`,
			password_hash: "hashed-password",
			role: "MEMBER",
			status,
			deleted_at: deletedAt ?? null,
		},
	})
	return id
}

describe("PrismaActiveRecipientsProvider", () => {
	const sut = new PrismaActiveRecipientsProvider(prismaClient)

	afterEach(async () => {
		await prismaClient.user.deleteMany({
			where: { id: { in: createdUserIds } },
		})
		createdUserIds.length = 0
	})

	afterAll(async () => {
		await prismaClient.$disconnect()
	})

	test("lista apenas usuarios activated e exclui suspended e locked", async () => {
		const activatedId = await createUser("activated")
		const suspendedId = await createUser("suspended")
		const lockedId = await createUser("locked")

		const ids = await sut.listActiveUserIds()

		expect(ids).toContain(activatedId)
		expect(ids).not.toContain(suspendedId)
		expect(ids).not.toContain(lockedId)
	})

	test("usuario activated com deleted_at preenchido nao recebe o aviso", async () => {
		const activeId = await createUser("activated")
		const removedId = await createUser("activated", new Date())

		const ids = await sut.listActiveUserIds()

		expect(ids).toContain(activeId)
		expect(ids).not.toContain(removedId)
	})
})
