import type { Gym } from '@/domain/gym'

export interface GymRepository {
  save(gym: Gym): Promise<void>
  findByTitle(title: string): Promise<Gym | null>
}
