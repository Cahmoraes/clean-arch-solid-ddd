import { DomainError } from "@/shared/domain/error/domain-error.js"

export class InvalidTrainingNoteTextError extends DomainError {
	public readonly kind = "validation" as const

	constructor() {
		super("Texto da nota deve ter entre 1 e 500 caracteres")
		this.name = "InvalidTrainingNoteTextError"
	}
}
