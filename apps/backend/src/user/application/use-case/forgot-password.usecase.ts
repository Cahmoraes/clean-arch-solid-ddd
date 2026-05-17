import { createHash, randomBytes } from "node:crypto"
import { inject, injectable } from "inversify"
import { DomainEventPublisher } from "@/shared/domain/event/domain-event-publisher"
import { type Either, success } from "@/shared/domain/value-object/either"
import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { PasswordResetTokenStore } from "@/user/application/persistence/password-reset-token-store"
import { PasswordResetRequestedEvent } from "@/user/domain/event/password-reset-requested-event"
import type { UserRepository } from "../persistence/repository/user-repository"

const PASSWORD_RESET_TTL_IN_SECONDS = 15 * 60
const EMAIL_RATE_LIMIT_MAX = 3
const EMAIL_RATE_LIMIT_WINDOW_SECONDS = 60 * 60
const EMAIL_RATE_LIMIT_WINDOW_MS = EMAIL_RATE_LIMIT_WINDOW_SECONDS * 1000
const EMAIL_RATE_LIMIT_KEY_PREFIX = "rl:forgot:email"
const EMAIL_RATE_LIMIT_WINDOW_KEY_PREFIX = "rl:forgot:email-window"

interface EmailRateLimitWindowData {
	startedAtMs: number
}

export interface ForgotPasswordUseCaseInput {
	email: string
}

export type ForgotPasswordUseCaseOutput = Either<never, null>

@injectable()
export class ForgotPasswordUseCase {
	constructor(
		@inject(USER_TYPES.Repositories.User)
		private readonly userRepository: UserRepository,
		@inject(USER_TYPES.Gateways.PasswordResetTokenStore)
		private readonly tokenStore: PasswordResetTokenStore,
		@inject(SHARED_TYPES.Redis)
		private readonly cacheDB: CacheDB,
	) {}

	public async execute(
		input: ForgotPasswordUseCaseInput,
	): Promise<ForgotPasswordUseCaseOutput> {
		const userFound = await this.userRepository.userOfEmail(input.email)
		if (!userFound) {
			return success(null)
		}

		const emailRateLimitExceeded = await this.checkEmailRateLimit(input.email)
		if (emailRateLimitExceeded) {
			return success(null)
		}

		await this.invalidatePreviousToken(userFound.id)

		const rawToken = randomBytes(32).toString("hex")
		const tokenHash = createHash("sha256").update(rawToken).digest("hex")

		await this.tokenStore.saveResetToken(
			userFound.id,
			tokenHash,
			PASSWORD_RESET_TTL_IN_SECONDS,
		)
		await this.tokenStore.saveUidMapping(
			userFound.id,
			tokenHash,
			PASSWORD_RESET_TTL_IN_SECONDS,
		)
		await DomainEventPublisher.instance.publish(
			new PasswordResetRequestedEvent({
				userEmail: userFound.email,
				userName: userFound.name,
				rawToken,
			}),
		)

		return success(null)
	}

	/**
	 * Aplica rate limiting por email com janela fixa.
	 * Como CacheDB não expõe operações atômicas de incremento nem leitura do TTL,
	 * o use case mantém um marcador separado para o início da janela e recalcula
	 * o TTL remanescente a cada atualização do contador.
	 */
	private async checkEmailRateLimit(email: string): Promise<boolean> {
		const counterKey = this.makeEmailRateLimitCounterKey(email)
		const windowKey = this.makeEmailRateLimitWindowKey(email)
		const count = await this.cacheDB.get<number>(counterKey)
		const windowData =
			await this.cacheDB.get<EmailRateLimitWindowData>(windowKey)

		if (count === null || !windowData) {
			await this.startEmailRateLimitWindow(counterKey, windowKey)
			return false
		}

		if (count >= EMAIL_RATE_LIMIT_MAX) {
			return true
		}

		const remainingWindowSeconds = this.calculateRemainingWindowSeconds(
			windowData.startedAtMs,
		)
		if (remainingWindowSeconds <= 0) {
			await this.startEmailRateLimitWindow(counterKey, windowKey)
			return false
		}

		await this.cacheDB.set(counterKey, count + 1, remainingWindowSeconds)
		return false
	}

	private async startEmailRateLimitWindow(
		counterKey: string,
		windowKey: string,
	): Promise<void> {
		const startedAtMs = Date.now()
		await this.cacheDB.set(counterKey, 1, EMAIL_RATE_LIMIT_WINDOW_SECONDS)
		await this.cacheDB.set(
			windowKey,
			{ startedAtMs },
			EMAIL_RATE_LIMIT_WINDOW_SECONDS,
		)
	}

	private calculateRemainingWindowSeconds(startedAtMs: number): number {
		const elapsedWindowMs = Date.now() - startedAtMs
		const remainingWindowMs = EMAIL_RATE_LIMIT_WINDOW_MS - elapsedWindowMs
		return Math.max(0, Math.ceil(remainingWindowMs / 1000))
	}

	private makeEmailRateLimitCounterKey(email: string): string {
		return `${EMAIL_RATE_LIMIT_KEY_PREFIX}:${email}`
	}

	private makeEmailRateLimitWindowKey(email: string): string {
		return `${EMAIL_RATE_LIMIT_WINDOW_KEY_PREFIX}:${email}`
	}

	private async invalidatePreviousToken(userId: string): Promise<void> {
		const previousHash = await this.tokenStore.findTokenHashByUserId(userId)
		if (!previousHash) {
			return
		}
		await this.tokenStore.deleteResetToken(previousHash)
		await this.tokenStore.deleteUidMapping(userId)
	}
}
