export class GymWithCNPJAlreadyExistsError extends Error {
	constructor(aString: string, errorOptions?: ErrorOptions) {
		super(`Academia com CNPJ ${aString} já existe`, errorOptions)
		this.name = "GymWithCNPJAlreadyExistsError"
	}
}
