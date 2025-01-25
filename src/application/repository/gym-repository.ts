import type { Gym } from '@/domain/gym'
import type { Coordinate } from '@/domain/value-object/coordinate'

export interface SaveGymResult {
  id: string
}

export interface GymRepository {
  save(gym: Gym): Promise<SaveGymResult>
  gymOfTitle(title: string, page: number): Promise<Gym[]>
  gymOfId(id: string): Promise<Gym | null>
  fetchNearbyCoord(coordinate: Coordinate): Promise<Gym[]>
}
