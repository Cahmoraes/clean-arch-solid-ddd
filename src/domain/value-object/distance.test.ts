import { Coordinate } from './coordinate'
import { Distance } from './distance'

describe('Distance', () => {
  test('Deve criar uma distância', () => {
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
    const distancia = Distance.create(fromCoord, toCoord).force.success().value
    // Then
    // Distância aproximada entre São Paulo e Rio de Janeiro
    expect(distancia.value).toBeGreaterThan(350)
    expect(distancia.value).toBeLessThan(400)
    expect(distancia.from.latitude).toBe(-23.5505)
    expect(distancia.from.longitude).toBe(-46.6333)
    expect(distancia.to.latitude).toBe(-22.9068)
    expect(distancia.to.longitude).toBe(-43.1729)
  })
})
