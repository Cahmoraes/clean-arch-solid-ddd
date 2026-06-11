import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	getLogLevel,
	logger,
	reportWebVitals,
	setWebVitalSink,
} from "./observability"

describe("observability", () => {
	const originalLevel = process.env.NEXT_PUBLIC_LOG_LEVEL

	beforeEach(() => {
		vi.spyOn(console, "debug").mockImplementation(() => {})
		vi.spyOn(console, "info").mockImplementation(() => {})
		vi.spyOn(console, "warn").mockImplementation(() => {})
		vi.spyOn(console, "error").mockImplementation(() => {})
	})

	afterEach(() => {
		vi.restoreAllMocks()
		process.env.NEXT_PUBLIC_LOG_LEVEL = originalLevel
	})

	it("defaults log level to info when env var is absent", () => {
		process.env.NEXT_PUBLIC_LOG_LEVEL = undefined
		expect(getLogLevel()).toBe("info")

		logger.debug("hidden")
		expect(console.debug).not.toHaveBeenCalled()

		logger.info("visible")
		expect(console.info).toHaveBeenCalled()
	})

	it("emits debug when LOG_LEVEL=debug", () => {
		process.env.NEXT_PUBLIC_LOG_LEVEL = "debug"
		expect(getLogLevel()).toBe("debug")

		logger.debug("hello", { foo: 1 })
		expect(console.debug).toHaveBeenCalledWith("[app]", "hello", { foo: 1 })
	})

	it("silences everything when LOG_LEVEL=silent", () => {
		process.env.NEXT_PUBLIC_LOG_LEVEL = "silent"
		logger.error("boom")
		expect(console.error).not.toHaveBeenCalled()
	})

	it("falls back to info on unknown level", () => {
		process.env.NEXT_PUBLIC_LOG_LEVEL = "verbose"
		expect(getLogLevel()).toBe("info")
	})

	it("reportWebVitals forwards to active sink", () => {
		const sink = vi.fn()
		setWebVitalSink(sink)
		const metric = { id: "1", name: "LCP", value: 1234 }
		reportWebVitals(metric)
		expect(sink).toHaveBeenCalledWith(metric)
	})

	it("reportWebVitals catches sink errors instead of crashing", () => {
		setWebVitalSink(() => {
			throw new Error("sink down")
		})
		expect(() =>
			reportWebVitals({ id: "1", name: "FID", value: 10 }),
		).not.toThrow()
		expect(console.error).toHaveBeenCalled()
	})
})
