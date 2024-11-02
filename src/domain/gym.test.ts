import { Gym, type GymCreateProps } from './gym'

describe('Gym Entity', () => {
  test('Deve criar uma academia', () => {
    const input: GymCreateProps = {
      title: 'fake gym',
      description: 'fake description',
      latitude: -23.55052,
      longitude: -46.633308,
      phone: '11971457899',
    }
    const gym = Gym.create(input)
    expect(gym.title).toBe(input.title)
    expect(gym.description).toBe(input.description)
    expect(gym.latitude).toBe(input.latitude)
    expect(gym.longitude).toBe(input.longitude)
    expect(gym.phone).toBe(input.phone)
  })

  test('Deve restaurar uma academia', () => {
    const input: GymCreateProps = {
      title: 'fake gym',
      description: 'fake description',
      latitude: -23.55052,
      longitude: -46.633308,
      phone: '11971457899',
    }
    const gym = Gym.restore(input)
    expect(gym.title).toBe(input.title)
    expect(gym.description).toBe(input.description)
    expect(gym.latitude).toBe(input.latitude)
    expect(gym.longitude).toBe(input.longitude)
    expect(gym.phone).toBe(input.phone)
  })
})
