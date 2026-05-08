import type { CheckIn } from "@/check-in/domain/check-in"

export interface SaveResponse {
	id: string
}

export type CheckInStatus = "pending" | "validated" | "rejected"

export interface FindManyInput {
	page: number
	status?: CheckInStatus
	userId?: string
}

export interface FindManyOutput {
	items: CheckIn[]
	total: number
}

export interface CheckInRepository {
	save(checkIn: CheckIn): Promise<SaveResponse>
	checkOfById(id: string): Promise<CheckIn | null>
	onSameDateOfUserId(userId: string, date: Date): Promise<boolean>
	findMany(input: FindManyInput): Promise<FindManyOutput>
	withTransaction<TX extends object>(object: TX): CheckInRepository
}
