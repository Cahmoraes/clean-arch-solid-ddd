import type { Controller } from '@/shared/infra/controller/controller'
import { QueueController } from '@/shared/infra/controller/queue-controller'
import type { CacheHealthProvider } from '@/shared/infra/health/cache/cache-health-provider'
import type { DatabaseHealthProvider } from '@/shared/infra/health/database/database-health-provider'
import { container } from '@/shared/infra/ioc/container'
import { TYPES } from '@/shared/infra/ioc/types'
import { EXCHANGES } from '@/shared/infra/queue/exchanges'
import type { Queue } from '@/shared/infra/queue/queue'
import type { FastifyAdapter } from '@/shared/infra/server/fastify-adapter'

import { setupCheckInModule } from './setup-check-in-module'
import { setupGymModule } from './setup-gym-module'
import { setupSessionModule } from './setup-session-module'
import { setupUserModule } from './setup-user-module'

interface ConstructorClass {
  new (...args: any[]): Controller
}

export interface ModuleControllers {
  controllers: Controller[]
}

export async function serverBuild() {
  const fastifyServer = container.get<FastifyAdapter>(TYPES.Server.Fastify)
  const queue = container.get<Queue>(TYPES.Queue)
  await queue.connect()
  const queueController = resolve(QueueController)
  queueController.init()
  initializeControllers([
    ...setupUserModule().controllers,
    ...setupGymModule().controllers,
    ...setupCheckInModule().controllers,
    ...setupSessionModule().controllers,
  ])
  const databaseHealthProvider = container.get<DatabaseHealthProvider>(
    TYPES.HealthCheck.Database,
  )
  const healthDatabase = await databaseHealthProvider.check()
  console.log({ healthDatabase })
  const cacheHealthProvider = container.get<CacheHealthProvider>(
    TYPES.HealthCheck.Cache,
  )
  console.log({ cacheHealthProvider })
  const healthCache = await cacheHealthProvider.check()
  console.log({ healthCache })
  queue.publish(EXCHANGES.LOG, {
    message: 'Server started',
  })
  return fastifyServer
}

/**
 * Initialize all controllers by calling their init method
 */
function initializeControllers(controllers: Controller[]): void {
  controllers.forEach((controller) => controller.init())
}

/**
 * Resolve a controller from the IoC container
 */
export function resolve(aClass: ConstructorClass): Controller {
  return container.get(aClass, { autobind: true })
}
