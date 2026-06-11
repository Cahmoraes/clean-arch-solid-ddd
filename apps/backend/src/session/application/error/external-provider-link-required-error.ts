import { DomainError } from "@/shared/domain/error/domain-error.js"

export class ExternalProviderLinkRequiredError extends DomainError {
	public readonly kind = "conflict" as const

	constructor() {
		super("Link this external account from an authenticated session first")
		this.name = "ExternalProviderLinkRequiredError"
	}
}
