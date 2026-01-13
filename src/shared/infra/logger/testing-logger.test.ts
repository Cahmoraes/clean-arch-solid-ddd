import { TestingLogger } from "./testing-logger"

describe("TestingLogger", () => {
	let logger: TestingLogger

	beforeEach(() => {
		logger = new TestingLogger()
	})

	test("Deve exibir um log de erro", () => {
		logger.error(Math, "TestingLogger")
		expect(logger.detecteErrorMethod).toBe(true)
		expect(logger.params.message).toBe("TestingLogger")
		expect(logger.params.instance).toBe(Math)
	})

	test("Deve exibir um log de aviso", () => {
		logger.warn(Math, "TestingLogger")
		expect(logger.detecteWarnMethod).toBe(true)
		expect(logger.params.message).toBe("TestingLogger")
		expect(logger.params.instance).toBe(Math)
	})

	test("Deve exibir um log de informação", () => {
		logger.info(Math, "TestingLogger")
		expect(logger.detecteInfoMethod).toBe(true)
		expect(logger.params.message).toBe("TestingLogger")
		expect(logger.params.instance).toBe(Math)
	})
})
