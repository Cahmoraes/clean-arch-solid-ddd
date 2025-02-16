import {
  CircuitBreaker,
  type CircuitBreakerConstructor,
} from './circuit-breaker'

const onlyASuccessFunction = vi.fn().mockResolvedValue('success')

const fifthPercentageFailure = vi
  .fn()
  .mockResolvedValueOnce('success')
  .mockRejectedValueOnce('error')
  .mockResolvedValueOnce('success')
  .mockRejectedValueOnce('error')

const onlyFailure = vi
  .fn()
  .mockRejectedValueOnce('error')
  .mockRejectedValueOnce('error')
  .mockRejectedValueOnce('error')

describe.only('CircuitBreaker', () => {
  beforeAll(() => {
    vi.useFakeTimers()
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  test('Deve criar um CircuitBreaker', async () => {
    const circuitBreakerProps: CircuitBreakerConstructor = {
      callback: onlyASuccessFunction,
      failureThresholdPercentageLimit: 3,
      resetTimeout: 1000,
    }
    const circuitBreaker = CircuitBreaker.wrap(circuitBreakerProps)
    expect(circuitBreaker).toBeDefined()
    const result = await circuitBreaker.run()
    expect(result).toBe('success')
    expect(circuitBreaker['isClosed']).toBe(true)
    expect(circuitBreaker['_totalRequests']).toBe(1)
    expect(circuitBreaker['_totalSuccess']).toBe(1)
    expect(circuitBreaker['successThresholdPercentage']).toBe(100)
  })

  test('Deve causar 50% de falha', async () => {
    const circuitBreakerProps: CircuitBreakerConstructor = {
      callback: fifthPercentageFailure,
      failureThresholdPercentageLimit: 50,
      resetTimeout: 1000,
    }
    const circuitBreaker = CircuitBreaker.wrap(circuitBreakerProps)
    expect(circuitBreaker['_lastFailureTime']).toBe(null)
    await circuitBreaker.run()
    await circuitBreaker.run()
    expect(circuitBreaker['_lastFailureTime']).toBeDefined()
    await circuitBreaker.run()
    await circuitBreaker.run()
    expect(circuitBreaker['isClosed']).toBe(true)
    expect(circuitBreaker['_totalRequests']).toBe(4)
    expect(circuitBreaker['_totalFailures']).toBe(2)
    expect(circuitBreaker['failureThresholdPercentage']).toBe(50)
    expect(circuitBreaker['hasExceedFailureThreshold']).toBe(false)
  })

  test.only('Deve causar entrar em estado half-open', async () => {
    const circuitBreakerProps: CircuitBreakerConstructor = {
      callback: onlyFailure,
      failureThresholdPercentageLimit: 50,
      resetTimeout: 1000,
    }
    const circuitBreaker = CircuitBreaker.wrap(circuitBreakerProps)
    expect(circuitBreaker['_lastFailureTime']).toBe(null)
    await circuitBreaker.run()
    await circuitBreaker.run()
    expect(circuitBreaker['_lastFailureTime']).toBeDefined()
    await circuitBreaker.run()
    expect(circuitBreaker['isClosed']).toBe(false)
    expect(circuitBreaker['_totalRequests']).toBe(3)
    expect(circuitBreaker['_totalFailures']).toBe(3)
    expect(circuitBreaker['isOpen']).toBe(true)
  })
})
