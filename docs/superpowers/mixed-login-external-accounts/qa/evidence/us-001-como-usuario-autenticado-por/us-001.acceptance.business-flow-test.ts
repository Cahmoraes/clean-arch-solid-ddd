import assert from "node:assert/strict"
import request from "supertest"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { serverBuildForTest } from "test/factory/server-build-for-test"
import { SessionRoutes } from "@/session/infra/controller/routes/session-routes.js"
import { InMemoryGoogleAuthProvider } from "@/session/infra/provider/in-memory-google-auth-provider.js"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"
import { HTTP_STATUS } from "@/shared/infra/server/http-status"
import { UserRoutes } from "@/user/infra/controller/routes/user-routes.js"

async function run() {
	container.snapshot()

	let fastifyServer: FastifyAdapter | null = null

	try {
		const userRepository = new InMemoryUserRepository()
		container
			.rebind(USER_TYPES.Repositories.User)
			.toConstantValue(userRepository)

		const googleAuthProvider = new InMemoryGoogleAuthProvider()
		container
			.rebind(AUTH_TYPES.Providers.GoogleAuth)
			.toConstantValue(googleAuthProvider)

		fastifyServer = await serverBuildForTest()
		await fastifyServer.ready()

		const externalOnlyUser = await createAndSaveUser({
			userRepository,
			email: "google-only-us001@doe.com",
			googleId: "google-sub-us001",
			name: "US 001 User",
		})

		googleAuthProvider.addValidToken("reauth-token", {
			sub: "google-sub-us001",
			email: externalOnlyUser.email,
			name: externalOnlyUser.name,
			emailVerified: true,
		})

		const googleLoginBefore = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE_GOOGLE)
			.send({ idToken: "reauth-token" })

		assert.equal(googleLoginBefore.status, HTTP_STATUS.OK)
		assert.equal(typeof googleLoginBefore.body.token, "string")

		const reauthResponse = await request(fastifyServer.server)
			.post(UserRoutes.PASSWORD_REAUTH)
			.set("Authorization", `Bearer ${googleLoginBefore.body.token}`)
			.send({ provider: "google", idToken: "reauth-token" })

		assert.equal(reauthResponse.status, HTTP_STATUS.OK)
		assert.equal(typeof reauthResponse.body.reauthGrant, "string")
		assert.equal(reauthResponse.body.expiresInSeconds, 300)

		const definePasswordResponse = await request(fastifyServer.server)
			.post(UserRoutes.PASSWORD)
			.set("Authorization", `Bearer ${googleLoginBefore.body.token}`)
			.send({
				provider: "google",
				reauthGrant: reauthResponse.body.reauthGrant,
				newRawPassword: "Senha123!",
			})

		assert.equal(definePasswordResponse.status, HTTP_STATUS.NO_CONTENT)

		const emailLoginResponse = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE)
			.send({
				email: externalOnlyUser.email,
				password: "Senha123!",
			})

		assert.equal(emailLoginResponse.status, HTTP_STATUS.OK)
		assert.equal(typeof emailLoginResponse.body.token, "string")
		assert.equal(typeof emailLoginResponse.body.refreshToken, "string")

		const googleLoginAfter = await request(fastifyServer.server)
			.post(SessionRoutes.AUTHENTICATE_GOOGLE)
			.send({ idToken: "reauth-token" })

		assert.equal(googleLoginAfter.status, HTTP_STATUS.OK)
		assert.equal(typeof googleLoginAfter.body.token, "string")
		assert.equal(typeof googleLoginAfter.body.refreshToken, "string")

		const profileFromPasswordLogin = await request(fastifyServer.server)
			.get(UserRoutes.ME)
			.set("Authorization", `Bearer ${emailLoginResponse.body.token}`)

		const profileFromGoogleLogin = await request(fastifyServer.server)
			.get(UserRoutes.ME)
			.set("Authorization", `Bearer ${googleLoginAfter.body.token}`)

		assert.equal(profileFromPasswordLogin.status, HTTP_STATUS.OK)
		assert.equal(profileFromGoogleLogin.status, HTTP_STATUS.OK)
		assert.equal(profileFromPasswordLogin.body.id, externalOnlyUser.id)
		assert.equal(profileFromGoogleLogin.body.id, externalOnlyUser.id)
		assert.equal(profileFromPasswordLogin.body.email, externalOnlyUser.email)
		assert.equal(profileFromGoogleLogin.body.email, externalOnlyUser.email)
		assert.equal(profileFromPasswordLogin.body.hasPassword, true)
		assert.equal(profileFromGoogleLogin.body.hasPassword, true)
		assert.deepEqual(profileFromPasswordLogin.body.authMethods, [
			"password",
			"google",
		])
		assert.deepEqual(profileFromGoogleLogin.body.authMethods, [
			"password",
			"google",
		])

		assert.equal(userRepository.users.size, 1)

		const persistedUser = await userRepository.userOfId(externalOnlyUser.id)
		assert.notEqual(persistedUser, null)

		if (!persistedUser) {
			throw new Error("User should exist after define password flow")
		}

		assert.equal(await persistedUser.checkPassword("Senha123!"), true)

		console.log(
			JSON.stringify(
				{
					status: "passed",
					verified: ["RF-004", "RF-005", "RF-006", "RF-007"],
					userId: externalOnlyUser.id,
					authMethods: profileFromPasswordLogin.body.authMethods,
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

run().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
