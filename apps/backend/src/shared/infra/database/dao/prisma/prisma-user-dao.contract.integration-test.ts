import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeUserDaoContract } from "test/repository-contract/user-dao-contract"
import { afterAll } from "vitest"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { PrismaUserDAO } from "./prisma-user-dao"

afterAll(async () => {
	await prismaClient.$disconnect()
})

describeUserDaoContract("prisma", async () => {
	const recorder = new IdRecorder()
	return {
		dao: new PrismaUserDAO(prismaClient),
		newId: () => recorder.newId(),
		seed: async (users) => {
			await prismaClient.user.createMany({
				data: users.map((user) => ({
					id: user.id,
					name: user.name,
					email: user.email,
					role: user.role,
					status: user.status,
					created_at: user.createdAt,
					is_super_admin: user.isSuperAdmin,
					deleted_at: user.deletedAt,
				})),
			})
		},
		cleanup: async () => {
			await prismaClient.user.deleteMany({
				where: { id: { in: [...recorder.ids] } },
			})
		},
	}
})
