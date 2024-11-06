import { Coordinate } from './coordinate'

describe('Coord', () => {
  test('Deve criar uma coordenada', () => {
    const input = { latitude: -23.5505, longitude: -46.6333 }
    const coord = Coordinate.create(input)
    expect(coord).toBeDefined()
    expect(coord.latitude).toBe(input.latitude)
    expect(coord.longitude).toBe(input.longitude)
  })

  test('Deve restaurar uma coordenada', () => {
    const input = { latitude: -23.5505, longitude: -46.6333 }
    const coord = Coordinate.restore(input)
    expect(coord).toBeDefined()
    expect(coord.latitude).toBe(input.latitude)
    expect(coord.longitude).toBe(input.longitude)
  })
})
