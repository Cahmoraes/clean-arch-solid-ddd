import { AuthenticateController } from '@/session/infra/controller/routes/authenticate.controller'

import { type ModuleControllers, resolve } from './server-build'

export function setupSessionModule(): ModuleControllers {
  const controllers = [resolve(AuthenticateController)]
  return { controllers }
}
