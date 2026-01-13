import { TestingExample } from "./testing-example"

describe("Example", () => {
	it("fetchTodos", async () => {
		const example = new TestingExample()
		const result = example.fetchTodos()
		expect(result).toBeDefined()
		expect(result.length).toBe(2)
		expect(result[0].title).toBe("testing")
		expect(result[1].title).toBe("extra")
	})
})
