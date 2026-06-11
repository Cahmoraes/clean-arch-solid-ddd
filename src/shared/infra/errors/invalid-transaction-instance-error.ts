export class InvalidTransactionInstance extends Error {
	constructor(object: object) {
		const errorConstructor = Object.getPrototypeOf(object)
		super(`Invalid transaction instance provided: ${errorConstructor.name}`)
		this.name = "InvalidTransactionInstance"
	}
}
