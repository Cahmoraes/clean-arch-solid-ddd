import { Retry } from './retry'

async function onlyAsyncFunction() {
  return Promise.resolve('Only async function')
}

async function onlyAsyncFunctionWithParameter(params: number) {
  return Promise.resolve(
    `Only async function with parameter: ${JSON.stringify(params)}`,
  )
}

async function onlyRejectFunction() {
  return Promise.reject('Only reject function')
}

describe.only('Retry', () => {
  beforeAll(() => {
    vi.useFakeTimers()
  })

  afterAll(() => {
    vi.useRealTimers()
  })

  describe('Sucesso', () => {
    test('Deve criar um Retry', async () => {
      const retry = Retry.wrap({
        callback: onlyAsyncFunction,
        maxAttempts: 3,
        time: 1000,
      })
      const result = await retry.run()
      expect(result).toBe('Only async function')
    })

    test('Deve criar um Retry com chamada parametrizada', async () => {
      const retry = Retry.wrap({
        callback: onlyAsyncFunctionWithParameter,
        maxAttempts: 3,
        time: 1000,
      })
      const result = await retry.run(1)
      expect(result).toBe('Only async function with parameter: 1')
    })

    test('Deve ser possível chamar mais de uma vez a função callback', async () => {
      const retry = Retry.wrap({
        callback: onlyAsyncFunctionWithParameter,
        maxAttempts: 3,
        time: 1000,
      })
      const result1 = await retry.run(1)
      expect(result1).toBe('Only async function with parameter: 1')
      const result2 = await retry.run(2)
      expect(result2).toBe('Only async function with parameter: 2')
    })
  })

  describe('Falha', () => {
    test('Deve criar um Retry com chamada rejeitada', async () => {
      const retry = Retry.wrap({
        callback: onlyRejectFunction,
        maxAttempts: 0,
        time: 1000,
      })
      await expect(() => retry.run()).rejects.toThrow(
        'Only reject function',
      )
    })

    test('Deve realizar o máximo de tentativas permitido com tempo agendado', async () => {
      const retry = Retry.wrap({
        callback: onlyRejectFunction,
        maxAttempts: 2,
        time: 1000,
      })

      const promise = retry.run()
      const expectation = expect(promise).rejects.toThrow(
        'Only reject function',
      )

      await vi.runAllTimersAsync()

      await expectation

      expect(retry['_attempts']).toBe(2)
    }, 7000)
  })

  describe('Falha/sucesso', () => {
    test('Deve falhar 1 vez e depois ter sucesso', async () => {
      const failTwoTimesAndThenSuccess = vi
        .fn()
        .mockRejectedValueOnce('Fail')
        .mockResolvedValueOnce('Success')

      const retry = Retry.wrap({
        callback: failTwoTimesAndThenSuccess,
        maxAttempts: 2,
        time: 1000,
      })

      const promise = retry.run()
      await vi.runAllTimersAsync()
      await expect(promise).resolves.toEqual('Success')
      expect(retry['_attempts']).toBe(1)
    })

    test('Deve falhar 2 vezes e depois ter sucesso', async () => {
      const failTwoTimesAndThenSuccess = vi
        .fn()
        .mockRejectedValueOnce('Fail')
        .mockRejectedValueOnce('Fail')
        .mockResolvedValueOnce('Success')

      const retry = Retry.wrap({
        callback: failTwoTimesAndThenSuccess,
        maxAttempts: 3,
        time: 1000,
      })

      const promise = retry.run()
      await vi.runAllTimersAsync()
      await expect(promise).resolves.toEqual('Success')
      expect(retry['_attempts']).toBe(2)
    })
  })
})
