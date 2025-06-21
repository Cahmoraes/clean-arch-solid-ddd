import type { Coordinate } from '@/check-in/domain/value-object/coordinate'
import type { Gym } from '@/gym/domain/gym'

export interface SaveGymResult {
  id: string
}

export interface GymRepository {
  save(gym: Gym): Promise<SaveGymResult>
  gymOfTitle(title: string, page: number): Promise<Gym[]>
  gymOfId(id: string): Promise<Gym | null>
  fetchNearbyCoord(coordinate: Coordinate): Promise<Gym[]>
  gymOfCNPJ(cnpj: string): Promise<Gym | null>
}
