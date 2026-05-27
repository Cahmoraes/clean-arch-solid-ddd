import { UserDAOMemory } from "@/shared/infra/database/dao/in-memory/user-dao-memory"
import type { RedisAdapter } from "@/shared/infra/database/redis/redis-adapter"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { StatusTypes } from "@/user/domain/value-object/status"
import type { GetUserStatsUseCase } from "./get-user-stats.usecase"

describe("GetUserStatsUseCase", () => {
	let sut: GetUserStatsUseCase
	let userDAO: UserDAOMemory
	let redisAdapter: RedisAdapter

	beforeEach(async () => {
		container.snapshot()
		const userDAOMemory = new UserDAOMemory()
		container.rebind(USER_TYPES.DAO.User).toConstantValue(userDAOMemory)
		redisAdapter = container.get(SHARED_TYPES.Redis)
		sut = container.get(USER_TYPES.UseCases.GetUserStats)
		userDAO = container.get(USER_TYPES.DAO.User)
	})

	afterEach(async () => {
		container.restore()
		await redisAdapter.clear()
	})

	test("Deve retornar todos os contadores zerados quando não há usuários", async () => {
		userDAO.clear()
		const result = await sut.execute()
		expect(result).toEqual({
			total: 0,
			members: 0,
			admins: 0,
			active: 0,
			inactive: 0,
		})
	})

	test("Deve contar membros e admins corretamente", async () => {
		userDAO.createFakeUser({ role: "MEMBER", status: StatusTypes.ACTIVATED })
		userDAO.createFakeUser({ role: "MEMBER", status: StatusTypes.ACTIVATED })
		userDAO.createFakeUser({ role: "ADMIN", status: StatusTypes.ACTIVATED })
		const result = await sut.execute()
		expect(result.total).toBe(3)
		expect(result.members).toBe(2)
		expect(result.admins).toBe(1)
	})

	test("Deve contar ativos e inativos corretamente", async () => {
		userDAO.createFakeUser({ status: StatusTypes.ACTIVATED })
		userDAO.createFakeUser({ status: StatusTypes.ACTIVATED })
		userDAO.createFakeUser({ status: StatusTypes.SUSPENDED })
		const result = await sut.execute()
		expect(result.active).toBe(2)
		expect(result.inactive).toBe(1)
	})

	test("Deve usar cache Redis e não chamar o DAO novamente na segunda chamada", async () => {
		userDAO.createFakeUser({ role: "MEMBER", status: StatusTypes.ACTIVATED })
		const first = await sut.execute()
		userDAO.createFakeUser({ role: "ADMIN", status: StatusTypes.ACTIVATED })
		const second = await sut.execute()
		// segunda chamada usa cache — resultado igual ao primeiro
		expect(second).toEqual(first)
	})
})
