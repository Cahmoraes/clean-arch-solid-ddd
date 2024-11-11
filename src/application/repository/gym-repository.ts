import type { Gym } from '@/domain/gym'

export interface SaveGymResult {
  id: string
}

export interface GymRepository {
  save(gym: Gym): Promise<SaveGymResult>
  findByTitle(title: string, page: number): Promise<Gym[]>
  findById(id: string): Promise<Gym | null>
}
