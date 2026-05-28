import { container } from "@/shared/infra/ioc/container"
import { USER_TYPES } from "@/shared/infra/ioc/types"
import type { LoginAttemptStore } from "@/user/application/persistence/login-attempt-store"

describe("RedisLoginAttemptStore", () => {
	let sut: LoginAttemptStore

	beforeEach(() => {
		container.snapshot()
		sut = container.get(USER_TYPES.Gateways.LoginAttemptStore)
	})

	afterEach(() => {
		container.restore()
	})

	test("increment deve retornar 1 na primeira chamada", async () => {
		const count = await sut.increment("test@test.com", 900)
		expect(count).toBe(1)
	})

	test("increment deve acumular contagem", async () => {
		await sut.increment("test@test.com", 900)
		await sut.increment("test@test.com", 900)
		const count = await sut.increment("test@test.com", 900)
		expect(count).toBe(3)
	})

	test("deleteFailedAttempts deve zerar o contador", async () => {
		await sut.increment("test@test.com", 900)
		await sut.deleteFailedAttempts("test@test.com")
		const count = await sut.increment("test@test.com", 900)
		expect(count).toBe(1)
	})

	test("setLocked deve criar a chave de lock", async () => {
		await sut.setLocked("user-123")
		const locked = await sut.isLocked("user-123")
		expect(locked).toBe(true)
	})

	test("isLocked deve retornar false quando não bloqueado", async () => {
		const locked = await sut.isLocked("user-not-locked")
		expect(locked).toBe(false)
	})

	test("deleteLock deve remover a chave de lock", async () => {
		await sut.setLocked("user-123")
		await sut.deleteLock("user-123")
		const locked = await sut.isLocked("user-123")
		expect(locked).toBe(false)
	})
})
