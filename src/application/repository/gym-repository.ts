import type { Gym } from '@/domain/gym'

export interface SaveGymResult {
  id: string
}

export interface GymRepository {
  save(gym: Gym): Promise<SaveGymResult>
  findByTitle(title: string): Promise<Gym | null>
}
