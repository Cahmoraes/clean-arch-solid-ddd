import ExtendedSet from '@cahmoraes93/extended-set'
import { injectable } from 'inversify'

import type { GymRepository } from '@/application/repository/gym-repository'
import type { Gym } from '@/domain/gym'

@injectable()
export class InMemoryGymRepository implements GymRepository {
  public gyms = new ExtendedSet<Gym>()

  public async save(gym: Gym): Promise<any> {
    this.gyms.add(gym)
  }

  public async findByTitle(title: string): Promise<Gym | null> {
    return this.gyms.find((gym) => gym.title === title)
  }
}
