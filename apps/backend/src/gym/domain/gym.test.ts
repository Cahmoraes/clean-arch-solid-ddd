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
		}
		const gym = Gym.restore(input)
		expect(gym.address).toBeUndefined()
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
		})
		expect(gym.imageKey).toBeUndefined()
	})
})
