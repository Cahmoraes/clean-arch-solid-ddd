import { randomUUID } from "node:crypto"
import { afterAll, afterEach, describe, expect, test } from "vitest"
import { NoticeAudience } from "@/notification/domain/value-object/notice-audience"
import { PrismaActiveRecipientsProvider } from "@/notification/infra/provider/prisma/prisma-active-recipients.provider"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client"

type UserStatusValue = "activated" | "suspended" | "locked"
type UserRoleValue = "ADMIN" | "MEMBER"

interface CreateUserProps {
	role: UserRoleValue
	status: UserStatusValue
	deletedAt?: Date
}

const createdUserIds: string[] = []

async function createUser({ role, status, deletedAt }: CreateUserProps) {
	const id = randomUUID()
	createdUserIds.push(id)
	await prismaClient.user.create({
		data: {
			id,
			name: `Usuario ${role} ${status}`,
			email: `recipients-${id}@example.com`,
			password_hash: "hashed-password",
			role,
			status,
			deleted_at: deletedAt ?? null,
		},
	})
	return id
}

function audience(value: string): NoticeAudience {
	return NoticeAudience.create(value).force.success().value
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
		const activatedId = await createUser({
			role: "MEMBER",
			status: "activated",
		})
		const suspendedId = await createUser({
			role: "MEMBER",
			status: "suspended",
		})
		const lockedId = await createUser({ role: "MEMBER", status: "locked" })

		const ids = await sut.listActiveUserIds(NoticeAudience.all())

		expect(ids).toContain(activatedId)
		expect(ids).not.toContain(suspendedId)
		expect(ids).not.toContain(lockedId)
	})

	test("usuario activated com deleted_at preenchido nao recebe o aviso", async () => {
		const activeId = await createUser({ role: "MEMBER", status: "activated" })
		const removedId = await createUser({
			role: "MEMBER",
			status: "activated",
			deletedAt: new Date(),
		})

		const ids = await sut.listActiveUserIds(NoticeAudience.all())

		expect(ids).toContain(activeId)
		expect(ids).not.toContain(removedId)
	})

	test("FR-009: ALL traz os ativos de ambos os papeis", async () => {
		const memberId = await createUser({ role: "MEMBER", status: "activated" })
		const adminId = await createUser({ role: "ADMIN", status: "activated" })

		const ids = await sut.listActiveUserIds(audience("ALL"))

		expect(ids).toContain(memberId)
		expect(ids).toContain(adminId)
	})

	test("FR-007: MEMBERS traz so os ativos com papel MEMBER", async () => {
		const memberId = await createUser({ role: "MEMBER", status: "activated" })
		const adminId = await createUser({ role: "ADMIN", status: "activated" })

		const ids = await sut.listActiveUserIds(audience("MEMBERS"))

		expect(ids).toContain(memberId)
		expect(ids).not.toContain(adminId)
	})

	test("FR-008: ADMINS traz so os ativos com papel ADMIN", async () => {
		const memberId = await createUser({ role: "MEMBER", status: "activated" })
		const adminId = await createUser({ role: "ADMIN", status: "activated" })

		const ids = await sut.listActiveUserIds(audience("ADMINS"))

		expect(ids).toContain(adminId)
		expect(ids).not.toContain(memberId)
	})

	test.each([
		["MEMBERS", "MEMBER"],
		["ADMINS", "ADMIN"],
	] as const)("Review Focus: com o publico %s, usuario %s suspenso, bloqueado ou removido nao recebe o aviso", async (audienceValue, role) => {
		const activeId = await createUser({ role, status: "activated" })
		const suspendedId = await createUser({ role, status: "suspended" })
		const lockedId = await createUser({ role, status: "locked" })
		const removedId = await createUser({
			role,
			status: "activated",
			deletedAt: new Date(),
		})

		const ids = await sut.listActiveUserIds(audience(audienceValue))

		expect(ids).toContain(activeId)
		expect(ids).not.toContain(suspendedId)
		expect(ids).not.toContain(lockedId)
		expect(ids).not.toContain(removedId)
	})

	test("FR-011: com ALL, administradores suspensos, bloqueados ou removidos tambem ficam de fora", async () => {
		const activeAdminId = await createUser({
			role: "ADMIN",
			status: "activated",
		})
		const suspendedAdminId = await createUser({
			role: "ADMIN",
			status: "suspended",
		})
		const removedAdminId = await createUser({
			role: "ADMIN",
			status: "activated",
			deletedAt: new Date(),
		})

		const ids = await sut.listActiveUserIds(audience("ALL"))

		expect(ids).toContain(activeAdminId)
		expect(ids).not.toContain(suspendedAdminId)
		expect(ids).not.toContain(removedAdminId)
	})
})
