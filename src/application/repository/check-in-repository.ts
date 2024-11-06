import type { CheckIn } from '@/domain/check-in'

export interface SaveResponse {
  id: string
}

export interface CheckInRepository {
  save(checkIn: CheckIn): Promise<SaveResponse>
  findById(id: string): Promise<CheckIn | null>
  onSameDate(date: Date): Promise<boolean>
  findByUserId(userId: string): Promise<CheckIn[]>
}
