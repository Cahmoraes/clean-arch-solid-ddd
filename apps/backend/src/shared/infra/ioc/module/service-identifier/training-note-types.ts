export const TRAINING_NOTE_TYPES = {
	Repositories: {
		TrainingNote: Symbol.for("TrainingNoteRepository"),
	},
	UseCases: {
		CreateTrainingNote: Symbol.for("CreateTrainingNoteUseCase"),
		UpdateTrainingNote: Symbol.for("UpdateTrainingNoteUseCase"),
		DeleteTrainingNote: Symbol.for("DeleteTrainingNoteUseCase"),
		ListTrainingNotes: Symbol.for("ListTrainingNotesUseCase"),
	},
	Controllers: {
		CreateTrainingNote: Symbol.for("CreateTrainingNoteController"),
		UpdateTrainingNote: Symbol.for("UpdateTrainingNoteController"),
		DeleteTrainingNote: Symbol.for("DeleteTrainingNoteController"),
		ListTrainingNotes: Symbol.for("ListTrainingNotesController"),
	},
} as const
