import type { Gym } from "@/gym/domain/gym"
import { InvalidOperatingHoursError } from "@/gym/domain/value-object/errors/invalid-operating-hours-error.js"
import { InvalidLatitudeError } from "@/shared/domain/error/invalid-latitude-error"
import { InvalidLongitudeError } from "@/shared/domain/error/invalid-longitude-error"
import { InMemoryGymRepository } from "@/shared/infra/database/repository/in-memory/in-memory-gym-repository"
import { container } from "@/shared/infra/ioc/container"
import { GYM_TYPES } from "@/shared/infra/ioc/types"

import { GymWithCNPJAlreadyExistsError } from "../error/gym-with-cnpj-already-exists-error"
import type {
	CreateGymUseCase,
	CreateGymUseCaseInput,
} from "./create-gym.usecase"
import { FetchGymByIdUseCase } from "./fetch-gym-by-id.usecase.js"

describe("CreateGymUseCase", () => {
	let sut: CreateGymUseCase
	let gymRepository: InMemoryGymRepository

	beforeEach(() => {
		container.snapshot()
		container
			.rebind(GYM_TYPES.Repositories.Gym)
			.to(InMemoryGymRepository)
			.inSingletonScope()
		sut = container.get(GYM_TYPES.UseCases.CreateGym)
		gymRepository = container.get(GYM_TYPES.Repositories.Gym)
	})

	afterEach(() => {
		container.restore()
	})

	test("Deve criar uma Academia", async () => {
		const input: CreateGymUseCaseInput = {
			title: "fake gym",
			description: "fake description",
			latitude: -23.55052,
			longitude: -46.633308,
			phone: "11971457899",
			cnpj: "11.222.333/0001-81",
			address: "Rua Test, 123",
		}
		const result = await sut.execute(input)
		const gymId = result.forceSuccess().value.gymId
		expect(gymId).toEqual(expect.any(String))
		const gym = (await gymRepository.gymOfId(gymId)) as NonNullable<Gym>
		expect(gym.id).toEqual(expect.any(String))
		expect(gym.title).toBe(input.title)
		expect(gym.description).toBe(input.description)
		expect(gym.latitude).toBe(input.latitude)
		expect(gym.longitude).toBe(input.longitude)
		expect(gym.cnpj).toBe(input.cnpj)
		expect(gym.phone).toBe(input.phone)
		expect(gym.address).toBe(input.address)
	})

	test("Deve falhar ao criar uma Academia sem título", async () => {
		const input: CreateGymUseCaseInput = {
			title: "",
			description: "fake description",
			latitude: -23.55052,
			longitude: -46.633308,
			phone: "11971457899",
			cnpj: "11.222.333/0001-81",
			address: "Rua Test, 123",
		}
		const result = await sut.execute(input)
		expect(result.isFailure()).toBe(true)
	})

	test("Deve falhar ao criar uma Academia com latitude inválida", async () => {
		const input: CreateGymUseCaseInput = {
			title: "fake gym",
			description: "fake description",
			latitude: 999,
			longitude: -46.633308,
			phone: "11971457899",
			cnpj: "11.222.333/0001-81",
			address: "Rua Test, 123",
		}
		const result = await sut.execute(input)
		expect(result.isFailure()).toBe(true)
	})

	test("Deve falhar ao criar uma Academia com longitude inválida", async () => {
		const input: CreateGymUseCaseInput = {
			title: "fake gym",
			description: "fake description",
			latitude: -23.55052,
			longitude: 999,
			phone: "11971457899",
			cnpj: "11.222.333/0001-81",
			address: "Rua Test, 123",
		}
		const result = await sut.execute(input)
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(InvalidLongitudeError)
	})

	test("Deve falhar ao tentar criar uma Academia com longitude inválida", async () => {
		const input: CreateGymUseCaseInput = {
			title: "fake gym",
			description: "fake description",
			latitude: 999,
			longitude: -23.55052,
			phone: "11971457899",
			cnpj: "11.222.333/0001-81",
			address: "Rua Test, 123",
		}
		const result = await sut.execute(input)
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(InvalidLatitudeError)
	})

	test("Deve falhar ao tentar criar uma Academia com telefone inválido", async () => {
		const input: CreateGymUseCaseInput = {
			title: "fake gym",
			description: "fake description",
			latitude: -23.55052,
			longitude: -46.633308,
			phone: "invalid-phone",
			cnpj: "11.222.333/0001-81",
			address: "Rua Test, 123",
		}
		const result = await sut.execute(input)
		expect(result.isFailure()).toBe(true)
	})

	test("Deve falhar ao tentar criar uma Academia com telefone inválido", async () => {
		const input: CreateGymUseCaseInput = {
			title: "fake gym",
			description: "fake description",
			latitude: -23.55052,
			longitude: -46.633308,
			phone: "invalid-phone",
			cnpj: "11.222.333/0001-81",
			address: "Rua Test, 123",
		}
		const result = await sut.execute(input)
		expect(result.isFailure()).toBe(true)
	})

	test("Deve falhar ao tentar criar uma Academia com CNPJ existente", async () => {
		const input: CreateGymUseCaseInput = {
			title: "fake gym",
			description: "fake description",
			latitude: -23.55052,
			longitude: -46.633308,
			phone: "111111111",
			cnpj: "11.222.333/0001-81",
			address: "Rua Test, 123",
		}
		await sut.execute(input)
		const result = await sut.execute(input)
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(GymWithCNPJAlreadyExistsError)
	})

	test("Deve rejeitar horário com intervalo sobreposto", async () => {
		const result = await sut.execute({
			title: "Academia Teste",
			cnpj: "11.222.333/0001-81",
			latitude: -23.5,
			longitude: -46.6,
			address: "Rua X",
			phone: "11999999999",
			operatingHours: [
				{
					weekday: 1,
					intervals: [
						{ open: "08:00", close: "12:00" },
						{ open: "11:30", close: "14:00" },
					],
				},
			],
		})
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(InvalidOperatingHoursError)
	})

	test("Deve criar gym com operatingHours válido e fetch deve retornar", async () => {
		const operatingHours = [
			{ weekday: 1, intervals: [{ open: "08:00", close: "18:00" }] },
		]
		const created = await sut.execute({
			title: "Academia B",
			cnpj: "11.444.777/0001-61",
			latitude: -23.5,
			longitude: -46.6,
			address: "Rua Y",
			phone: "11999999999",
			operatingHours,
		})
		expect(created.isSuccess()).toBe(true)
		const gymId = created.forceSuccess().value.gymId
		const fetchById = new FetchGymByIdUseCase(gymRepository)
		const fetched = await fetchById.execute({ gymId })
		expect(fetched.isSuccess()).toBe(true)
		expect(fetched.forceSuccess().value.operatingHours).toEqual(operatingHours)
	})
})
