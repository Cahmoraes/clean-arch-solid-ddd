import { setupInMemoryRepositories } from "test/factory/setup-in-memory-repositories"
import {
	DomainEventPublisher,
	type Subscriber,
} from "@/shared/domain/event/domain-event-publisher"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES, USER_TYPES } from "@/shared/infra/ioc/types"
import { QueueMemoryAdapter } from "@/shared/infra/queue/queue-memory-adapter"
import { UserAlreadyExistsError } from "../error/user-already-exists-error"
import type { UserRepository } from "../persistence/repository/user-repository"
import type {
	CreateUserUseCase,
	CreateUserUseCaseInput,
} from "./create-user.usecase"

describe("CreateUserUseCase", () => {
	let sut: CreateUserUseCase
	let userRepository: UserRepository
	let queue: QueueMemoryAdapter

	beforeEach(async () => {
		container.snapshot()
		userRepository = setupInMemoryRepositories().userRepository
		queue = new QueueMemoryAdapter()
		await container.unbind(SHARED_TYPES.Queue)
		container.bind(SHARED_TYPES.Queue).toConstantValue(queue)
		sut = container.get(USER_TYPES.UseCases.CreateUser)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve criar um usuário", async () => {
		const input: CreateUserUseCaseInput = {
			name: "John Doe",
			email: "john@doe.com",
			password: "any_password",
		}
		const result = await sut.execute(input)
		const user = await userRepository.userOfEmail(input.email)
		expect(result.forceSuccess().value.email).toBe(input.email)
		expect(user?.id).toBeDefined()
		expect(user?.name).toBe(input.name)
		expect(user?.email).toBe(input.email)
		expect(user?.password).toEqual(expect.any(String))
		expect(user?.createdAt).toEqual(expect.any(Date))
		expect(queue.queues.has("userCreated")).toBe(true)
	})

	test("Não deve criar um usuário com email já existente", async () => {
		const input: CreateUserUseCaseInput = {
			name: "John Doe",
			email: "john@doe.com",
			password: "any_password",
		}
		await sut.execute(input)
		const result = await sut.execute(input)
		expect(result.forceFailure().value).toBeInstanceOf(UserAlreadyExistsError)
	})

	test("deve publicar UserCreatedEvent com name no payload", async () => {
		let receivedName: string | null = null
		const subscriber: Subscriber<unknown> = (event) => {
			if (
				typeof event.payload === "object" &&
				event.payload !== null &&
				"name" in event.payload &&
				typeof event.payload.name === "string"
			) {
				receivedName = event.payload.name
			}
		}
		DomainEventPublisher.instance.subscribe("userCreated", subscriber)

		const input: CreateUserUseCaseInput = {
			name: "João Silva",
			email: "joao@example.com",
			password: "any_password",
		}

		try {
			await sut.execute(input)
		} finally {
			DomainEventPublisher.instance.unsubscribe("userCreated", subscriber)
		}

		expect(receivedName).toBe("João Silva")
	})
})
