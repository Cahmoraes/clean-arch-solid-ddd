import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { Either } from "@/shared/domain/value-object/either"
import { env } from "@/shared/infra/env"
import { container } from "@/shared/infra/ioc/container"
import { AUTH_TYPES, SHARED_TYPES } from "@/shared/infra/ioc/types"
import type { AuthToken } from "@/user/application/auth/auth-token"
import { InvalidCredentialsError } from "@/user/application/error/invalid-credentials-error"
import type { UserRepository } from "@/user/application/persistence/repository/user-repository"
import {
	type CreateUserDto,
	User,
	type UserValidationErrors,
} from "@/user/domain/user"
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
