import jwt from "jsonwebtoken"

import { env } from "@/shared/infra/env"
import { TestingLogger } from "@/shared/infra/logger/testing-logger"

import { JsonWebTokenAdapter } from "./json-web-token-adapter"

describe("JsonWebTokenAdapter", () => {
	let sut: JsonWebTokenAdapter
	let logger: TestingLogger
	const payload = {
		sub: {
			id: "user-id",
			email: "user@mail.com",
			role: "MEMBER",
		},
	}

	beforeEach(() => {
		logger = new TestingLogger()
		sut = new JsonWebTokenAdapter(logger)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	test("Deve assinar token com algoritmo HS256 explicitamente", () => {
		const signSpy = vi.spyOn(jwt, "sign")

		sut.sign(payload, env.PRIVATE_KEY)

		expect(signSpy).toHaveBeenCalledWith(
			payload,
			env.PRIVATE_KEY,
			expect.objectContaining({
				algorithm: "HS256",
				expiresIn: env.JWT_EXPIRES_IN,
			}),
		)
	})

	test("Deve gerar refresh token com algoritmo HS256 explicitamente", () => {
		const signSpy = vi.spyOn(jwt, "sign")

		sut.refreshToken(payload, env.PRIVATE_KEY)

		expect(signSpy).toHaveBeenCalledWith(
			payload,
			env.PRIVATE_KEY,
			expect.objectContaining({
				algorithm: "HS256",
				expiresIn: env.JWT_REFRESH_EXPIRES_IN,
			}),
		)
	})

	test("Deve rejeitar token assinado com algoritmo diferente de HS256", () => {
		const token = jwt.sign(payload, env.PRIVATE_KEY, {
			algorithm: "HS384",
		})

		const result = sut.verify(token, env.PRIVATE_KEY)

		expect(result.isFailure()).toBe(true)
		expect(logger.detecteErrorMethod).toBe(true)
		expect(logger.params.message).toBe("invalid algorithm")
	})
})
