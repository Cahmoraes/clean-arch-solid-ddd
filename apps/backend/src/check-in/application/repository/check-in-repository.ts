import type { CheckIn } from "@/check-in/domain/check-in"

export interface SaveResponse {
	id: string
}

export type CheckInStatus = "pending" | "validated" | "rejected"

export type SortOrder = "asc" | "desc"

export interface FindManyInput {
	page: number
	status?: CheckInStatus
	userId?: string
	gymName?: string
	sortOrder?: SortOrder
}

export interface FindManyOutput {
	items: CheckIn[]
	total: number
}

export interface CheckInStats {
	total: number
	pending: number
	validated: number
	rejected: number
}

export interface CheckInRepository {
	save(checkIn: CheckIn): Promise<SaveResponse>
	checkOfById(id: string): Promise<CheckIn | null>
	onSameDateOfUserId(userId: string, date: Date): Promise<boolean>
	findMany(input: FindManyInput): Promise<FindManyOutput>
	countByStatus(userId?: string): Promise<CheckInStats>
	withTransaction<TX extends object>(object: TX): CheckInRepository
}
