export class ExternalProviderNotLinkedError extends Error {
	constructor() {
		super("External provider not linked to this account")
		this.name = "ExternalProviderNotLinkedError"
	}
}
