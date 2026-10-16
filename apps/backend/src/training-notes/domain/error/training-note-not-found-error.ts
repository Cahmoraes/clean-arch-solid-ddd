import { DomainError } from "@/shared/domain/error/domain-error.js"

export class TrainingNoteNotFoundError extends DomainError {
	public readonly kind = "not-found" as const

	constructor() {
		super("Nota não encontrada")
		this.name = "TrainingNoteNotFoundError"
	}
}
