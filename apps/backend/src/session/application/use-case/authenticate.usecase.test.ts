import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { Either } from "@/shared/domain/value-object/either"
import { env } from "@/shared/infra/env"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { AuthToken } from "@/user/application/auth/auth-token"
import { InvalidCredentialsError } from "@/user/application/error/invalid-credentials-error"
import { PasswordNotSetError } from "@/user/application/error/password-not-set-error"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository"
import {
	type CreateUserDto,
	User,
	type UserValidationErrors,
} from "@/user/domain/user"
import { StatusTypes } from "@/user/domain/value-object/status"
import type {
	AuthenticateUseCase,
	AuthenticateUseCaseInput,
} from "./authenticate.usecase"

interface JWTResponse {
	sub: {
		id: string
		email: string
		role: string
		sessionId: string
	}
}

describe("AuthenticateUseCase", () => {
	let sut: AuthenticateUseCase
	let userRepository: UserRepository
	let authToken: AuthToken

	beforeEach(async () => {
		container.snapshot()
		userRepository = (await setupInMemoryRepositories()).userRepository
		sut = container.get(AUTH_TYPES.UseCases.Authenticate)
		authToken = container.get(SHARED_TYPES.Tokens.Auth)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve autenticar um usuário", async () => {
		const input: AuthenticateUseCaseInput = {
			email: "john@doe.com",
			password: "any_password",
		}
		await createAndSaveUser({
			name: "John Doe",
			email: input.email,
			password: input.password,
		})
		const result = await sut.execute(input)
		const { token, refreshToken } = result.force.success().value
		expect(token).toEqual(expect.any(String))
		expect(refreshToken).toEqual(expect.any(String))
		const jwtResult = verifyToken(token)
		const refreshTokenResult = verifyToken(refreshToken)
		expect(jwtResult.sub).toMatchObject(refreshTokenResult.sub)
	})

	test("Não deve autenticar um usuário inexistente", async () => {
		const input: AuthenticateUseCaseInput = {
			email: "john@doe.com",
			password: "any_password",
		}
		const result = await sut.execute(input)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidCredentialsError)
	})

	test("Não deve autenticar um usuário com senha inválida", async () => {
		const input: AuthenticateUseCaseInput = {
			email: "john@doe.com",
			password: "any_password",
		}

		await createAndSaveUser({
			name: "John Doe",
			email: input.email,
			password: input.password,
		})

		const result = await sut.execute({
			...input,
			password: "invalid_password",
		})

		expect(result.forceFailure().value).toBeInstanceOf(InvalidCredentialsError)
	})

	test("Não deve autenticar por email/senha quando o usuário ainda não possui senha local", async () => {
		await createAndSaveUser({
			name: "John Doe",
			email: "john@doe.com",
			googleId: "google-sub-123",
		})

		const result = await sut.execute({
			email: "john@doe.com",
			password: "qualquer_senha",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(PasswordNotSetError)
	})

	describe("lockout", () => {
		test("Não deve bloquear nas 2 primeiras tentativas inválidas", async () => {
			await createAndSaveUser({
				name: "John Doe",
				email: "john@doe.com",
				password: "Senha123!",
			})
			for (let i = 0; i < 2; i++) {
				await sut.execute({ email: "john@doe.com", password: "wrong" })
			}
			const user = await userRepository.userOfEmail("john@doe.com")
			expect(user?.isLocked).toBe(false)
		})

		test("Deve bloquear a conta na 3ª tentativa inválida", async () => {
			await createAndSaveUser({
				name: "John Doe",
				email: "john@doe.com",
				password: "Senha123!",
			})
			for (let i = 0; i < 3; i++) {
				await sut.execute({ email: "john@doe.com", password: "wrong" })
			}
			const user = await userRepository.userOfEmail("john@doe.com")
			expect(user?.isLocked).toBe(true)
			expect(user?.status).toBe("locked")
		})

		test("Deve retornar InvalidCredentialsError para conta bloqueada (anti-enumeração)", async () => {
			await createAndSaveUser({
				name: "John Doe",
				email: "john@doe.com",
				password: "Senha123!",
			})
			for (let i = 0; i < 3; i++) {
				await sut.execute({ email: "john@doe.com", password: "wrong" })
			}
			// Tenta login com senha CORRETA em conta bloqueada — deve retornar mesmo erro
			const result = await sut.execute({
				email: "john@doe.com",
				password: "Senha123!",
			})
			expect(result.isFailure()).toBe(true)
			expect(result.forceFailure().value).toBeInstanceOf(
				InvalidCredentialsError,
			)
		})

		test("Deve limpar o contador após login bem-sucedido", async () => {
			await createAndSaveUser({
				name: "John Doe",
				email: "john@doe.com",
				password: "Senha123!",
			})
			await sut.execute({ email: "john@doe.com", password: "wrong" })
			// Login bem-sucedido reseta contador
			await sut.execute({ email: "john@doe.com", password: "Senha123!" })
			// 2 falhas após reset — não deve bloquear
			await sut.execute({ email: "john@doe.com", password: "wrong" })
			await sut.execute({ email: "john@doe.com", password: "wrong" })
			const result = await sut.execute({
				email: "john@doe.com",
				password: "Senha123!",
			})
			expect(result.isSuccess()).toBe(true)
		})

		test("Não deve bloquear usuário isSuperAdmin mesmo com 3 tentativas inválidas", async () => {
			// Criar usuário base para obter hash bcrypt
			const created = await User.create({
				name: "Super Admin User",
				email: "admin@admin.com",
				password: "AdminPass1!",
				role: "ADMIN",
			})
			const baseUser = created.force.success().value
			// Restaurar com isSuperAdmin=true (usando o hash gerado)
			const superAdmin = User.restore({
				id: baseUser.id,
				name: baseUser.name,
				email: baseUser.email,
				password: baseUser.password,
				role: "ADMIN",
				status: StatusTypes.ACTIVATED,
				createdAt: baseUser.createdAt,
				isSuperAdmin: true,
			})
			await userRepository.save(superAdmin)

			for (let i = 0; i < 3; i++) {
				await sut.execute({ email: "admin@admin.com", password: "wrong" })
			}
			const user = await userRepository.userOfEmail("admin@admin.com")
			expect(user?.isLocked).toBe(false)
		})
	})

	async function createAndSaveUser(userProps: CreateUserDto): Promise<User> {
		const user = await makeUser(userProps)
		await saveUser(user.force.success().value)
		return user.force.success().value

		async function makeUser(
			userProps: CreateUserDto,
		): Promise<Either<UserValidationErrors[], User>> {
			return User.create(userProps)
		}

		async function saveUser(anUser: User): Promise<void> {
			await userRepository.save(anUser)
		}
	}

	function verifyToken(token: string) {
		return authToken.verify<JWTResponse>(token, env.PRIVATE_KEY).force.success()
			.value
	}
})
