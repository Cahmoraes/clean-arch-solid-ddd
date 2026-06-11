export class ContractError extends Error {
	constructor(message: string, cause?: ErrorOptions) {
		super(message, cause)
		this.name = "ContractError"
	}
}
