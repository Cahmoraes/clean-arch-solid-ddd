import { CalculateDistance, Coordinate } from './calculate-distance'

describe('Classe CalculateDistance', () => {
  test('Deve retornar 0 quando as coordenadas de origem e destino são iguais', () => {
    const coord: Coordinate = { latitude: -23.5505, longitude: -46.6333 }
    const distancia = CalculateDistance.distanceBetweenCoordinates(coord, coord)
    expect(distancia).toBe(0)
  })

  test('Deve calcular a distância entre duas coordenadas corretamente', () => {
    const from: Coordinate = { latitude: -23.5505, longitude: -46.6333 } // São Paulo, Brasil
    const to: Coordinate = { latitude: -22.9068, longitude: -43.1729 } // Rio de Janeiro, Brasil
    const distancia = CalculateDistance.distanceBetweenCoordinates(from, to)

    // Distância aproximada entre São Paulo e Rio de Janeiro
    expect(distancia).toBeGreaterThan(350)
    expect(distancia).toBeLessThan(400)
  })

  test('Deve calcular a distância entre pontos no hemisfério norte', () => {
    const from: Coordinate = { latitude: 40.7128, longitude: -74.006 } // Nova York, EUA
    const to: Coordinate = { latitude: 34.0522, longitude: -118.2437 } // Los Angeles, EUA
    const distancia = CalculateDistance.distanceBetweenCoordinates(from, to)

    // Distância aproximada entre Nova York e Los Angeles
    expect(distancia).toBeGreaterThan(3900)
    expect(distancia).toBeLessThan(4000)
  })

  test('Deve calcular a distância entre pontos no hemisfério sul', () => {
    const from: Coordinate = { latitude: -33.8688, longitude: 151.2093 } // Sydney, Austrália
    const to: Coordinate = { latitude: -37.8136, longitude: 144.9631 } // Melbourne, Austrália
    const distancia = CalculateDistance.distanceBetweenCoordinates(from, to)

    // Distância aproximada entre Sydney e Melbourne
    expect(distancia).toBeGreaterThan(700)
    expect(distancia).toBeLessThan(900)
  })
})
