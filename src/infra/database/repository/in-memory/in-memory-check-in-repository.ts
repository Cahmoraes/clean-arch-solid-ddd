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
    })
    this.checkIns.add(checkInWithId)
    return {
      id: checkInId,
    }
  }

  public async findById(id: string): Promise<CheckIn | null> {
    return this.checkIns.find((checkIn) => checkIn.id === id)
  }
}
