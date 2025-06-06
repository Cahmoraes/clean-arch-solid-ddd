import { randomUUID } from 'node:crypto'

import ExtendedSet from '@cahmoraes93/extended-set'
import { injectable } from 'inversify'

import type {
  GymRepository,
  SaveGymResult,
} from '@/application/gym/repository/gym-repository'
import { DistanceCalculator } from '@/domain/check-in/service/distance-calculator'
import type { Coordinate } from '@/domain/check-in/value-object/coordinate'
import { Gym } from '@/domain/gym/gym'
import { env } from '@/infra/env'

@injectable()
export class InMemoryGymRepository implements GymRepository {
  public gyms = new ExtendedSet<Gym>()
  public KILOMETER = 1

  public async save(gym: Gym): Promise<SaveGymResult> {
    const id = gym.id ?? randomUUID()
    const gymWithId = Gym.restore({
      id,
      title: gym.title,
      description: gym.description,
      latitude: gym.latitude,
      longitude: gym.longitude,
      phone: gym.phone,
    })
    this.gyms.add(gymWithId)
    return { id }
  }

  public async gymOfId(id: string): Promise<Gym | null> {
    return this.gyms.find((gym) => gym.id === id)
  }

  public async gymOfTitle(title: string, page: number): Promise<Gym[]> {
    return this.gyms
      .filter((gym) =>
        gym.title.toLocaleLowerCase().includes(title.toLocaleLowerCase()),
      )
      .toArray()
      .slice((page - 1) * env.ITEMS_PER_PAGE, page * env.ITEMS_PER_PAGE)
  }

  public async fetchNearbyCoord(coordinate: Coordinate): Promise<Gym[]> {
    const nearbyGyms = this.gyms.filter((gym) => {
      const distance = DistanceCalculator.distanceBetweenCoordinates(
        { latitude: coordinate.latitude, longitude: coordinate.longitude },
        { latitude: gym.latitude, longitude: gym.longitude },
      )
      return distance <= this.KILOMETER
    })
    return nearbyGyms.toArray()
  }
}
