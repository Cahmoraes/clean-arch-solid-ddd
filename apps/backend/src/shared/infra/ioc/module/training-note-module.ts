import { ContainerModule, type ResolutionContext } from "inversify"
import type { TrainingNotesRepository } from "@/training-notes/application/repository/training-note-repository.js"
import { CreateTrainingNoteUseCase } from "@/training-notes/application/use-case/create-training-note.usecase.js"
import { DeleteTrainingNoteUseCase } from "@/training-notes/application/use-case/delete-training-note.usecase.js"
import { ListTrainingNotesUseCase } from "@/training-notes/application/use-case/list-training-notes.usecase.js"
import { UpdateTrainingNoteUseCase } from "@/training-notes/application/use-case/update-training-note.usecase.js"
import { CreateTrainingNoteController } from "@/training-notes/infra/controller/create-training-note.controller.js"
import { DeleteTrainingNoteController } from "@/training-notes/infra/controller/delete-training-note.controller.js"
import { ListTrainingNotesController } from "@/training-notes/infra/controller/list-training-notes.controller.js"
import { UpdateTrainingNoteController } from "@/training-notes/infra/controller/update-training-note.controller.js"
import { TrainingNoteRepositoryProvider } from "../provider/training-note-repository-provider.js"
import { TRAINING_NOTE_TYPES } from "./service-identifier/training-note-types.js"

function resolveRepository(
	context: ResolutionContext,
): TrainingNotesRepository {
	return context.get<TrainingNotesRepository>(
		TRAINING_NOTE_TYPES.Repositories.TrainingNote,
	)
}

export const trainingNoteModule = new ContainerModule(({ bind }) => {
	bind(TRAINING_NOTE_TYPES.Repositories.TrainingNote)
		.toDynamicValue(TrainingNoteRepositoryProvider.provide)
		.inSingletonScope()
	// yagni: use cases sem @inject (application não importa infra);
	// construção manual no módulo até existir decorador dedicado.
	bind(TRAINING_NOTE_TYPES.UseCases.CreateTrainingNote).toDynamicValue(
		(context) => new CreateTrainingNoteUseCase(resolveRepository(context)),
	)
	bind(TRAINING_NOTE_TYPES.UseCases.UpdateTrainingNote).toDynamicValue(
		(context) => new UpdateTrainingNoteUseCase(resolveRepository(context)),
	)
	bind(TRAINING_NOTE_TYPES.UseCases.DeleteTrainingNote).toDynamicValue(
		(context) => new DeleteTrainingNoteUseCase(resolveRepository(context)),
	)
	bind(TRAINING_NOTE_TYPES.UseCases.ListTrainingNotes).toDynamicValue(
		(context) => new ListTrainingNotesUseCase(resolveRepository(context)),
	)
	bind(TRAINING_NOTE_TYPES.Controllers.CreateTrainingNote).to(
		CreateTrainingNoteController,
	)
	bind(TRAINING_NOTE_TYPES.Controllers.UpdateTrainingNote).to(
		UpdateTrainingNoteController,
	)
	bind(TRAINING_NOTE_TYPES.Controllers.DeleteTrainingNote).to(
		DeleteTrainingNoteController,
	)
	bind(TRAINING_NOTE_TYPES.Controllers.ListTrainingNotes).to(
		ListTrainingNotesController,
	)
})
