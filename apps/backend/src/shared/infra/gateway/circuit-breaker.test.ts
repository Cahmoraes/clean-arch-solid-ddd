import {
	CircuitBreaker,
	type CircuitBreakerConstructor,
	OpenCircleError,
} from "./circuit-breaker"

const onlyASuccessFunction = vi.fn().mockResolvedValue("success")

const failureAtLimit = vi
	.fn()
	.mockResolvedValueOnce("success-1")
	.mockRejectedValueOnce(new Error("error-1"))
	.mockResolvedValueOnce("success-2")
	.mockRejectedValueOnce(new Error("error-2"))
	.mockResolvedValueOnce("success-3")

const onlyFailure = vi
	.fn()
	.mockRejectedValueOnce(new Error("error"))
	.mockRejectedValueOnce(new Error("error"))
	.mockRejectedValueOnce(new Error("error"))

describe("CircuitBreaker", () => {
	beforeAll(() => {
		vi.useFakeTimers()
	})

	afterAll(() => {
		vi.useRealTimers()
	})

	test("Deve criar um CircuitBreaker", async () => {
		const circuitBreakerProps: CircuitBreakerConstructor = {
			callback: onlyASuccessFunction,
			failureThresholdPercentageLimit: 3,
			resetTimeout: 1000,
		}
		const circuitBreaker = CircuitBreaker.wrap(circuitBreakerProps)
		expect(circuitBreaker).toBeDefined()
		const result = await circuitBreaker.run()
		expect(result).toBe("success")
		expect(onlyASuccessFunction).toHaveBeenCalledTimes(1)
	})

	test("Deve permanecer fechado quando a taxa de falha estiver no limite configurado", async () => {
		const circuitBreakerProps: CircuitBreakerConstructor = {
			callback: failureAtLimit,
			failureThresholdPercentageLimit: 50,
			resetTimeout: 1000,
		}
		const circuitBreaker = CircuitBreaker.wrap(circuitBreakerProps)
		await expect(circuitBreaker.run()).resolves.toBe("success-1")
		await expect(circuitBreaker.run()).rejects.toThrow("error-1")
		await expect(circuitBreaker.run()).resolves.toBe("success-2")
		await expect(circuitBreaker.run()).rejects.toThrow("error-2")
		await expect(circuitBreaker.run()).resolves.toBe("success-3")
		expect(failureAtLimit).toHaveBeenCalledTimes(5)
	})

	test("Deve permitir nova tentativa após o timeout de reset", async () => {
		const circuitBreakerProps: CircuitBreakerConstructor = {
			callback: onlyFailure,
			failureThresholdPercentageLimit: 50,
			resetTimeout: 1000,
		}
		const circuitBreaker = CircuitBreaker.wrap(circuitBreakerProps)
		await expect(circuitBreaker.run()).rejects.toThrow("error")
		await expect(circuitBreaker.run()).rejects.toThrow(OpenCircleError)
		expect(onlyFailure).toHaveBeenCalledTimes(1)
		vi.advanceTimersByTime(1000)
		await expect(circuitBreaker.run()).rejects.toThrow("error")
		expect(onlyFailure).toHaveBeenCalledTimes(2)
	})
})
