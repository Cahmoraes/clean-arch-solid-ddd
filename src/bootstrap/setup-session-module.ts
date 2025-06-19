import { AuthenticateController } from '@/session/infra/controller/authenticate.controller'
import { LogoutController } from '@/session/infra/controller/logout.controller'

import { type ModuleControllers, resolve } from './server-build'

export function setupSessionModule(): ModuleControllers {
  const controllers = [
    resolve(AuthenticateController),
    resolve(LogoutController),
  ]
  return { controllers }
}
