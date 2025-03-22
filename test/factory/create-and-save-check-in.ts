import { CheckIn, type CheckInCreateProps } from '@/domain/check-in/check-in'
import type { InMemoryCheckInRepository } from '@/infra/database/repository/in-memory/in-memory-check-in-repository'

export interface CreateAndSaveCheckInProps {
  checkInRepository: InMemoryCheckInRepository
  id?: string
  userId?: string
  gymId?: string
  userLatitude?: number
  userLongitude?: number
}

// eslint-disable-next-line complexity
export async function createAndSaveCheckIn(props: CreateAndSaveCheckInProps) {
  const input: CheckInCreateProps = {
    id: props.id ?? 'any_id',
    userId: props.userId ?? 'any_user_id',
    gymId: props.gymId ?? 'any_gym_id',
    userLatitude: props.userLatitude ?? 0,
    userLongitude: props.userLongitude ?? 10,
  }
  const checkIn = CheckIn.create(input)
  await props.checkInRepository.save(checkIn)
  return props.checkInRepository.checkIns.toArray()[0]
}
