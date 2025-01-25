import type { CheckIn } from '@/domain/check-in'

export interface SaveResponse {
  id: string
}

export interface CheckInRepository {
  save(checkIn: CheckIn): Promise<SaveResponse>
  checkOfById(id: string): Promise<CheckIn | null>
  onSameDate(date: Date): Promise<boolean>
  checkInsOfUserId(userId: string, page: number): Promise<CheckIn[]>
  countOfUserId(userId: string): Promise<number>
}
