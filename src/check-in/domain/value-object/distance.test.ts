import { InvalidDistanceError } from "../error/invalid-distance-error"
import { Coordinate } from "./coordinate"
import { Distance } from "./distance"

describe("Distance", () => {
	test("Deve criar uma distância", () => {
		// Given
		const fromCoord = Coordinate.create({
			latitude: -23.5505,
			longitude: -46.6333,
		}).forceSuccess().value
		const toCoord = Coordinate.create({
			latitude: -22.9068,
			longitude: -43.1729,
		}).forceSuccess().value
		// When
		const distancia = Distance.create(fromCoord, toCoord).forceSuccess().value
		// Then
		// Distância aproximada entre São Paulo e Rio de Janeiro
		expect(distancia.value).toBeGreaterThan(350)
		expect(distancia.value).toBeLessThan(400)
		expect(distancia.from.latitude).toBe(-23.5505)
		expect(distancia.from.longitude).toBe(-46.6333)
		expect(distancia.to.latitude).toBe(-22.9068)
		expect(distancia.to.longitude).toBe(-43.1729)
	})

	test("Deve retornar distância zero para coordenadas iguais", () => {
		// Given
		const coord = Coordinate.create({
			latitude: -23.5505,
			longitude: -46.6333,
		}).forceSuccess().value
		// When
		const distancia = Distance.create(coord, coord).forceSuccess().value
		// Then
		expect(distancia.value).toBe(0)
	})

	test("Deve falhar ao criar distância com coordenada inválida", () => {
		// Given
		const invalidCoord = { latitude: -91, longitude: -46.6333 }
		const validCoord = Coordinate.create({
			latitude: -23.5505,
			longitude: -46.6333,
		}).forceSuccess().value
		// When
		const result = Distance.create(invalidCoord, validCoord)
		// Then
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(InvalidDistanceError)
	})

	test("Deve criar uma distância com DTOs de coordenadas válidas", () => {
		// Given
		const fromCoordDTO = { latitude: -23.5505, longitude: -46.6333 }
		const toCoordDTO = { latitude: -22.9068, longitude: -43.1729 }
		// When
		const distancia = Distance.create(fromCoordDTO, toCoordDTO).forceSuccess()
			.value
		// Then
		expect(distancia.value).toBeGreaterThan(350)
		expect(distancia.value).toBeLessThan(400)
		expect(distancia.from.latitude).toBe(-23.5505)
		expect(distancia.from.longitude).toBe(-46.6333)
		expect(distancia.to.latitude).toBe(-22.9068)
		expect(distancia.to.longitude).toBe(-43.1729)
	})

	test("Deve falhar ao criar distância com ambas coordenadas inválidas", () => {
		// Given
		const invalidCoord1 = { latitude: -91, longitude: -46.6333 }
		const invalidCoord2 = { latitude: -23.5505, longitude: -181 }
		// When
		const result = Distance.create(invalidCoord1, invalidCoord2)
		// Then
		expect(result.isFailure()).toBe(true)
		expect(result.value).toBeInstanceOf(InvalidDistanceError)
	})

	test("Deve criar uma distância com coordenadas no mesmo meridiano", () => {
		// Given
		const fromCoord = Coordinate.create({
			latitude: 0,
			longitude: 0,
		}).forceSuccess().value
		const toCoord = Coordinate.create({
			latitude: 10,
			longitude: 0,
		}).forceSuccess().value
		// When
		const distancia = Distance.create(fromCoord, toCoord).forceSuccess().value
		// Then
		expect(distancia.value).toBeGreaterThan(1100)
		expect(distancia.value).toBeLessThan(1200)
	})

	test("Deve criar uma distância com coordenadas no mesmo paralelo", () => {
		// Given
		const fromCoord = Coordinate.create({
			latitude: 0,
			longitude: 0,
		}).forceSuccess().value
		const toCoord = Coordinate.create({
			latitude: 0,
			longitude: 10,
		}).forceSuccess().value
		// When
		const distancia = Distance.create(fromCoord, toCoord).forceSuccess().value
		// Then
		expect(distancia.value).toBeGreaterThan(1100)
		expect(distancia.value).toBeLessThan(1200)
	})
})
