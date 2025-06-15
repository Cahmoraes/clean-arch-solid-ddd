import { Observable } from './observable'

describe('Observable Entity', () => {
  test('Deve criar um observer', () => {
    const observer = new Observable()
    expect(observer).toBeInstanceOf(Observable)
  })

  test('Deve notificar o observer', async () => {
    const observable = new Observable()
    const observer = vi.fn()
    observable.subscribe(observer)
    await observable.notify('data')
    expect(observer).toHaveBeenCalledWith('data')
  })
})
