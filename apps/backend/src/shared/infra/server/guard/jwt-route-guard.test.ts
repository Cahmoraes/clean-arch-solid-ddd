import { JsonWebTokenAdapter } from "@/shared/infra/auth/json-web-token-adapter.js"
import { RevokedTokenDAOMemory } from "@/shared/infra/database/dao/in-memory/revoked-token-dao-memory.js"
import { env } from "@/shared/infra/env/index.js"
import type { Logger } from "@/shared/infra/logger/logger.js"
import { HTTP_STATUS } from "@/shared/infra/server/http-status.js"
import { JwtRouteGuard } from "./jwt-route-guard.js"

const fakeLogger: Logger = {
	error: () => {},
	warn: () => {},
	info: () => {},
}

function makeSut() {
	const authToken = new JsonWebTokenAdapter(fakeLogger)
	const revokedTokenDAO = new RevokedTokenDAOMemory()
	const sut = new JwtRouteGuard(authToken, revokedTokenDAO, fakeLogger)
	return { sut, authToken, revokedTokenDAO }
}

function signToken(
	authToken: JsonWebTokenAdapter,
	overrides?: Partial<{ id: string; email: string; role: string; jwi: string }>,
) {
	return authToken.sign(
		{
			sub: {
				id: overrides?.id ?? "user-1",
				email: overrides?.email ?? "user@test.com",
				role: overrides?.role ?? "MEMBER",
				jwi: overrides?.jwi ?? "jwi-1",
			},
		},
		env.PRIVATE_KEY,
	)
}

describe("JwtRouteGuard", () => {
	test("Rota não protegida retorna success(null) sem verificar token", async () => {
		const { sut } = makeSut()
		const result = await sut.guard({}, { isProtected: false })
		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toBeNull()
	})

	test("Rota protegida sem token retorna 401 Unauthorized", async () => {
		const { sut } = makeSut()
		const result = await sut.guard({}, { isProtected: true })
		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toEqual({
			status: HTTP_STATUS.UNAUTHORIZED,
			message: "Unauthorized",
		})
	})

	test("Rota protegida com token inválido retorna 401 Unauthorized", async () => {
		const { sut } = makeSut()
		const result = await sut.guard(
			{ authorizationHeader: "Bearer invalid.token.here" },
			{ isProtected: true },
		)
		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toEqual({
			status: HTTP_STATUS.UNAUTHORIZED,
			message: "Unauthorized",
		})
	})

	test("Rota protegida com token válido retorna o usuário autenticado", async () => {
		const { sut, authToken } = makeSut()
		const token = signToken(authToken, { id: "user-42", role: "MEMBER" })
		const result = await sut.guard(
			{ authorizationHeader: `Bearer ${token}` },
			{ isProtected: true },
		)
		expect(result.isSuccess()).toBe(true)
		const user = result.forceSuccess().value
		expect(user?.sub.id).toBe("user-42")
		expect(user?.sub.role).toBe("MEMBER")
		expect(user?.iat).toEqual(expect.any(Number))
	})

	test("Rota onlyAdmin com role MEMBER retorna 403 Forbidden", async () => {
		const { sut, authToken } = makeSut()
		const token = signToken(authToken, { role: "MEMBER" })
		const result = await sut.guard(
			{ authorizationHeader: `Bearer ${token}` },
			{ isProtected: true, onlyAdmin: true },
		)
		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toEqual({
			status: HTTP_STATUS.FORBIDDEN,
			message: "Forbidden",
		})
	})

	test("Rota onlyAdmin com role ADMIN retorna o usuário autenticado", async () => {
		const { sut, authToken } = makeSut()
		const token = signToken(authToken, { role: "ADMIN" })
		const result = await sut.guard(
			{ authorizationHeader: `Bearer ${token}` },
			{ isProtected: true, onlyAdmin: true },
		)
		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value?.sub.role).toBe("ADMIN")
	})

	test("Sessão revogada por jwi retorna 401 Session already revoked", async () => {
		const { sut, authToken, revokedTokenDAO } = makeSut()
		const token = signToken(authToken, { jwi: "revoked-jwi" })
		await revokedTokenDAO.revoke({
			jwi: "revoked-jwi",
			userId: "user-1",
			revokedAt: new Date().toISOString(),
			expiresIn: "7d",
		})
		const result = await sut.guard(
			{ authorizationHeader: `Bearer ${token}` },
			{ isProtected: true },
		)
		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toEqual({
			status: HTTP_STATUS.UNAUTHORIZED,
			message: "Session already revoked",
		})
	})

	test("Sessão revogada em massa (revokeAllForUser) invalida tokens emitidos antes", async () => {
		const { sut, authToken, revokedTokenDAO } = makeSut()
		const token = signToken(authToken, { id: "user-mass-revoke" })
		await revokedTokenDAO.revokeAllForUser("user-mass-revoke", 60)
		const result = await sut.guard(
			{ authorizationHeader: `Bearer ${token}` },
			{ isProtected: true },
		)
		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toEqual({
			status: HTTP_STATUS.UNAUTHORIZED,
			message: "Session already revoked",
		})
	})
})
