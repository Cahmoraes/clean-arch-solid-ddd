import type { Controller } from '@/shared/infra/controller/controller'
import { container } from '@/shared/infra/ioc/container'
import { SHARED_TYPES } from '@/shared/infra/ioc/types'
import { EXCHANGES } from '@/shared/infra/queue/exchanges'
import type { Queue } from '@/shared/infra/queue/queue'
import type { FastifyAdapter } from '@/shared/infra/server/fastify-adapter'

import { setupCheckInModule } from './setup-check-in-module'
import { setupGymModule } from './setup-gym-module'
import { setupHealthCheckModule } from './setup-health-check-module'
import { setupSessionModule } from './setup-session-module'
import { setupSubscriptionModule } from './setup-subscription-module'
import { setupUserModule } from './setup-user-module'

export interface ModuleControllers {
  controllers: Controller[]
}

export async function serverBuild() {
  const server = resolve<FastifyAdapter>(SHARED_TYPES.Server.Fastify)
  const queue = resolve<Queue>(SHARED_TYPES.Queue)
  await queue.connect()
  const queueController = resolve(SHARED_TYPES.Controllers.Queue)
  queueController.init()
  initializeControllers([
    ...setupUserModule().controllers,
    ...setupGymModule().controllers,
    ...setupCheckInModule().controllers,
    ...setupSessionModule().controllers,
    ...setupHealthCheckModule().controllers,
    ...setupSubscriptionModule().controllers,
  ])
  queue.publish(EXCHANGES.LOG, {
    message: 'Server started',
  })
  return server
}

/**
 * Initialize all controllers by calling their init method
 */
function initializeControllers(controllers: Controller[]): void {
  controllers.forEach((controller): Promise<void> => controller.init())
}

/**
 * Resolve a controller from the IoC container
 */
export function resolve<T = Controller>(serviceIdentifier: symbol): T {
  return container.get(serviceIdentifier)
}
