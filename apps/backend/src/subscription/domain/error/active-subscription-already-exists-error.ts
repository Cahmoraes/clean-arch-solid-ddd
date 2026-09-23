import { DomainError } from "@/shared/domain/error/domain-error.js"

export class ActiveSubscriptionAlreadyExistsError extends DomainError {
	public readonly kind = "conflict" as const

	constructor(errorOptions?: ErrorOptions) {
		super("Você já possui uma assinatura ativa", errorOptions)
		this.name = "ActiveSubscriptionAlreadyExistsError"
	}
}
