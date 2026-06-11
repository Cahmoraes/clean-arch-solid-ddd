import { InvalidGoogleTokenError } from "@/session/application/error/invalid-google-token-error.js"
import type { GoogleUserInfo } from "@/session/application/provider/google-auth-provider.js"

import { InMemoryGoogleAuthProvider } from "./in-memory-google-auth-provider.js"

describe("InMemoryGoogleAuthProvider", () => {
	test("deve retornar o usuário Google quando o token for válido", async () => {
		const sut = new InMemoryGoogleAuthProvider()
		const userInfo: GoogleUserInfo = {
			sub: "google-user-1",
			email: "john@doe.com",
			name: "John Doe",
			emailVerified: true,
		}

		sut.addValidToken("valid-token", userInfo)

		const result = await sut.verify("valid-token")

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toEqual(userInfo)
	})

	test("deve retornar InvalidGoogleTokenError quando o token for inválido", async () => {
		const sut = new InMemoryGoogleAuthProvider()

		const result = await sut.verify("invalid-token")

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidGoogleTokenError)
	})
})
