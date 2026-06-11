import { InvalidLatitudeError } from "../error/invalid-latitude-error"
import { InvalidLongitudeError } from "../error/invalid-longitude-error"
import { Coordinate } from "./coordinate"

describe("Coordinate", () => {
	test("Deve criar uma coordenada válida", () => {
		const result = Coordinate.create({ latitude: -23.55, longitude: -46.63 })
		expect(result.isSuccess()).toBe(true)
		const coordinate = result.forceSuccess().value
		expect(coordinate.latitude).toBe(-23.55)
		expect(coordinate.longitude).toBe(-46.63)
	})

	test("Não deve criar coordenada com latitude inválida", () => {
		const result = Coordinate.create({ latitude: 91, longitude: 0 })
		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidLatitudeError)
	})

	test("Não deve criar coordenada com longitude inválida", () => {
		const result = Coordinate.create({ latitude: 0, longitude: 181 })
		expect(result.isFailure()).toBe(true)
		expect(result.forceFailure().value).toBeInstanceOf(InvalidLongitudeError)
	})

	test("Deve restaurar coordenada sem validação", () => {
		const coordinate = Coordinate.restore({ latitude: 10, longitude: 20 })
		expect(coordinate.latitude).toBe(10)
		expect(coordinate.longitude).toBe(20)
	})

	describe("distanceTo", () => {
		test("Deve retornar 0 para coordenadas idênticas", () => {
			const a = Coordinate.restore({ latitude: -23.55, longitude: -46.63 })
			const b = Coordinate.restore({ latitude: -23.55, longitude: -46.63 })
			expect(a.distanceTo(b)).toBe(0)
		})

		test("Deve calcular a distância São Paulo → Rio de Janeiro (~360km)", () => {
			const saoPaulo = Coordinate.restore({
				latitude: -23.5505,
				longitude: -46.6333,
			})
			const rioDeJaneiro = Coordinate.restore({
				latitude: -22.9068,
				longitude: -43.1729,
			})
			const distance = saoPaulo.distanceTo(rioDeJaneiro)
			expect(distance).toBeGreaterThan(350)
			expect(distance).toBeLessThan(370)
		})

		test("Deve ser simétrica: a.distanceTo(b) === b.distanceTo(a)", () => {
			const a = Coordinate.restore({
				latitude: -27.0747279,
				longitude: -49.4889672,
			})
			const b = Coordinate.restore({
				latitude: -27.2092052,
				longitude: -49.6401091,
			})
			expect(a.distanceTo(b)).toBeCloseTo(b.distanceTo(a), 10)
		})
	})
})
