import { DomainError } from "@/shared/domain/error/domain-error.js"

export class SubscriptionCancellationScheduledError extends DomainError {
	public readonly kind = "conflict" as const

	constructor(errorOptions?: ErrorOptions) {
		super(
			"O cancelamento desta assinatura já está agendado e não permite trocar de plano",
			errorOptions,
		)
		this.name = "SubscriptionCancellationScheduledError"
	}
}
