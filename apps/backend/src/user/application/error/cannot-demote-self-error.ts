export class CannotDemoteSelfError extends Error {
	constructor(errorOptions?: ErrorOptions) {
		super("Admin cannot remove their own admin privileges", errorOptions)
		this.name = "CannotDemoteSelfError"
	}
}
