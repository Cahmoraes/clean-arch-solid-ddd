import { randomUUID } from 'node:crypto'

import ExtendedSet from '@cahmoraes93/extended-set'
import { injectable } from 'inversify'

import type {
  CheckInRepository,
  SaveResponse,
} from '@/application/check-in/repository/check-in-repository'
import { CheckIn } from '@/domain/check-in/check-in'
import { env } from '@/infra/env'

@injectable()
export class InMemoryCheckInRepository implements CheckInRepository {
  public ITEMS_PER_PAGE = 20

  public checkIns = new ExtendedSet<CheckIn>()

  withTransaction(): CheckInRepository {
    return this
  }

  public async save(checkIn: CheckIn): Promise<SaveResponse> {
    const checkInId = checkIn.id ?? randomUUID()
    const userId = checkIn.userId ?? randomUUID()
    const gymId = checkIn.gymId ?? randomUUID()
    const checkInWithId = CheckIn.restore({
      id: checkInId,
      userId,
      gymId,
      createdAt: new Date(),
      validatedAt: checkIn.validatedAt,
      userLatitude: checkIn.latitude,
      userLongitude: checkIn.longitude,
      isValidated: false,
    })
    this.checkIns.add(checkInWithId)
    return {
      id: checkInId,
    }
  }

  public async checkOfById(id: string): Promise<CheckIn | null> {
    return this.checkIns.find((checkIn) => checkIn.id === id)
  }

  public async onSameDateOfUserId(
    userId: string,
    date: Date,
  ): Promise<boolean> {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)
    return this.checkIns.some((checkIn) => {
      const checkInDate = checkIn.createdAt
      const isSameUserId = checkIn.userId === userId
      const checkInOnRangeDate =
        checkInDate >= startOfDay && checkInDate <= endOfDay
      return isSameUserId && checkInOnRangeDate
    })
  }

  public async checkInsOfUserId(userId: string, page = 0): Promise<CheckIn[]> {
    return this.checkIns
      .filter((checkIn) => checkIn.userId === userId)
      .toArray()
      .slice((page - 1) * env.ITEMS_PER_PAGE, page * env.ITEMS_PER_PAGE)
  }

  public async countOfUserId(userId: string): Promise<number> {
    return this.checkIns.filter((checkIn) => checkIn.userId === userId).size
  }
}
