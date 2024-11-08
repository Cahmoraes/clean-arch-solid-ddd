import { Gym } from '@/domain/gym'
import type { InMemoryGymRepository } from '@/infra/database/repository/in-memory/in-memory-gym-repository'

export interface CreateAndSaveGym {
  gymRepository: InMemoryGymRepository
  id?: string
  latitude?: number
  longitude?: number
  title?: string
  description?: string
  phone?: string
}

export async function createAndSaveGym(props: CreateAndSaveGym) {
  const gymId = props.id ?? 'any_gym_id'
  const gym = Gym.create({
    id: gymId,
    title: 'any_name',
    latitude: props.latitude ?? 0,
    longitude: props.longitude ?? 0,
    ...props,
  })
  await props.gymRepository.save(gym)
  return props.gymRepository.gyms.toArray()[0]
}
