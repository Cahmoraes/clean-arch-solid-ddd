export const TrainingNoteRoutes = {
	CREATE: "/training-notes",
	LIST: "/training-notes",
	BY_DATE: "/training-notes/:date",
} as const

export type TrainingNoteRoutesType =
	(typeof TrainingNoteRoutes)[keyof typeof TrainingNoteRoutes]
