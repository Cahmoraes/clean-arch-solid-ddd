import { DomainError } from "@/shared/domain/error/domain-error.js"

export class NoActiveSubscriptionError extends DomainError {
	public readonly kind = "not-found" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Você não possui assinatura ativa", errorOptions)
		this.name = "NoActiveSubscriptionError"
	}
}
