import { TRAINING_NOTE_TYPES } from "@/shared/infra/ioc/types"

import { type ModuleControllers, resolve } from "./server-build"

/**
 * Setup Training Notes Module
 * Resolves and returns all training-notes-related controllers
 */
export function setupTrainingNotesModule(): ModuleControllers {
	const controllers = [
		resolve(TRAINING_NOTE_TYPES.Controllers.CreateTrainingNote),
		resolve(TRAINING_NOTE_TYPES.Controllers.UpdateTrainingNote),
		resolve(TRAINING_NOTE_TYPES.Controllers.DeleteTrainingNote),
		resolve(TRAINING_NOTE_TYPES.Controllers.ListTrainingNotes),
	]
	return { controllers }
}
