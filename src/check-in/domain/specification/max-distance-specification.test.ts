import { Distance } from "../value-object/distance"
import { MaxDistanceSpecification } from "./max-distance-specification"

describe("Max Distance Specification", () => {
	test("Deve retornar verdadeiro se a distância for maior que a distância máxima", () => {
		// Arrange
		const distance = Distance.create(
			{
				latitude: -27.0747279,
				longitude: -49.4889672,
			},
			{
				latitude: -27.0747279,
				longitude: -49.4889672,
			},
		).force.success().value
		const maxDistanceSpecification = new MaxDistanceSpecification()
		// Act
		const result = maxDistanceSpecification.isSatisfiedBy(distance)
		// Assert
		expect(result).toBe(false)
	})

	test("Deve retornar falso se a distância for menor que a distância máxima", () => {
		const distance = Distance.create(
			{
				latitude: -28.0747279,
				longitude: -49.4889672,
			},
			{
				latitude: -27.0747279,
				longitude: -49.4889672,
			},
		).force.success().value
		const maxDistanceSpecification = new MaxDistanceSpecification()
		// Act
		const result = maxDistanceSpecification.isSatisfiedBy(distance)
		// Assert
		expect(result).toBe(true)
	})
})
