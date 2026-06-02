import { DomainError } from "@/shared/domain/error/domain-error.js"

export class ExternalProviderNotLinkedError extends DomainError {
	public readonly kind = "conflict" as const

	constructor() {
		super("External provider not linked to this account")
		this.name = "ExternalProviderNotLinkedError"
	}
}
