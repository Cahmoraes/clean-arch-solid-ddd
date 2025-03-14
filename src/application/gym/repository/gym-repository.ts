import type { Coordinate } from '@/domain/check-in/value-object/coordinate'
import type { Gym } from '@/domain/gym/gym'

export interface SaveGymResult {
  id: string
}

export interface GymRepository {
  save(gym: Gym): Promise<SaveGymResult>
  gymOfTitle(title: string, page: number): Promise<Gym[]>
  gymOfId(id: string): Promise<Gym | null>
  fetchNearbyCoord(coordinate: Coordinate): Promise<Gym[]>
}
