import {
	type CreateUserInput,
	UserDAOMemory,
} from "@/shared/infra/database/dao/in-memory/user-dao-memory"
import type { RedisAdapter } from "@/shared/infra/database/redis/redis-adapter"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { StatusTypes } from "@/user/domain/value-object/status"
import type {
	FetchUsersUseCase,
	FetchUsersUseCaseInput,
} from "./fetch-users.usecase"

describe("FetchUsersUseCase", () => {
	let sut: FetchUsersUseCase
	let userDAO: UserDAOMemory
	let redisAdapter: RedisAdapter

	beforeEach(async () => {
		container.snapshot()
		const userDAOMemory = new UserDAOMemory()
		container.rebind(USER_TYPES.DAO.User).toConstantValue(userDAOMemory)
		redisAdapter = container.get(SHARED_TYPES.Redis)
		sut = container.get(USER_TYPES.UseCases.FetchUsers)
		userDAO = container.get(USER_TYPES.DAO.User)
	})

	afterEach(async () => {
		container.restore()
		await redisAdapter.clear()
	})

	test("Deve buscar 10 usuários cadastrados na primeira página", async () => {
		const totalItems = 10
		userDAO.bulkCreateFakeUsers(totalItems)
		const input: FetchUsersUseCaseInput = {
			page: 1,
			limit: 10,
		}
		const result = await sut.execute(input)
		expect(result.pagination.total).toBe(totalItems)
		expect(result.pagination.page).toBe(1)
		const userData = result.data[0]
		expect(userData.id).toBeDefined()
		expect(userData.role).toBeDefined()
		expect(userData.createdAt).toBeDefined()
		expect(userData.name).toBeDefined()
		expect(userData.email).toBeDefined()
		expect(userData.status).toBeDefined()
	})

	test("Deve buscar 20 usuários cadastrados na segunda página", async () => {
		const totalItems = 40
		userDAO.bulkCreateFakeUsers(totalItems)
		const input: FetchUsersUseCaseInput = {
			page: 2,
			limit: 20,
		}
		const result = await sut.execute(input)
		expect(result.pagination.total).toBe(totalItems)
	})

	test("Deve retornar um total de 0 caso não existam usuários", async () => {
		const totalItems = 0
		userDAO.clear()
		const input: FetchUsersUseCaseInput = {
			page: 1,
			limit: 20,
		}
		const result = await sut.execute(input)
		expect(result.pagination.total).toBe(totalItems)
	})

	test("Deve retornar o campo status no output de cada usuário", async () => {
		userDAO.createFakeUser({
			id: "user-activated",
			status: StatusTypes.ACTIVATED,
		})
		userDAO.createFakeUser({
			id: "user-suspended",
			status: StatusTypes.SUSPENDED,
		})
		const input: FetchUsersUseCaseInput = {
			page: 1,
			limit: 10,
		}
		const result = await sut.execute(input)
		const activatedUser = result.data.find((u) => u.id === "user-activated")
		const suspendedUser = result.data.find((u) => u.id === "user-suspended")
		expect(activatedUser?.status).toBe(StatusTypes.ACTIVATED)
		expect(suspendedUser?.status).toBe(StatusTypes.SUSPENDED)
	})

	test("Deve retornar uma lista contendo apenas um usuário", async () => {
		const totalItems = 1
		const fakeUser: CreateUserInput = {
			id: "any_id",
			role: "ADMIN",
			status: StatusTypes.ACTIVATED,
			createdAt: "2021-08-01T00:00:00.000Z",
			name: "any_name",
			email: "any_email",
		}

		userDAO.createFakeUser(fakeUser)
		const input: FetchUsersUseCaseInput = {
			page: 1,
			limit: 20,
		}
		const result = await sut.execute(input)
		expect(result.pagination.total).toBe(totalItems)
		expect(result.data[0]).toEqual(fakeUser)
	})

	test("Deve filtrar usuários por nome parcial (case-insensitive)", async () => {
		userDAO.createFakeUser({
			id: "u-joao",
			name: "João Silva",
			email: "joao@example.com",
		})
		userDAO.createFakeUser({
			id: "u-maria",
			name: "Maria Santos",
			email: "maria@example.com",
		})
		const input: FetchUsersUseCaseInput = { page: 1, limit: 10, query: "joão" }
		const result = await sut.execute(input)
		expect(result.data).toHaveLength(1)
		expect(result.data[0].id).toBe("u-joao")
		expect(result.pagination.total).toBe(1)
	})

	test("Deve filtrar usuários por email parcial", async () => {
		userDAO.createFakeUser({
			id: "u-joao",
			name: "João Silva",
			email: "joao@example.com",
		})
		userDAO.createFakeUser({
			id: "u-maria",
			name: "Maria Santos",
			email: "maria@example.com",
		})
		const input: FetchUsersUseCaseInput = {
			page: 1,
			limit: 10,
			query: "maria@",
		}
		const result = await sut.execute(input)
		expect(result.data).toHaveLength(1)
		expect(result.data[0].id).toBe("u-maria")
		expect(result.pagination.total).toBe(1)
	})

	test("Deve retornar todos os usuários quando query está ausente", async () => {
		userDAO.bulkCreateFakeUsers(5)
		const input: FetchUsersUseCaseInput = { page: 1, limit: 10 }
		const result = await sut.execute(input)
		expect(result.data).toHaveLength(5)
		expect(result.pagination.total).toBe(5)
	})

	test("Deve realizar busca case-insensitive (query em maiúsculas)", async () => {
		userDAO.createFakeUser({
			id: "u-joao",
			name: "João Silva",
			email: "joao@example.com",
		})
		const input: FetchUsersUseCaseInput = { page: 1, limit: 10, query: "JOÃO" }
		const result = await sut.execute(input)
		expect(result.data).toHaveLength(1)
		expect(result.data[0].id).toBe("u-joao")
	})

	test("Deve retornar lista vazia quando nenhum usuário corresponde à query", async () => {
		userDAO.createFakeUser({
			id: "u-joao",
			name: "João Silva",
			email: "joao@example.com",
		})
		const input: FetchUsersUseCaseInput = {
			page: 1,
			limit: 10,
			query: "xyz_sem_match",
		}
		const result = await sut.execute(input)
		expect(result.data).toHaveLength(0)
		expect(result.pagination.total).toBe(0)
	})

	test("Deve paginar corretamente os resultados filtrados", async () => {
		for (let i = 1; i <= 15; i++) {
			userDAO.createFakeUser({
				id: `u-silva-${i}`,
				name: `Silva ${i}`,
				email: `silva${i}@example.com`,
			})
		}
		userDAO.createFakeUser({
			id: "u-outro",
			name: "Outro Nome",
			email: "outro@example.com",
		})
		const input: FetchUsersUseCaseInput = { page: 1, limit: 10, query: "silva" }
		const result = await sut.execute(input)
		expect(result.data).toHaveLength(10)
		expect(result.pagination.total).toBe(15)

		const page2 = await sut.execute({ page: 2, limit: 10, query: "silva" })
		expect(page2.data).toHaveLength(5)
		expect(page2.pagination.total).toBe(15)
	})

	test("Deve não colidir cache entre buscas diferentes (query diferente não retorna cache de outra query)", async () => {
		userDAO.createFakeUser({
			id: "u-joao",
			name: "João Silva",
			email: "joao@example.com",
		})
		userDAO.createFakeUser({
			id: "u-maria",
			name: "Maria Santos",
			email: "maria@example.com",
		})

		const joaoResult = await sut.execute({
			page: 1,
			limit: 10,
			query: "joao",
		})
		expect(joaoResult.data).toHaveLength(1)
		expect(joaoResult.data[0].id).toBe("u-joao")

		const mariaResult = await sut.execute({
			page: 1,
			limit: 10,
			query: "maria",
		})
		expect(mariaResult.data).toHaveLength(1)
		expect(mariaResult.data[0].id).toBe("u-maria")
		expect(mariaResult.data[0].id).not.toBe("u-joao")
	})

	test("Deve filtrar usuários por role MEMBER", async () => {
		userDAO.createFakeUser({ id: "u-member", role: "MEMBER" })
		userDAO.createFakeUser({ id: "u-admin", role: "ADMIN" })
		const result = await sut.execute({ page: 1, limit: 10, role: "MEMBER" })
		expect(result.data).toHaveLength(1)
		expect(result.data[0].id).toBe("u-member")
		expect(result.pagination.total).toBe(1)
	})

	test("Deve filtrar usuários por role ADMIN", async () => {
		userDAO.createFakeUser({ id: "u-member", role: "MEMBER" })
		userDAO.createFakeUser({ id: "u-admin", role: "ADMIN" })
		const result = await sut.execute({ page: 1, limit: 10, role: "ADMIN" })
		expect(result.data).toHaveLength(1)
		expect(result.data[0].id).toBe("u-admin")
	})

	test("Deve filtrar usuários ativos (status active)", async () => {
		userDAO.createFakeUser({ id: "u-active", status: StatusTypes.ACTIVATED })
		userDAO.createFakeUser({ id: "u-inactive", status: StatusTypes.SUSPENDED })
		const result = await sut.execute({ page: 1, limit: 10, status: "active" })
		expect(result.data).toHaveLength(1)
		expect(result.data[0].id).toBe("u-active")
	})

	test("Deve filtrar usuários inativos (status inactive)", async () => {
		userDAO.createFakeUser({ id: "u-active", status: StatusTypes.ACTIVATED })
		userDAO.createFakeUser({ id: "u-inactive", status: StatusTypes.SUSPENDED })
		const result = await sut.execute({ page: 1, limit: 10, status: "inactive" })
		expect(result.data).toHaveLength(1)
		expect(result.data[0].id).toBe("u-inactive")
	})

	test("Deve combinar filtro de role com busca por texto", async () => {
		userDAO.createFakeUser({
			id: "u-joao-member",
			name: "João",
			role: "MEMBER",
		})
		userDAO.createFakeUser({ id: "u-joao-admin", name: "João", role: "ADMIN" })
		userDAO.createFakeUser({
			id: "u-maria-member",
			name: "Maria",
			role: "MEMBER",
		})
		const result = await sut.execute({
			page: 1,
			limit: 10,
			query: "joão",
			role: "MEMBER",
		})
		expect(result.data).toHaveLength(1)
		expect(result.data[0].id).toBe("u-joao-member")
	})

	test("Não deve colidir cache entre filtros diferentes (role diferente)", async () => {
		userDAO.createFakeUser({ id: "u-member", role: "MEMBER" })
		userDAO.createFakeUser({ id: "u-admin", role: "ADMIN" })
		const members = await sut.execute({ page: 1, limit: 10, role: "MEMBER" })
		const admins = await sut.execute({ page: 1, limit: 10, role: "ADMIN" })
		expect(members.data[0].id).toBe("u-member")
		expect(admins.data[0].id).toBe("u-admin")
	})
})
