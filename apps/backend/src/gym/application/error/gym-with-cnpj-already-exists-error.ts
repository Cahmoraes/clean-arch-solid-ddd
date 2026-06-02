import { DomainError } from "@/shared/domain/error/domain-error.js"

export class GymWithCNPJAlreadyExistsError extends DomainError {
	public readonly kind = "conflict" as const

	constructor(aString: string, errorOptions?: ErrorOptions) {
		super(`Academia com CNPJ ${aString} já existe`, errorOptions)
		this.name = "GymWithCNPJAlreadyExistsError"
	}
}
