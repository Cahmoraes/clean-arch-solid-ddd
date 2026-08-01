import { GymAlreadyActivatedError } from "./error/gym-already-activated-error.js"
import { GymAlreadyDeactivatedError } from "./error/gym-already-deactivated-error.js"
import { Gym, type GymCreateProps, type GymRestoreProps } from "./gym"

describe("Gym Entity", () => {
	test("Deve criar uma academia", () => {
		const input: GymCreateProps = {
			title: "fake gym",
			description: "fake description",
			latitude: -23.55052,
			longitude: -46.633308,
			phone: "11971457899",
			cnpj: "11.222.333/0001-81",
			address: "Rua das Flores, 123, São Paulo - SP",
		}
		const gym = Gym.create(input).forceSuccess().value
		expect(gym.title).toBe(input.title)
		expect(gym.description).toBe(input.description)
		expect(gym.latitude).toBe(input.latitude)
		expect(gym.longitude).toBe(input.longitude)
		expect(gym.phone).toBe(input.phone)
		expect(gym.address).toBe(input.address)
	})

	test("Deve restaurar uma academia com address", () => {
		const input: GymRestoreProps = {
			title: "fake gym",
			description: "fake description",
			latitude: -23.55052,
			longitude: -46.633308,
			phone: "11971457899",
			id: "fake_id",
			cnpj: "11.222.333/0001-81",
			address: "Rua das Flores, 123, São Paulo - SP",
			status: "activated",
		}
		const gym = Gym.restore(input)
		expect(gym.address).toBe(input.address)
	})

	test("Deve restaurar uma academia sem address (dados legados)", () => {
		const input: GymRestoreProps = {
			title: "fake gym",
			description: "fake description",
			latitude: -23.55052,
			longitude: -46.633308,
			phone: "11971457899",
			id: "fake_id",
			cnpj: "11.222.333/0001-81",
			status: "activated",
		}
		const gym = Gym.restore(input)
		expect(gym.address).toBeUndefined()
	})

	test("Deve restaurar uma academia com status 'deactivated' e permitir reativação", () => {
		const gym = Gym.restore({
			id: "gym-deactivated",
			title: "Academia Desativada",
			latitude: -23.55052,
			longitude: -46.633308,
			cnpj: "11.222.333/0001-81",
			address: "Rua das Flores, 123",
			status: "deactivated",
		})
		expect(gym.status).toBe("deactivated")
		const result = gym.activate()
		expect(result.isSuccess()).toBe(true)
		expect(gym.status).toBe("activated")
	})
})

describe("Gym imageKey", () => {
	test("expõe imageKey quando fornecido no create", () => {
		const gym = Gym.create({
			title: "Academia Teste",
			latitude: 0,
			longitude: 0,
			cnpj: "11.222.333/0001-81",
			address: "Rua Padrão, 1",
			imageKey: "gyms/abc.webp",
		}).forceSuccess().value
		expect(gym.imageKey).toBe("gyms/abc.webp")
	})

	test("imageKey é undefined quando não fornecido", () => {
		const gym = Gym.create({
			title: "Academia Teste",
			latitude: 0,
			longitude: 0,
			cnpj: "11.222.333/0001-81",
			address: "Rua Padrão, 1",
		}).forceSuccess().value
		expect(gym.imageKey).toBeUndefined()
	})

	test("restore preserva imageKey", () => {
		const gym = Gym.restore({
			id: "gym-1",
			title: "Academia Teste",
			latitude: 0,
			longitude: 0,
			cnpj: "11.222.333/0001-81",
			address: "Rua Padrão, 1",
			imageKey: "gyms/xyz.webp",
			status: "activated",
		})
		expect(gym.imageKey).toBe("gyms/xyz.webp")
	})

	test("restore sem imageKey resulta em undefined", () => {
		const gym = Gym.restore({
			id: "gym-2",
			title: "Academia Teste",
			latitude: 0,
			longitude: 0,
			cnpj: "11.222.333/0001-81",
			address: "Rua Padrão, 1",
			status: "activated",
		})
		expect(gym.imageKey).toBeUndefined()
	})
})

describe("Gym status", () => {
	test("Gym.create() resulta em status 'activated'", () => {
		const gymOrError = Gym.create({
			title: "Academia Central",
			latitude: -23.55,
			longitude: -46.63,
			cnpj: "11.222.333/0001-81",
			address: "Rua das Flores, 123",
		})
		const gym = gymOrError.forceSuccess().value
		expect(gym.status).toBe("activated")
	})

	test("gym.deactivate() muda o status para 'deactivated' e retorna sucesso", () => {
		const gymOrError = Gym.create({
			title: "Academia Central",
			latitude: -23.55,
			longitude: -46.63,
			cnpj: "11.222.333/0001-81",
			address: "Rua das Flores, 123",
		})
		const gym = gymOrError.forceSuccess().value
		const result = gym.deactivate()
		expect(result.isSuccess()).toBe(true)
		expect(gym.status).toBe("deactivated")
	})

	test("gym.deactivate() chamado duas vezes seguidas retorna failure na segunda chamada", () => {
		const gymOrError = Gym.create({
			title: "Academia Central",
			latitude: -23.55,
			longitude: -46.63,
			cnpj: "11.222.333/0001-81",
			address: "Rua das Flores, 123",
		})
		const gym = gymOrError.forceSuccess().value
		gym.deactivate()
		const secondResult = gym.deactivate()
		expect(secondResult.isFailure()).toBe(true)
		expect(secondResult.forceFailure().value).toBeInstanceOf(
			GymAlreadyDeactivatedError,
		)
		expect(gym.status).toBe("deactivated")
	})

	test("gym.activate() numa academia desativada muda o status para 'activated'", () => {
		const gymOrError = Gym.create({
			title: "Academia Central",
			latitude: -23.55,
			longitude: -46.63,
			cnpj: "11.222.333/0001-81",
			address: "Rua das Flores, 123",
		})
		const gym = gymOrError.forceSuccess().value
		gym.deactivate()
		const result = gym.activate()
		expect(result.isSuccess()).toBe(true)
		expect(gym.status).toBe("activated")
	})

	test("gym.activate() numa academia já ativa retorna failure(GymAlreadyActivatedError)", () => {
		const gymOrError = Gym.create({
			title: "Academia Central",
			latitude: -23.55,
			longitude: -46.63,
			cnpj: "11.222.333/0001-81",
			address: "Rua das Flores, 123",
		})
		const gym = gymOrError.forceSuccess().value
		const result = gym.activate()
		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(GymAlreadyActivatedError)
	})
})
