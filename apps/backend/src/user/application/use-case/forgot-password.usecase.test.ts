import { createHash } from "node:crypto"
import { createAndSaveUser } from "test/factory/create-and-save-user"
import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import { vi } from "vitest"
import {
	DomainEventPublisher,
	type Subscriber,
} from "@/shared/domain/event/domain-event-publisher"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { InMemoryPasswordResetTokenStore } from "@/shared/infra/database/repository/in-memory/in-memory-password-reset-token-store"
import type { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { PasswordResetRequestedEvent } from "@/user/domain/event/password-reset-requested-event"
import type { ForgotPasswordUseCase } from "./forgot-password.usecase"

describe("ForgotPasswordUseCase", () => {
	let sut: ForgotPasswordUseCase
	let userRepository: InMemoryUserRepository
	let tokenStore: InMemoryPasswordResetTokenStore
	let cacheDB: CacheDB

	beforeEach(async () => {
		container.snapshot()
		const repositories = setupInMemoryRepositories()
		userRepository = repositories.userRepository
		tokenStore = new InMemoryPasswordResetTokenStore()
		container
			.rebind(USER_TYPES.Gateways.PasswordResetTokenStore)
			.toConstantValue(tokenStore)
		cacheDB = container.get(SHARED_TYPES.Redis)
		await cacheDB.clear()
		sut = container.get<ForgotPasswordUseCase>(
			USER_TYPES.UseCases.ForgotPassword,
		)
	})

	afterEach(() => {
		vi.useRealTimers()
		vi.restoreAllMocks()
		container.restore()
	})

	test("retorna success(null) para email inexistente (sem enumeração)", async () => {
		const saveSpy = vi.spyOn(tokenStore, "saveResetToken")

		const result = await sut.execute({ email: "nao-existe@test.com" })

		expect(result.isSuccess()).toBe(true)
		expect(result.value).toBeNull()
		expect(saveSpy).not.toHaveBeenCalled()
	})

	test("gera token hash SHA-256 para email válido", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "user@test.com",
			name: "John Doe",
		})

		let receivedEvent: PasswordResetRequestedEvent | null = null
		const subscriber: Subscriber<unknown> = (event) => {
			if (event instanceof PasswordResetRequestedEvent) {
				receivedEvent = event
			}
		}
		DomainEventPublisher.instance.subscribe(
			"passwordResetRequested",
			subscriber,
		)

		try {
			const result = await sut.execute({ email: user.email })

			expect(result.isSuccess()).toBe(true)
			expect(result.value).toBeNull()
			const publishedEvent = getPublishedEventOrThrow(receivedEvent)
			expect(publishedEvent.payload.rawToken).toHaveLength(64)
			const storedHash = await tokenStore.findTokenHashByUserId(user.id)
			const expectedHash = createHash("sha256")
				.update(publishedEvent.payload.rawToken)
				.digest("hex")
			expect(storedHash).toBe(expectedHash)
			expect(await tokenStore.findUserIdByTokenHash(expectedHash)).toBe(user.id)
		} finally {
			DomainEventPublisher.instance.unsubscribe(
				"passwordResetRequested",
				subscriber,
			)
		}
	})

	test("invalida token anterior ao gerar um novo", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "user@test.com",
		})

		await sut.execute({ email: user.email })
		const firstHash = await tokenStore.findTokenHashByUserId(user.id)

		await sut.execute({ email: user.email })
		const secondHash = await tokenStore.findTokenHashByUserId(user.id)

		expect(firstHash).not.toBeNull()
		expect(secondHash).not.toBeNull()
		expect(firstHash).not.toBe(secondHash)
		expect(await tokenStore.findUserIdByTokenHash(firstHash ?? "")).toBeNull()
	})

	test("publica evento de solicitação de reset com dados do usuário e token bruto", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "user@test.com",
			name: "John Doe",
		})

		let receivedEvent: PasswordResetRequestedEvent | null = null
		const subscriber: Subscriber<unknown> = (event) => {
			if (event instanceof PasswordResetRequestedEvent) {
				receivedEvent = event
			}
		}
		DomainEventPublisher.instance.subscribe(
			"passwordResetRequested",
			subscriber,
		)

		try {
			await sut.execute({ email: user.email })
		} finally {
			DomainEventPublisher.instance.unsubscribe(
				"passwordResetRequested",
				subscriber,
			)
		}

		const publishedEvent = getPublishedEventOrThrow(receivedEvent)
		expect(publishedEvent.payload.userEmail).toBe(user.email)
		expect(publishedEvent.payload.userName).toBe(user.name)
		expect(publishedEvent.payload.rawToken).toMatch(/^[a-f0-9]{64}$/)
	})

	test("mantém a janela fixa do rate limit por email", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "window@test.com",
		})
		const cacheSetSpy = vi.spyOn(cacheDB, "set")
		const firstRequestAt = new Date("2026-01-01T00:00:00.000Z")
		const secondRequestAt = new Date("2026-01-01T00:10:00.000Z")

		vi.useFakeTimers()

		try {
			vi.setSystemTime(firstRequestAt)
			await sut.execute({ email: user.email })
			vi.setSystemTime(secondRequestAt)
			await sut.execute({ email: user.email })
		} finally {
			vi.useRealTimers()
		}

		expect(cacheSetSpy).toHaveBeenCalledWith(
			`rl:forgot:email:${user.email}`,
			1,
			3600,
		)
		expect(cacheSetSpy).toHaveBeenCalledWith(
			`rl:forgot:email-window:${user.email}`,
			{ startedAtMs: firstRequestAt.getTime() },
			3600,
		)
		expect(cacheSetSpy).toHaveBeenCalledWith(
			`rl:forgot:email:${user.email}`,
			2,
			3000,
		)
	})

	test("aplica rate limit por email e não gera novo token acima do limite", async () => {
		const user = await createAndSaveUser({
			userRepository,
			email: "user@test.com",
		})

		let publishedEventsCount = 0
		const subscriber: Subscriber<unknown> = () => {
			publishedEventsCount += 1
		}
		DomainEventPublisher.instance.subscribe(
			"passwordResetRequested",
			subscriber,
		)

		try {
			await sut.execute({ email: user.email })
			await sut.execute({ email: user.email })
			await sut.execute({ email: user.email })
			const hashBeforeLimitExceeded = await tokenStore.findTokenHashByUserId(
				user.id,
			)

			const result = await sut.execute({ email: user.email })
			const hashAfterLimitExceeded = await tokenStore.findTokenHashByUserId(
				user.id,
			)

			expect(result.isSuccess()).toBe(true)
			expect(result.value).toBeNull()
			expect(hashAfterLimitExceeded).toBe(hashBeforeLimitExceeded)
			expect(publishedEventsCount).toBe(3)
		} finally {
			DomainEventPublisher.instance.unsubscribe(
				"passwordResetRequested",
				subscriber,
			)
		}
	})
})

function getPublishedEventOrThrow(
	event: PasswordResetRequestedEvent | null,
): PasswordResetRequestedEvent {
	if (!event) {
		throw new Error("Expected PasswordResetRequestedEvent to be published")
	}

	return event
}
