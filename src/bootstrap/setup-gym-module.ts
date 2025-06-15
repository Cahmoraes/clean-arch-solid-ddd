import { CreateGymController } from '@/gym/infra/controller/create-gym.controller'
import { SearchGymController } from '@/gym/infra/controller/search-gym.controller'

import { type ModuleControllers, resolve } from './server-build'

/**
 * Setup Gym Module
 * Resolves and returns all gym-related controllers
 */
export function setupGymModule(): ModuleControllers {
  const controllers = [
    resolve(CreateGymController),
    resolve(SearchGymController),
  ]
  return { controllers }
}
