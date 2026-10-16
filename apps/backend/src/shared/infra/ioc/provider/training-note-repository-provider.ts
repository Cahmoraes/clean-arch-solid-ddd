import type { ResolutionContext } from "inversify"
import { InMemoryTrainingNoteRepository } from "@/shared/infra/database/repository/in-memory/in-memory-training-note-repository.js"
import { PrismaTrainingNoteRepository } from "@/shared/infra/database/repository/prisma/prisma-training-note-repository.js"
import { isProduction } from "@/shared/infra/env/index.js"
import type { TrainingNotesRepository } from "@/training-notes/application/repository/training-note-repository.js"

export class TrainingNoteRepositoryProvider {
	public static provide(context: ResolutionContext): TrainingNotesRepository {
		return isProduction()
			? context.get(PrismaTrainingNoteRepository, { autobind: true })
			: context.get(InMemoryTrainingNoteRepository, { autobind: true })
	}
}
