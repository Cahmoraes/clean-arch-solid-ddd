import { ResponseFactory } from "./response-factory"

describe("ResponseFactory.OK", () => {
	test("preserva body null em vez de embrulhar o input", () => {
		expect(ResponseFactory.OK({ body: null })).toEqual({
			status: 200,
			body: null,
		})
	})

	test("continua devolvendo o objeto do body quando ele existe", () => {
		expect(ResponseFactory.OK({ body: { id: "x" } })).toEqual({
			status: 200,
			body: { id: "x" },
		})
	})
})
