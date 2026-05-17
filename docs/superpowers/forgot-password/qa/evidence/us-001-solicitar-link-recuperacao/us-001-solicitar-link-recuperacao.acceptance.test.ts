import "../../../../../../apps/backend/test/setup-test.ts"
import assert from "node:assert/strict"
import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { InMemoryPasswordResetTokenStore } from "@/shared/infra/database/repository/in-memory/in-memory-password-reset-token-store"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"

const FORGOT_PASSWORD_ROUTE = "/password/forgot"
const GENERIC_SUCCESS_MESSAGE =
	"Se este e-mail estiver cadastrado, você receberá um link em breve."
const PASSWORD_RESET_TTL_IN_SECONDS = 15 * 60

class ObservedPasswordResetTokenStore extends InMemoryPasswordResetTokenStore {
	public readonly savedResetTokenTtls: number[] = []
	public readonly savedUidMappingTtls: number[] = []

	public override async saveResetToken(
		userId: string,
		tokenHash: string,
		ttl: number,
	): Promise<void> {
		this.savedResetTokenTtls.push(ttl)
		await super.saveResetToken(userId, tokenHash, ttl)
	}

	public override async saveUidMapping(
		userId: string,
		tokenHash: string,
		ttl: number,
	): Promise<void> {
		this.savedUidMappingTtls.push(ttl)
		await super.saveUidMapping(userId, tokenHash, ttl)
	}
}

async function run() {
	container.snapshot()

	let fastifyServer: FastifyAdapter | null = null

	try {
		const userRepository = new InMemoryUserRepository()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)
		const tokenStore = new ObservedPasswordResetTokenStore()
		container
			.rebind(USER_TYPES.Gateways.PasswordResetTokenStore)
			.toConstantValue(tokenStore)
		const cacheDB = container.get<CacheDB>(SHARED_TYPES.Redis)
		await cacheDB.clear()
		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()

		await verifyTokenTtl(fastifyServer, userRepository, tokenStore)
		await verifyEmailRateLimitResponse(fastifyServer, userRepository, cacheDB)

		console.log(
			JSON.stringify(
				{
					status: "passed",
					verified: ["RF-005", "RF-007"],
					passwordResetTtlSeconds: PASSWORD_RESET_TTL_IN_SECONDS,
				},
				null,
				2,
			),
		)
	} finally {
		container.restore()

		if (fastifyServer) {
			await fastifyServer.close()
		}
	}
}

async function verifyTokenTtl(
	fastifyServer: FastifyAdapter,
	userRepository: InMemoryUserRepository,
	tokenStore: ObservedPasswordResetTokenStore,
): Promise<void> {
	const user = await createAndSaveUser({
		userRepository,
		id: "ttl-user",
		email: "ttl@test.com",
		password: "OldPass123!",
	})

	assert.equal(user.email, "ttl@test.com")

	const response = await request(fastifyServer.server)
		.post(FORGOT_PASSWORD_ROUTE)
		.send({ email: user.email })

	assert.equal(response.status, HTTP_STATUS.OK)
	assert.deepEqual(response.body, {
		message: GENERIC_SUCCESS_MESSAGE,
	})
	assert.deepEqual(tokenStore.savedResetTokenTtls, [PASSWORD_RESET_TTL_IN_SECONDS])
	assert.deepEqual(tokenStore.savedUidMappingTtls, [PASSWORD_RESET_TTL_IN_SECONDS])
}

async function verifyEmailRateLimitResponse(
	fastifyServer: FastifyAdapter,
	userRepository: InMemoryUserRepository,
	cacheDB: CacheDB,
): Promise<void> {
	await cacheDB.clear()
	const user = await createAndSaveUser({
		userRepository,
		id: "rate-limit-user",
		email: "rate-limit@test.com",
		password: "OldPass123!",
	})

	assert.equal(user.email, "rate-limit@test.com")

	for (let index = 0; index < 3; index++) {
		const response = await request(fastifyServer.server)
			.post(FORGOT_PASSWORD_ROUTE)
			.send({ email: user.email })

		assert.equal(response.status, HTTP_STATUS.OK)
		assert.deepEqual(response.body, {
			message: GENERIC_SUCCESS_MESSAGE,
		})
	}

	const blockedResponse = await request(fastifyServer.server)
		.post(FORGOT_PASSWORD_ROUTE)
		.send({ email: user.email })

	assert.equal(blockedResponse.status, HTTP_STATUS.TO_MANY_REQUESTS)
}

run().catch((error) => {
	console.error(error)
	process.exitCode = 1
})

export {}
