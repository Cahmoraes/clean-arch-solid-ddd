import { inject, injectable } from "inversify"

import type { CacheDB } from "@/shared/infra/database/redis/cache-db"
import { env } from "@/shared/infra/env"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import type { Logger } from "@/shared/infra/logger/logger"
import type { RoleTypes } from "@/user/domain/value-object/role"

import type { FetchUsersOutput, UserDAO } from "../persistence/dao/user-dao"

export interface FetchUsersUseCaseInput {
	page: number
	limit: number
}

export interface FetchUsersData {
	id: string
	role: RoleTypes
	createdAt: string
	name: string
	email: string
}

export interface FetchUsersMeta {
	total: number
	page: number
	limit: number
}

export interface FetchUsersUseCaseOutput {
	data: FetchUsersData[]
	pagination: FetchUsersMeta
}

@injectable()
export class FetchUsersUseCase {
	constructor(
		@inject(USER_TYPES.DAO.User)
		private readonly userDAO: UserDAO,
		@inject(SHARED_TYPES.Redis)
		private readonly cacheDB: CacheDB,
		@inject(SHARED_TYPES.Logger)
		private readonly logger: Logger,
	) {}

	public async execute(
		input: FetchUsersUseCaseInput,
	): Promise<FetchUsersUseCaseOutput> {
		const usersCacheResult = await this.fetchUsersFromCache(input)
		this.logger.info(this, { usersCacheResult })
		if (usersCacheResult) return usersCacheResult
		const usersData = await this.userDAO.fetchAndCountUsers(input)
		void this.saveUserDataToCache(input, usersData).catch((error) => {
			this.logger.warn(this, `Falha ao salvar cache de usuários: ${error}`)
		})
		return {
			data: usersData.usersData,
			pagination: {
				total: usersData.total,
				page: input.page,
				limit: input.limit,
			},
		}
	}

	private async fetchUsersFromCache(
		input: FetchUsersUseCaseInput,
	): Promise<FetchUsersUseCaseOutput | null> {
		return this.cacheDB.get<FetchUsersUseCaseOutput>(this.createCacheKey(input))
	}

	private createCacheKey(input: FetchUsersUseCaseInput): string {
		return `fetch-users:${input.page}:${input.limit}`
	}

	private async saveUserDataToCache(
		input: FetchUsersUseCaseInput,
		usersData: FetchUsersOutput,
	): Promise<void> {
		this.cacheDB.set(
			this.createCacheKey(input),
			{
				data: usersData,
				pagination: {
					total: usersData.total,
					page: input.page,
					limit: input.limit,
				},
			},
			env.TTL,
		)
	}
}
