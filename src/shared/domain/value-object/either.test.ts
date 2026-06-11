import { Failure, failure, Success, success } from "./either"

describe("Either", () => {
	describe("Failure", () => {
		test("Deve criar uma instância de Failure", () => {
			const either = failure("failure")
			expect(either).toBeInstanceOf(Failure)
			expect(either.value).toBe("failure")
			expect(either.isFailure()).toBe(true)
			expect(either.isSuccess()).toBe(false)
		})
	})

	describe("Success", () => {
		test("Deve criar uma instância de Success", () => {
			const either = success("success")
			expect(either).toBeInstanceOf(Success)
			expect(either.value).toBe("success")
			expect(either.isFailure()).toBe(false)
			expect(either.isSuccess()).toBe(true)
		})

		describe("Either", () => {
			describe("Failure", () => {
				test("Deve criar uma instância de Failure", () => {
					const either = failure("failure")
					expect(either).toBeInstanceOf(Failure)
					expect(either.value).toBe("failure")
					expect(either.isFailure()).toBe(true)
					expect(either.isSuccess()).toBe(false)
				})

				test("Deve lançar erro ao chamar success em Failure", () => {
					const either = failure("failure")
					expect(() => either.force.success().value).toThrow(
						"Cannot call success on failure",
					)
				})

				test("Deve retornar valor ao chamar failure em Failure", () => {
					const either = failure("failure")
					expect(either.force.failure().value).toBe("failure")
				})

				test("Deve retornar valor ao chamar forceFailure em Failure", () => {
					const either = failure("failure")
					expect(either.forceFailure().value).toBe("failure")
				})

				test("Deve lançar erro ao chamar forceSuccess em Failure", () => {
					const either = failure("failure")
					expect(() => either.forceSuccess().value).toThrow(
						"Cannot call success on failure",
					)
				})
			})

			describe("Success", () => {
				test("Deve criar uma instância de Success", () => {
					const either = success("success")
					expect(either).toBeInstanceOf(Success)
					expect(either.value).toBe("success")
					expect(either.isFailure()).toBe(false)
					expect(either.isSuccess()).toBe(true)
				})

				test("Deve lançar erro ao chamar failure em Success", () => {
					const either = success("success")
					expect(() => either.force.failure().value).toThrow(
						"Cannot call failure on success",
					)
				})

				test("Deve retornar valor ao chamar success em Success", () => {
					const either = success("success")
					expect(either.force.success().value).toBe("success")
				})

				test("Deve lançar erro ao chamar forceFailure em Success", () => {
					const either = success("success")
					expect(() => either.forceFailure().value).toThrow(
						"Cannot call failure on success",
					)
				})

				test("Deve retornar valor ao chamar forceSuccess em Success", () => {
					const either = success("success")
					expect(either.forceSuccess().value).toBe("success")
				})
			})
		})
	})
})
