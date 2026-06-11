import {
	type CreateAndSaveUserProps,
	createAndSaveUser,
} from "test/factory/create-and-save-user"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import { vi } from "vitest"
import type { Subscriber } from "@/shared/domain/event/domain-event-publisher"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { PasswordChangedEvent } from "@/user/domain/event/password-changed-event"

import { InvalidCredentialsError } from "../error/invalid-credentials-error"
import { PasswordNotSetError } from "../error/password-not-set-error"
import { PasswordUnchangedError } from "../error/password-unchanged-error"
import { UserNotFoundError } from "../error/user-not-found-error"
import {
	ChangePasswordUseCase,
	type ChangePasswordUseCaseInput,
} from "./change-password.usecase"

describe("ChangePasswordUseCase", () => {
	let sut: ChangePasswordUseCase
	let userRepository: InMemoryUserRepository

	beforeEach(async () => {
		container.snapshot()
		const repositories = setupInMemoryRepositories()
		userRepository = repositories.userRepository
		sut = container.get(ChangePasswordUseCase, { autobind: true })
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve alterar o password de um usuário", async () => {
		const createUserProps: CreateAndSaveUserProps = {
			userRepository,
			email: "john@mail.com",
			password: "12345678",
		}
		const user = await createAndSaveUser(createUserProps)
		const input: ChangePasswordUseCaseInput = {
			userId: user.id,
			currentRawPassword: "12345678",
			newRawPassword: "87654321",
		}
		const result = await sut.execute(input)
		expect(result).toBeDefined()
		expect(result.value).toBeNull()
		await expect(user.checkPassword(input.newRawPassword)).resolves.toBe(true)
	})

	test("deve publicar PasswordChangedEvent via DomainEventPublisher ao alterar senha", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "john@mail.com",
			password: "12345678",
		})

		let receivedEvent: PasswordChangedEvent | null = null
		const subscriber: Subscriber<unknown> = (event) => {
			if (event instanceof PasswordChangedEvent) receivedEvent = event
		}
		DomainEventPublisher.instance.subscribe("passwordChanged", subscriber)

		try {
			await sut.execute({
				userId: user.id,
				currentRawPassword: "12345678",
				newRawPassword: "87654321",
			})
		} finally {
			DomainEventPublisher.instance.unsubscribe("passwordChanged", subscriber)
		}

		expect(receivedEvent).not.toBeNull()
		expect(receivedEvent).toEqual(
			expect.objectContaining({
				payload: expect.objectContaining({
					userEmail: "john@mail.com",
				}),
			}),
		)
	})

	test("Não deve alterar o password de um usuário inexistente", async () => {
		const input: ChangePasswordUseCaseInput = {
			userId: "invalid-id",
			currentRawPassword: "12345678",
			newRawPassword: "87654321",
		}
		const result = await sut.execute(input)
		expect(result).toBeDefined()
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(UserNotFoundError)
	})

	test("Deve falhar ao tentar alterar o password com uma senha inválida", async () => {
		const createUserProps: CreateAndSaveUserProps = {
			userRepository,
			email: "jane@mail.com",
			password: "12345678",
		}
		const user = await createAndSaveUser(createUserProps)
		const input: ChangePasswordUseCaseInput = {
			userId: user.id,
			currentRawPassword: "12345678",
			newRawPassword: "",
		}
		const result = await sut.execute(input)
		expect(result).toBeDefined()
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(Error)
	})

	test("Deve falhar ao tentar alterar o password com um userId inválido", async () => {
		const createUserProps: CreateAndSaveUserProps = {
			userRepository,
			email: "jane@mail.com",
			password: "12345678",
		}
		await createAndSaveUser(createUserProps)
		const input: ChangePasswordUseCaseInput = {
			userId: "invalid-id",
			currentRawPassword: "12345678",
			newRawPassword: "87654321",
		}
		const result = await sut.execute(input)
		expect(result).toBeDefined()
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(UserNotFoundError)
	})

	test("Deve alterar o password de um usuário e verificar se o antigo não funciona mais", async () => {
		const createUserProps: CreateAndSaveUserProps = {
			userRepository,
			email: "john.doe@mail.com",
			password: "12345678",
		}
		const user = await createAndSaveUser(createUserProps)
		const input: ChangePasswordUseCaseInput = {
			userId: user.id,
			currentRawPassword: "12345678",
			newRawPassword: "87654321",
		}
		const result = await sut.execute(input)
		expect(result).toBeDefined()
		expect(result.value).toBeNull()
		await expect(user.checkPassword(input.newRawPassword)).resolves.toBe(true)
		await expect(user.checkPassword("12345678")).resolves.toBe(false)
	})

	test("Não deve criar deve alterar para o mesmo password", async () => {
		const createUserProps: CreateAndSaveUserProps = {
			userRepository,
			email: "john.doe@mail.com",
			password: "12345678",
		}
		const user = await createAndSaveUser(createUserProps)
		const input: ChangePasswordUseCaseInput = {
			userId: user.id,
			currentRawPassword: "12345678",
			newRawPassword: "12345678",
		}
		const result = await sut.execute(input)
		expect(result.isFailure()).toBeTruthy()
		expect(result.value).toBeInstanceOf(PasswordUnchangedError)
	})

	test("Deve exigir a senha atual correta antes de alterar o password", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "john@mail.com",
			password: "12345678",
		})

		const result = await sut.execute({
			userId: user.id,
			currentRawPassword: "senha_errada",
			newRawPassword: "87654321",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(InvalidCredentialsError)
	})

	test("Deve persistir a senha alterada chamando update no repositório", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "persist@mail.com",
			password: "12345678",
		})
		const updateSpy = vi.spyOn(userRepository, "update")

		const result = await sut.execute({
			userId: user.id,
			currentRawPassword: "12345678",
			newRawPassword: "87654321",
		})

		expect(result.isSuccess()).toBe(true)
		expect(updateSpy).toHaveBeenCalledWith(
			expect.objectContaining({ id: user.id }),
		)
	})

	test("Deve falhar quando o usuário não possui senha local", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "google-only@mail.com",
			googleId: "google-sub-123",
		})

		const result = await sut.execute({
			userId: user.id,
			currentRawPassword: "qualquer_senha",
			newRawPassword: "87654321",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(PasswordNotSetError)
	})
})
