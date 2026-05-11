import type pino from "pino"
import { describe, expect, it, vi } from "vitest"
import { PinoAdapter } from "./pino-adapter.js"

function makeMockPinoLogger() {
	return {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	} as unknown as pino.Logger
}

describe("PinoAdapter", () => {
	describe("info", () => {
		it("should call pino.info with module name and string message", () => {
			const mockLogger = makeMockPinoLogger()
			const adapter = new PinoAdapter(mockLogger)
			class MyService {}
			const instance = new MyService()

			adapter.info(instance, "hello world")

			expect(mockLogger.info).toHaveBeenCalledWith(
				{ module: "MyService" },
				"hello world",
			)
		})

		it("should serialize object messages as JSON", () => {
			const mockLogger = makeMockPinoLogger()
			const adapter = new PinoAdapter(mockLogger)
			const instance = { constructor: { name: "SomeClass" } }

			adapter.info(instance, { key: "value", count: 1 })

			expect(mockLogger.info).toHaveBeenCalledWith(
				{ module: "SomeClass" },
				'{"key":"value","count":1}',
			)
		})

		it("should fallback to Unknown when constructor name is unavailable", () => {
			const mockLogger = makeMockPinoLogger()
			const adapter = new PinoAdapter(mockLogger)
			const instance = Object.create(null) as object

			adapter.info(instance, "message")

			expect(mockLogger.info).toHaveBeenCalledWith(
				{ module: "Unknown" },
				"message",
			)
		})
	})

	describe("warn", () => {
		it("should call pino.warn with module name and message", () => {
			const mockLogger = makeMockPinoLogger()
			const adapter = new PinoAdapter(mockLogger)
			class MyController {}
			const instance = new MyController()

			adapter.warn(instance, "something is off")

			expect(mockLogger.warn).toHaveBeenCalledWith(
				{ module: "MyController" },
				"something is off",
			)
		})
	})

	describe("error", () => {
		it("should call pino.error with module name and message", () => {
			const mockLogger = makeMockPinoLogger()
			const adapter = new PinoAdapter(mockLogger)
			class MyUseCase {}
			const instance = new MyUseCase()

			adapter.error(instance, "something broke")

			expect(mockLogger.error).toHaveBeenCalledWith(
				{ module: "MyUseCase" },
				"something broke",
			)
		})
	})
})
