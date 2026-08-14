import { beforeEach, describe, expect, test } from "vitest"
import { InMemoryUserRepository } from "@/shared/infra/database/repository/in-memory/in-memory-user-repository"
import type {
	UserActivityDao,
	UserActivityItem,
} from "@/user/application/persistence/dao/user-activity-dao"
import { User } from "@/user/domain/user"
import { UserNotFoundError } from "../error/user-not-found-error"
import {
	GetUserActivityUseCase,
	type GetUserActivityUseCaseInput,
} from "./get-user-activity.usecase"

class FakeUserActivityDao implements UserActivityDao {
	constructor(private readonly items: UserActivityItem[] = []) {}

	public async findRecentActivity(
		_userId: string,
		limit: number,
	): Promise<UserActivityItem[]> {
		return this.items.slice(0, limit)
	}
}

describe("GetUserActivityUseCase", () => {
	let userRepository: InMemoryUserRepository

	beforeEach(() => {
		userRepository = new InMemoryUserRepository()
	})

	test("deve retornar UserNotFoundError para usuário inexistente", async () => {
		const sut = new GetUserActivityUseCase(
			userRepository,
			new FakeUserActivityDao(),
		)
		const input: GetUserActivityUseCaseInput = { userId: "non-existent-id" }

		const result = await sut.execute(input)

		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(UserNotFoundError)
	})

	test("deve retornar events vazio quando o usuário não possui atividade (FR-013)", async () => {
		const user = (
			await User.create({
				id: "user-1",
				name: "John Doe",
				email: "john@doe.com",
				password: "any_password",
			})
		).forceSuccess().value
		await userRepository.save(user)
		const sut = new GetUserActivityUseCase(
			userRepository,
			new FakeUserActivityDao([]),
		)

		const result = await sut.execute({ userId: "user-1" })

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toEqual({ events: [] })
	})

	test("deve mapear os itens de atividade retornados pelo DAO", async () => {
		const user = (
			await User.create({
				id: "user-1",
				name: "John Doe",
				email: "john@doe.com",
				password: "any_password",
			})
		).forceSuccess().value
		await userRepository.save(user)
		const occurredAt = new Date("2025-01-10T12:00:00.000Z")
		const sut = new GetUserActivityUseCase(
			userRepository,
			new FakeUserActivityDao([
				{
					id: "activity-1",
					type: "LOGIN",
					description: "Login realizado",
					occurredAt,
				},
			]),
		)

		const result = await sut.execute({ userId: "user-1" })

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value).toEqual({
			events: [
				{
					id: "activity-1",
					type: "LOGIN",
					description: "Login realizado",
					occurredAt: occurredAt.toISOString(),
				},
			],
		})
	})
})
