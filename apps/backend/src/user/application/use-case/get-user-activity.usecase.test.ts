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

	public async findActivityPage(
		_userId: string,
		page: number,
		pageSize: number,
	) {
		const total = this.items.length
		const skip = (page - 1) * pageSize
		return {
			items: this.items.slice(skip, skip + pageSize),
			pagination: {
				page,
				pageSize,
				total,
				totalPages: Math.ceil(total / pageSize),
			},
		}
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
		expect(result.forceSuccess().value).toEqual({
			events: [],
			pagination: {
				page: 1,
				pageSize: 20,
				total: 0,
				totalPages: 0,
			},
		})
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
			pagination: {
				page: 1,
				pageSize: 20,
				total: 1,
				totalPages: 1,
			},
		})
	})

	test("deve retornar segunda página com metadados completos para 21 itens", async () => {
		const user = (
			await User.create({
				id: "user-1",
				name: "John Doe",
				email: "john@doe.com",
				password: "any_password",
			})
		).forceSuccess().value
		await userRepository.save(user)
		const items = Array.from({ length: 21 }, (_, index) => ({
			id: `activity-${index}`,
			type: "LOGIN" as const,
			description: "Login realizado",
			occurredAt: new Date(
				`2025-01-${String(21 - index).padStart(2, "0")}T00:00:00.000Z`,
			),
		}))
		const sut = new GetUserActivityUseCase(
			userRepository,
			new FakeUserActivityDao(items),
		)

		const result = await sut.execute({ userId: "user-1", page: 2 })

		expect(result.isSuccess()).toBe(true)
		expect(result.forceSuccess().value.pagination).toEqual({
			page: 2,
			pageSize: 20,
			total: 21,
			totalPages: 2,
		})
		expect(result.forceSuccess().value.events).toHaveLength(1)
		expect(result.forceSuccess().value.events[0].id).toBe("activity-20")
	})
})
