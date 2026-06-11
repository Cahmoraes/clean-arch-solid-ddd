import { createHash, randomBytes } from "node:crypto"
import request from "supertest"
import { afterEach, beforeEach, describe, expect, test } from "vitest"
import { InMemoryPasswordResetTokenStore } from "../../../../../../apps/backend/src/shared/infra/database/repository/in-memory/in-memory-password-reset-token-store"
import { InMemoryUserRepository } from "../../../../../../apps/backend/src/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "../../../../../../apps/backend/src/shared/infra/ioc/container"
import { USER_TYPES } from "../../../../../../apps/backend/src/shared/infra/ioc/types"
import type { FastifyAdapter } from "../../../../../../apps/backend/src/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "../../../../../../apps/backend/src/shared/infra/server/http-status"
import { createAndSaveUser } from "../../../../../../apps/backend/test/factory/create-and-save-user"
import { serverBuildForTest } from "../../../../../../apps/backend/test/factory/server-build-for-test"

const RESET_PASSWORD_ROUTE = "/password/reset"
const PASSWORD_RESET_TTL = 15 * 60

function makeTokenPair(): { rawToken: string; tokenHash: string } {
	const rawToken = randomBytes(32).toString("hex")
	const tokenHash = createHash("sha256").update(rawToken).digest("hex")
	return { rawToken, tokenHash }
}

describe("US-003 - redefinir senha via link", () => {
	let fastifyServer: FastifyAdapter
	let userRepository: InMemoryUserRepository
	let tokenStore: InMemoryPasswordResetTokenStore

	beforeEach(async () => {
		container.snapshot()
		userRepository = new InMemoryUserRepository()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
		tokenStore = new InMemoryPasswordResetTokenStore()
		container
			.rebind(USER_TYPES.Gateways.PasswordResetTokenStore)
			.toConstantValue(tokenStore)
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()
	})

	afterEach(async () => {
		container.restore()
		await fastifyServer.close()
	})

	test("deve rejeitar nova senha com menos de 8 caracteres", async () => {
		const currentPassword = "OldPass123!"
		const invalidNewPassword = "1234567"
		const user = await createAndSaveUser({
			userRepository,
			email: "john@test.com",
			password: currentPassword,
		})
		const { rawToken, tokenHash } = makeTokenPair()
		await tokenStore.saveResetToken(user.id, tokenHash, PASSWORD_RESET_TTL)
		await tokenStore.saveUidMapping(user.id, tokenHash, PASSWORD_RESET_TTL)

		const response = await request(fastifyServer.server)
			.post(RESET_PASSWORD_ROUTE)
			.send({
				token: rawToken,
				newPassword: invalidNewPassword,
			})

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
		expect(response.body).toEqual(
			expect.objectContaining({
				message: expect.any(String),
			}),
		)

		const unchangedUser = await userRepository.userOfId(user.id)
		expect(unchangedUser).not.toBeNull()
		if (!unchangedUser) {
			throw new Error("User should still exist after validation failure")
		}

		await expect(unchangedUser.checkPassword(currentPassword)).resolves.toBe(
			true,
		)
		await expect(unchangedUser.checkPassword(invalidNewPassword)).resolves.toBe(
			false,
		)
	})
})
