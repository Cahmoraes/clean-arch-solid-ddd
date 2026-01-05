import { UserStatus } from "@prisma/client"

import { InvalidEmailError } from "./error/invalid-email-error"
import { InvalidNameLengthError } from "./error/invalid-name-length-error"
import { type CreateUserDto, User, type UserRestore } from "./user"
import { RoleValues } from "./value-object/role"

describe("User Entity", () => {
	test("Deve criar um usuário", async () => {
		const input: CreateUserDto = {
			name: "John Doe",
			email: "john.doe@example.com",
			password: "securepassword123",
		}
		const user = (await User.create(input)).force.success().value
		expect(user.name).toEqual(input.name)
		expect(user.email).toEqual(input.email)
		expect(user.role).toBe(RoleValues.MEMBER)
		expect(user.password).toEqual(expect.any(String))
		expect(user.createdAt).toEqual(expect.any(Date))
		expect(user.updatedAt).toBeUndefined()
		expect(user.id).toBeNull()
		expect(user.isActive).toBe(true)
		expect(user.status).toBe(UserStatus.activated)
		expect(user.billingCustomerId).toBeUndefined()
	})

	test("Deve restaurar um usuário", () => {
		const input: UserRestore = {
			createdAt: new Date(),
			id: "any_id",
			name: "John Doe",
			email: "john.doe@example.com",
			password: "securepassword123",
			role: RoleValues.MEMBER,
			status: "activated",
		}
		const user = User.restore(input)
		expect(user).toBeDefined()
		expect(user.id).toEqual(input.id)
		expect(user.name).toEqual(input.name)
		expect(user.email).toEqual(input.email)
		expect(user.role).toEqual(input.role)
		expect(user.password).toEqual(expect.any(String))
		expect(user.createdAt).toEqual(input.createdAt)
		expect(user.isActive).toBe(true)
	})

	test("Não deve criar um usuário com nome inválido", async () => {
		const input: CreateUserDto = {
			name: "",
			email: "john.doe@example.com",
			password: "securepassword123",
		}
		const userOrError = await User.create(input)
		expect(userOrError.forceFailure().value).toEqual([
			expect.any(InvalidNameLengthError),
		])
	})

	test("Não deve criar um usuário com email inválido", async () => {
		const input: CreateUserDto = {
			name: "John Doe",
			email: "",
			password: "securepassword123",
		}
		const userOrError = await User.create(input)
		expect(userOrError.forceFailure().value).toEqual([
			expect.any(InvalidEmailError),
		])
	})

	test("Não deve criar um usuário com nome e email inválido", async () => {
		const input: CreateUserDto = {
			name: "",
			email: "",
			password: "securepassword123",
		}
		const userOrError = await User.create(input)
		expect(userOrError.forceFailure().value).toEqual([
			expect.any(InvalidNameLengthError),
			expect.any(InvalidEmailError),
		])
	})

	test("Deve criar um usuário com uma data de criação pré-definida", async () => {
		const input: CreateUserDto = {
			name: "John Doe",
			email: "john.doe@example.com",
			password: "securepassword123",
			createdAt: new Date(),
		}
		const userOrError = await User.create(input)
		expect(userOrError.forceSuccess().value.createdAt).toBe(input.createdAt)
	})

	test("Deve criar um usuário ADMINISTRADOR", async () => {
		const input: CreateUserDto = {
			name: "John Doe",
			email: "john.doe@example.com",
			password: "securepassword123",
			role: "ADMIN",
			createdAt: new Date(),
		}
		const userOrError = await User.create(input)
		expect(userOrError.forceSuccess().value.role).toBe(RoleValues.ADMIN)
	})

	test("Deve restaurar um usuário ADMINISTRADOR", () => {
		const input: UserRestore = {
			createdAt: new Date(),
			id: "any_id",
			name: "John Doe",
			email: "john.doe@example.com",
			password: "securepassword123",
			role: RoleValues.ADMIN,
			status: "activated",
		}
		const user = User.restore(input)
		expect(user.role).toEqual(RoleValues.ADMIN)
	})

	test("Deve alterar a senha de um usuário", async () => {
		const input: CreateUserDto = {
			name: "John Doe",
			email: "john.doe@example.com",
			password: "123456",
		}
		const user = (await User.create(input)).forceSuccess().value
		const oldPassword = user.password
		const newRawPassword = "654321"
		const result = await user.changePassword(newRawPassword)
		expect(result.isSuccess()).toBe(true)
		expect(user.password).not.toBe(oldPassword)
		await expect(user.checkPassword(newRawPassword)).resolves.toBe(true)
	})

	test("Deve atualizar um usuário com dados alterados", async () => {
		const input: CreateUserDto = {
			name: "John Doe",
			email: "john.doe@example.com",
			password: "securepassword123",
		}
		const observer = vi.fn()
		const user = (await User.create(input)).forceSuccess().value
		user.subscribe(observer)
		const updateUserResult = await user.updateProfile({
			email: "martin@fowler.com",
			name: "Martin Fowler",
		})
		expect(updateUserResult.isSuccess()).toBe(true)
		expect(observer).toBeCalledTimes(1)
		expect(user).toBeInstanceOf(User)
		expect(user.id).toBe(user.id)
		expect(user.name).toBe("Martin Fowler")
		expect(user.email).toBe("martin@fowler.com")
		await expect(user.checkPassword("securepassword123")).resolves.toBe(true)
	})

	test("Deve suspender um usuário ativo", async () => {
		const input: CreateUserDto = {
			name: "John Doe",
			email: "john.doe@example.com",
			password: "securepassword123",
		}
		const user = (await User.create(input)).forceSuccess().value
		expect(user.isSuspend).toBe(false)
		user.suspend()
		expect(user.isActive).toBe(false)
		expect(user.isSuspend).toBe(true)
	})

	test("Deve ativar um usuário suspenso", async () => {
		const input: CreateUserDto = {
			name: "John Doe",
			email: "john.doe@example.com",
			password: "securepassword123",
			status: "suspended",
		}
		const user = (await User.create(input)).forceSuccess().value
		expect(user.isSuspend).toBe(true)
		user.activate()
		expect(user.isSuspend).toBe(false)
		expect(user.isActive).toBe(true)
	})

	test("Deve restaurar um usuário suspenso", () => {
		const input: UserRestore = {
			createdAt: new Date(),
			id: "any_id",
			name: "John Doe",
			email: "john.doe@example.com",
			password: "securepassword123",
			role: RoleValues.MEMBER,
			status: "suspended",
		}
		const user = User.restore(input)
		expect(user.isActive).toBe(false)
	})

	test("Deve criar definir um billingCustomerId para um usuário", async () => {
		const BILLING_CUSTOMER_ID = "customer-billing-id"
		const input: CreateUserDto = {
			name: "John Doe",
			email: "john.doe@example.com",
			password: "securepassword123",
		}
		const user = (await User.create(input)).force.success().value
		expect(user.billingCustomerId).toBeUndefined()
		user.assignBillingCustomerId(BILLING_CUSTOMER_ID)
		expect(user.billingCustomerId).toBe(BILLING_CUSTOMER_ID)
	})

	test.each([
		null,
		undefined,
		"",
	])("Não Deve criar definir um inválido para um usuário", async (invalidValue) => {
		const input: CreateUserDto = {
			name: "John Doe",
			email: "john.doe@example.com",
			password: "securepassword123",
		}
		const user = (await User.create(input)).force.success().value
		expect(user.billingCustomerId).toBeUndefined()
		user.assignBillingCustomerId(invalidValue as string)
		expect(user.billingCustomerId).toBeUndefined()
	})
})
