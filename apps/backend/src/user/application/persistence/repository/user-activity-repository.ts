export interface RecordUserActivityInput {
	userId: string
	type: string
	description: string
	metadata?: Record<string, unknown>
	occurredAt: Date
}

export interface UserActivityRepository {
	record(input: RecordUserActivityInput): Promise<void>
}
