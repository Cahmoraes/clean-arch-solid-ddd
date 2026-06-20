import {
	type CreateAndSaveUserProps,
	createAndSaveUser,
} from "test/factory/create-and-save-user"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { InvalidEmailError } from "@/user/domain/error/invalid-email-error"
import { InvalidNameLengthError } from "@/user/domain/error/invalid-name-length-error"
import { User } from "@/user/domain/user"
import { NotAllowedToManageUserError } from "../error/not-allowed-to-manage-user-error"
import {
	UpdateUserProfileUseCase,
	type UpdateUserProfileUseCaseInput,
} from "./update-user-profile.usecase"

const adminProps = {
	name: "Admin User",
	email: "admin@test.com",
	password: "hashed",
	role: "ADMIN" as const,
	status: "activated" as const,
	createdAt: new Date(),
	isSuperAdmin: false,
}

describe("UpdateUserProfile", () => {
	let sut: UpdateUserProfileUseCase
	let userRepository: InMemoryUserRepository

	beforeEach(async () => {
		container.snapshot()
		userRepository = (await setupInMemoryRepositories()).userRepository
		sut = container.get(UpdateUserProfileUseCase, { autobind: true })
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve atualizar o perfil de um usuário", async () => {
		const requesterId = "requester-admin-id"
		const userId = "any_user_id"
		await userRepository.save(User.restore({ id: requesterId, ...adminProps }))
		const createAndSaveUserProps: CreateAndSaveUserProps = {
			userRepository,
			name: "john doe",
			email: "john@doe.com",
			password: "any_password",
			id: userId,
		}
		await createAndSaveUser(createAndSaveUserProps)
		const input: UpdateUserProfileUseCaseInput = {
			requesterId,
			userId,
			name: "Martin Fowler",
			email: "martin@fowler.com",
		}
		await sut.execute(input)
		const userMemory = await userRepository.userOfId(userId)
		expect(userMemory?.email).toBe(input.email)
		expect(userMemory?.name).toBe(input.name)
	})

	test("Não deve atualizar o perfil de um usuário não existente", async () => {
		const requesterId = "requester-admin-id"
		await userRepository.save(User.restore({ id: requesterId, ...adminProps }))
		const input: UpdateUserProfileUseCaseInput = {
			requesterId,
			userId: "non-existing-user-id",
			name: "Martin Fowler",
			email: "martin@fowler.com",
		}
		const result = await sut.execute(input)
		expect(result.isFailure()).toBe(true)
	})

	test("Não deve atualizar o perfil de um usuário com nome inválido", async () => {
		const requesterId = "requester-admin-id"
		const userId = "any_user_id"
		await userRepository.save(User.restore({ id: requesterId, ...adminProps }))
		const createAndSaveUserProps: CreateAndSaveUserProps = {
			userRepository,
			name: "john doe",
			email: "john@doe.com",
			password: "any_password",
			id: userId,
		}
		await createAndSaveUser(createAndSaveUserProps)
		const input: UpdateUserProfileUseCaseInput = {
			requesterId,
			userId,
			name: "",
			email: "martin@fowler.com",
		}
		const result = await sut.execute(input)
		expect(result.isFailure()).toBe(true)
		expect(result.value).toEqual([expect.any(InvalidNameLengthError)])
		const userMemory = await userRepository.userOfId(userId)
		expect(userMemory?.email).toBe("john@doe.com")
		expect(userMemory?.name).toBe("john doe")
	})

	test("Não deve atualizar o perfil de um usuário com e-mail inválido", async () => {
		const requesterId = "requester-admin-id"
		const userId = "any_user_id"
		await userRepository.save(User.restore({ id: requesterId, ...adminProps }))
		const createAndSaveUserProps: CreateAndSaveUserProps = {
			userRepository,
			name: "john doe",
			email: "john@doe.com",
			password: "any_password",
			id: userId,
		}
		await createAndSaveUser(createAndSaveUserProps)
		const input: UpdateUserProfileUseCaseInput = {
			requesterId,
			userId,
			name: "Martin Fowler",
			email: "",
		}
		const result = await sut.execute(input)
		expect(result.isFailure()).toBe(true)
		expect(result.value).toEqual([expect.any(InvalidEmailError)])
		const userMemory = await userRepository.userOfId(userId)
		expect(userMemory?.email).toBe("john@doe.com")
		expect(userMemory?.name).toBe("john doe")
	})

	test("Admin comum não pode editar outro admin (403)", async () => {
		const requester = User.restore({
			id: "admin-id",
			name: "Admin",
			email: "admin@test.com",
			password: "hashed",
			role: "ADMIN",
			status: "activated",
			createdAt: new Date(),
			isSuperAdmin: false,
		})
		const target = User.restore({
			id: "other-admin-id",
			name: "Other",
			email: "other@test.com",
			password: "hashed",
			role: "ADMIN",
			status: "activated",
			createdAt: new Date(),
			isSuperAdmin: false,
		})
		await userRepository.save(requester)
		await userRepository.save(target)

		const result = await sut.execute({
			requesterId: "admin-id",
			userId: "other-admin-id",
			name: "Hacked",
			email: "hacked@test.com",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(NotAllowedToManageUserError)
	})

	test("Admin comum edita um membro com sucesso", async () => {
		const requester = User.restore({
			id: "admin-id",
			name: "Admin",
			email: "admin@test.com",
			password: "hashed",
			role: "ADMIN",
			status: "activated",
			createdAt: new Date(),
			isSuperAdmin: false,
		})
		const target = User.restore({
			id: "member-id",
			name: "Member",
			email: "member@test.com",
			password: "hashed",
			role: "MEMBER",
			status: "activated",
			createdAt: new Date(),
			isSuperAdmin: false,
		})
		await userRepository.save(requester)
		await userRepository.save(target)

		const result = await sut.execute({
			requesterId: "admin-id",
			userId: "member-id",
			name: "Novo Nome",
			email: "novo@test.com",
		})

		expect(result.isSuccess()).toBe(true)
		const updated = await userRepository.userOfId("member-id")
		expect(updated?.name).toBe("Novo Nome")
	})

	test("Deve retornar NotAllowedToManageUserError quando requesterId não existe", async () => {
		const userId = "any_user_id"
		await createAndSaveUser({
			userRepository,
			id: userId,
			email: "john@doe.com",
		})

		const result = await sut.execute({
			requesterId: "non-existing-requester",
			userId,
			name: "Martin Fowler",
			email: "martin@fowler.com",
		})

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(NotAllowedToManageUserError)
	})
})
