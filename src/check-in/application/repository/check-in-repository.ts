import type { CheckIn } from '@/check-in/domain/check-in'

export interface SaveResponse {
  id: string
}

export interface CheckInRepository {
  save(checkIn: CheckIn): Promise<SaveResponse>
  checkOfById(id: string): Promise<CheckIn | null>
  onSameDateOfUserId(userId: string, date: Date): Promise<boolean>
  checkInsOfUserId(userId: string, page: number): Promise<CheckIn[]>
  countOfUserId(userId: string): Promise<number>
  withTransaction<TX extends object>(object: TX): CheckInRepository
}
