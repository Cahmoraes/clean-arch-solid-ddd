import { DomainError } from "@/shared/domain/error/domain-error.js"

export class InvalidTrainingNoteDateError extends DomainError {
	public readonly kind = "validation" as const

	constructor() {
		super(
			"Data da nota deve ser um dia válido no formato YYYY-MM-DD entre 1900 e 2199",
		)
		this.name = "InvalidTrainingNoteDateError"
	}
}
