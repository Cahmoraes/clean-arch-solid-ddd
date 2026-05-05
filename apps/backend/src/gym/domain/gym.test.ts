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
