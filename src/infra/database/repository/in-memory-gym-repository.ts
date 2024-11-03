import { randomUUID } from 'node:crypto'

import ExtendedSet from '@cahmoraes93/extended-set'
import { injectable } from 'inversify'

import type {
  GymRepository,
  SaveGymResult,
} from '@/application/repository/gym-repository'
import { Gym } from '@/domain/gym'

@injectable()
export class InMemoryGymRepository implements GymRepository {
  public gyms = new ExtendedSet<Gym>()

  public async save(gym: Gym): Promise<SaveGymResult> {
    const id = randomUUID()
    const gymWithId = Gym.restore({
      id,
      title: gym.title,
      description: gym.description,
      latitude: gym.latitude,
      longitude: gym.longitude,
      phone: gym.phone,
      createdAt: new Date(),
    })
    this.gyms.add(gymWithId)
    return { id }
  }

  public async findByTitle(title: string): Promise<Gym | null> {
    return this.gyms.find((gym) => gym.title === title)
  }
}
