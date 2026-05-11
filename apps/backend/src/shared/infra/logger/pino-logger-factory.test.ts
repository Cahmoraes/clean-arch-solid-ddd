import { describe, expect, it } from "vitest"
import { createPinoLogger } from "./pino-logger-factory.js"

describe("createPinoLogger", () => {
	it("should return a pino logger instance", () => {
		const logger = createPinoLogger()
		expect(logger).toBeDefined()
		expect(typeof logger.info).toBe("function")
		expect(typeof logger.warn).toBe("function")
		expect(typeof logger.error).toBe("function")
	})

	it("should create logger with level info", () => {
		const logger = createPinoLogger()
		expect(logger.level).toBe("info")
	})
})
