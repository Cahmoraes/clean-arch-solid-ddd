import {
  CircuitBreaker,
  type CircuitBreakerConstructor,
} from './circuit-breaker'

const onlyASuccessFunction = vi.fn().mockResolvedValue('success')

describe.skip('CircuitBreaker', () => {
  test('Deve criar um CircuitBreaker', async () => {
    const circuitBreakerProps: CircuitBreakerConstructor = {
      callback: onlyASuccessFunction,
      failureThreshold: 3,
      resetTime: 1000,
    }
    const circuitBreaker = CircuitBreaker.wrap(circuitBreakerProps)
    expect(circuitBreaker).toBeDefined()
    const result = await circuitBreaker.run()
    expect(result).toBe('success')
  })
})
