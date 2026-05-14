export class ExternalProviderLinkRequiredError extends Error {
	constructor() {
		super("Link this external account from an authenticated session first")
		this.name = "ExternalProviderLinkRequiredError"
	}
}
