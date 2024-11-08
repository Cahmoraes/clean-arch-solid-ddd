import { randomUUID } from 'node:crypto'

import ExtendedSet from '@cahmoraes93/extended-set'
import { injectable } from 'inversify'

import type {
  CheckInRepository,
  SaveResponse,
} from '@/application/repository/check-in-repository'
import { CheckIn } from '@/domain/check-in'

@injectable()
export class InMemoryCheckInRepository implements CheckInRepository {
  public ITEMS_PER_PAGE = 20

  public checkIns = new ExtendedSet<CheckIn>()

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
    })
    this.checkIns.add(checkInWithId)
    return {
      id: checkInId,
    }
  }

  public async findById(id: string): Promise<CheckIn | null> {
    return this.checkIns.find((checkIn) => checkIn.id === id)
  }

  public async onSameDate(date: Date): Promise<boolean> {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)
    return this.checkIns.some((checkIn) => {
      const checkInDate = checkIn.createdAt
      return checkInDate >= startOfDay && checkInDate <= endOfDay
    })
  }

  public async findManyByUserId(userId: string, page = 0): Promise<CheckIn[]> {
    return this.checkIns
      .filter((checkIn) => checkIn.userId === userId)
      .toArray()
      .slice((page - 1) * this.ITEMS_PER_PAGE, page * this.ITEMS_PER_PAGE)
  }

  public async countByUserId(userId: string): Promise<number> {
    return this.checkIns.filter((checkIn) => checkIn.userId === userId).size
  }
}
