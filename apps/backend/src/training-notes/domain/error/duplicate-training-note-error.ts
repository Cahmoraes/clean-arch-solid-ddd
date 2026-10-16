import { DomainError } from "@/shared/domain/error/domain-error.js"

export class DuplicateTrainingNoteError extends DomainError {
	public readonly kind = "conflict" as const

	constructor() {
		super("Esse dia já tem nota")
		this.name = "DuplicateTrainingNoteError"
	}
}
