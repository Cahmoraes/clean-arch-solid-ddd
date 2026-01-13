import { InvalidEmailError } from "../error/invalid-email-error"
import { Email } from "./email"

describe("Email", () => {
	test("Deve criar um email válido", () => {
		const emailOrError = Email.create("valid.email@example.com")
		expect(emailOrError.isSuccess()).toBeTruthy()
		expect(emailOrError.forceSuccess().value.value).toBe(
			"valid.email@example.com",
		)
	})

	test("Deve falhar ao criar um email inválido", () => {
		const emailOrError = Email.create("invalid-email")
		expect(emailOrError.isFailure()).toBeTruthy()
		expect(emailOrError.forceFailure().value).toBeInstanceOf(InvalidEmailError)
	})

	test("Deve restaurar um email", () => {
		const email = Email.restore("restored.email@example.com")
		expect(email.value).toBe("restored.email@example.com")
	})
})
