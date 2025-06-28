import { TYPES } from '@/shared/infra/ioc/types'

import { type ModuleControllers, resolve } from './server-build'

export function setupSessionModule(): ModuleControllers {
  const controllers = [
    resolve(TYPES.Controllers.Authenticate),
    resolve(TYPES.Controllers.Logout),
  ]
  return { controllers }
}
