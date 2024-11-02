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

    describe('Either', () => {
      describe('Left', () => {
        test('Deve criar uma instância de Left', () => {
          const either = left('left')
          expect(either).toBeInstanceOf(Left)
          expect(either.value).toBe('left')
          expect(either.isLeft()).toBe(true)
          expect(either.isRight()).toBe(false)
        })

        test('Deve lançar erro ao chamar right em Left', () => {
          const either = left('left')
          expect(() => either.force.right().value).toThrow(
            'Cannot call right on left',
          )
        })

        test('Deve retornar valor ao chamar left em Left', () => {
          const either = left('left')
          expect(either.force.left().value).toBe('left')
        })

        test('Deve retornar valor ao chamar forceLeft em Left', () => {
          const either = left('left')
          expect(either.forceLeft().value).toBe('left')
        })

        test('Deve lançar erro ao chamar forceRight em Left', () => {
          const either = left('left')
          expect(() => either.forceRight().value).toThrow(
            'Cannot call right on left',
          )
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

        test('Deve lançar erro ao chamar left em Right', () => {
          const either = right('right')
          expect(() => either.force.left().value).toThrow(
            'Cannot call left on right',
          )
        })

        test('Deve retornar valor ao chamar right em Right', () => {
          const either = right('right')
          expect(either.force.right().value).toBe('right')
        })

        test('Deve lançar erro ao chamar forceLeft em Right', () => {
          const either = right('right')
          expect(() => either.forceLeft().value).toThrow(
            'Cannot call left on on right',
          )
        })

        test('Deve retornar valor ao chamar forceRight em Right', () => {
          const either = right('right')
          expect(either.forceRight().value).toBe('right')
        })
      })
    })
  })
})
