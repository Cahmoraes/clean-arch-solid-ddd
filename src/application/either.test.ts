import { Left, left, Right, right } from './either'

describe('Either', () => {
  describe('Left', () => {
    test('Deve criar uma instância de Left', () => {
      const either = left('left')
      expect(either).toBeInstanceOf(Left)
      expect(either.value).toBe('left')
      expect(either.isLeft()).toBe(true)
      expect(either.isRight()).toBe(false)
    })
  })

  describe('Right', () => {
    test('Deve criar uma instância de Right', () => {
      const either = right('right')
      expect(either).toBeInstanceOf(Right)
      expect(either.value).toBe('right')
      expect(either.isLeft()).toBe(false)
      expect(either.isRight()).toBe(true)
    })
  })
})
