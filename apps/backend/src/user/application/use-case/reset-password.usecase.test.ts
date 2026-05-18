import { createHash, randomBytes } from "node:crypto"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import { RevokedTokenDAOMemory } from "@/shared/infra/database/dao/in-memory/revoked-token-dao-memory"
import { InMemoryPasswordResetTokenStore } from "@/shared/infra/database/repository/in-memory/in-memory-password-reset-token-store"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { InvalidResetTokenError } from "@/user/application/error/invalid-reset-token-error"
import type { ResetPasswordUseCase } from "./reset-password.usecase"

const PASSWORD_RESET_TTL = 900

function makeTokenPair(): { rawToken: string; tokenHash: string } {
	const rawToken = randomBytes(32).toString("hex")
	const tokenHash = createHash("sha256").update(rawToken).digest("hex")
	return { rawToken, tokenHash }
}

describe("ResetPasswordUseCase", () => {
	let sut: ResetPasswordUseCase
	let userRepository: InMemoryUserRepository
	let tokenStore: InMemoryPasswordResetTokenStore
	let revokedTokenDAO: RevokedTokenDAOMemory

	beforeEach(() => {
		container.snapshot()
		const repos = setupInMemoryRepositories()
		userRepository = repos.userRepository

		tokenStore = new InMemoryPasswordResetTokenStore()
		container
			.rebind(USER_TYPES.Gateways.PasswordResetTokenStore)
			.toConstantValue(tokenStore)

		revokedTokenDAO = new RevokedTokenDAOMemory()
		container
			.rebind(AUTH_TYPES.DAO.RevokedToken)
			.toConstantValue(revokedTokenDAO)

		sut = container.get<ResetPasswordUseCase>(USER_TYPES.UseCases.ResetPassword)
	})

	afterEach(() => {
		container.restore()
	})

	test("token válido → senha atualizada com sucesso", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "user@test.com",
			password: "OldPass123!",
		})
		const { rawToken, tokenHash } = makeTokenPair()
		await tokenStore.saveResetToken(user.id, tokenHash, PASSWORD_RESET_TTL)
		await tokenStore.saveUidMapping(user.id, tokenHash, PASSWORD_RESET_TTL)

		const result = await sut.execute({
			token: rawToken,
			newPassword: "NewPass456!",
		})

		expect(result.isSuccess()).toBe(true)
		const updatedUser = await userRepository.userOfId(user.id)
		expect(updatedUser).not.toBeNull()
		if (!updatedUser) {
			throw new Error("Updated user should exist")
		}
		await expect(updatedUser.checkPassword("NewPass456!")).resolves.toBe(true)
	})

	test("token inválido → retorna InvalidResetTokenError", async () => {
		const result = await sut.execute({
			token: "token-invalido",
			newPassword: "NewPass456!",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(InvalidResetTokenError)
	})

	test("token de uso único → segundo uso retorna InvalidResetTokenError", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "user@test.com",
			password: "OldPass123!",
		})
		const { rawToken, tokenHash } = makeTokenPair()
		await tokenStore.saveResetToken(user.id, tokenHash, PASSWORD_RESET_TTL)
		await tokenStore.saveUidMapping(user.id, tokenHash, PASSWORD_RESET_TTL)

		await sut.execute({ token: rawToken, newPassword: "NewPass456!" })
		const secondResult = await sut.execute({
			token: rawToken,
			newPassword: "AnotherPass789!",
		})

		expect(secondResult.isFailure()).toBe(true)
		expect(secondResult.value).toBeInstanceOf(InvalidResetTokenError)
	})

	test("chaves Redis são deletadas após uso bem-sucedido", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "user@test.com",
			password: "OldPass123!",
		})
		const { rawToken, tokenHash } = makeTokenPair()
		await tokenStore.saveResetToken(user.id, tokenHash, PASSWORD_RESET_TTL)
		await tokenStore.saveUidMapping(user.id, tokenHash, PASSWORD_RESET_TTL)

		await sut.execute({ token: rawToken, newPassword: "NewPass456!" })

		await expect(
			tokenStore.findUserIdByTokenHash(tokenHash),
		).resolves.toBeNull()
		await expect(tokenStore.findTokenHashByUserId(user.id)).resolves.toBeNull()
	})

	test("todas as sessões são revogadas após reset bem-sucedido", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "user@test.com",
			password: "OldPass123!",
		})
		const { rawToken, tokenHash } = makeTokenPair()
		await tokenStore.saveResetToken(user.id, tokenHash, PASSWORD_RESET_TTL)
		await tokenStore.saveUidMapping(user.id, tokenHash, PASSWORD_RESET_TTL)

		await sut.execute({ token: rawToken, newPassword: "NewPass456!" })

		await expect(
			revokedTokenDAO.revokedAfterForUser(user.id),
		).resolves.not.toBeNull()
	})
})
