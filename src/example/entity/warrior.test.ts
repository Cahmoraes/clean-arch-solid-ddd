import { containerExample, type NinjaFactory } from '../container-example'
import { Ninja } from './ninja'

describe('Warrior', () => {
  beforeEach(() => {
    containerExample.snapshot()
  })

  afterEach(() => {
    containerExample.restore()
  })

  test('should create a ninja', () => {
    // const ninja = containerExample.get(TYPES_EXAMPLE.WARRIOR)
    // console.log(ninja('ninja', 'Naruto'))
    const ninjaFactory = containerExample.get<NinjaFactory>('Factory<Ninja>')
    const naruto = ninjaFactory('Naruto')
    expect(naruto.name).toBe('Naruto')
    expect(naruto.fight).toBeInstanceOf(Function)
    expect(naruto).toBeInstanceOf(Ninja)
  })
})
