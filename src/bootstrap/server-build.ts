// Check-in Module Controllers
import { CheckInController } from '@/check-in/infra/controller/check-in.controller'
import { ValidateCheckInController } from '@/check-in/infra/controller/validate-check-in.controller'
// Gym Module Controllers
import { CreateGymController } from '@/gym/infra/controller/create-gym.controller'
import { SearchGymController } from '@/gym/infra/controller/search-gym.controller'
// Shared Infrastructure
import type { Controller } from '@/shared/infra/controller/controller'
import { QueueController } from '@/shared/infra/controller/queue-controller'
import { container } from '@/shared/infra/ioc/container'
import { TYPES } from '@/shared/infra/ioc/types'
import { EXCHANGES } from '@/shared/infra/queue/exchanges'
import type { Queue } from '@/shared/infra/queue/queue'
import type { FastifyAdapter } from '@/shared/infra/server/fastify-adapter'
// User Module Controllers
import { AuthenticateController } from '@/user/infra/controller/authenticate.controller'
import { ChangePasswordController } from '@/user/infra/controller/change-password.controller'
import { CreateUserController } from '@/user/infra/controller/create-user.controller'
import { FetchUsersController } from '@/user/infra/controller/fetch-users.controller'
import { MyProfileController } from '@/user/infra/controller/my-profile.controller'
import { RefreshTokenController } from '@/user/infra/controller/refresh-token.controller'
import { UserMetricsController } from '@/user/infra/controller/user-metrics.controller'
import { UserProfileController } from '@/user/infra/controller/user-profile.controller'

interface ConstructorClass {
  new (...args: any[]): Controller
}

interface ModuleControllers {
  controllers: Controller[]
}

export async function serverBuild() {
  const fastifyServer = container.get<FastifyAdapter>(TYPES.Server.Fastify)
  // Initialize queue infrastructure
  const queue = container.get<Queue>(TYPES.Queue)
  await queue.connect()
  const queueController = resolve(QueueController)
  queueController.init()
  // Initialize modules
  const userModule = setupUserModule()
  const gymModule = setupGymModule()
  const checkInModule = setupCheckInModule()
  // Initialize all controllers
  initializeControllers([
    ...userModule.controllers,
    ...gymModule.controllers,
    ...checkInModule.controllers,
  ])
  // Log server start
  queue.publish(EXCHANGES.LOG, {
    message: 'Server started',
  })
  return fastifyServer
}

/**
 * Setup User Module
 * Resolves and returns all user-related controllers
 */
function setupUserModule(): ModuleControllers {
  const controllers = [
    resolve(CreateUserController),
    resolve(AuthenticateController),
    resolve(UserProfileController),
    resolve(MyProfileController),
    resolve(UserMetricsController),
    resolve(RefreshTokenController),
    resolve(ChangePasswordController),
    resolve(FetchUsersController),
  ]
  return { controllers }
}

/**
 * Setup Gym Module
 * Resolves and returns all gym-related controllers
 */
function setupGymModule(): ModuleControllers {
  const controllers = [
    resolve(CreateGymController),
    resolve(SearchGymController),
  ]
  return { controllers }
}

/**
 * Setup Check-in Module
 * Resolves and returns all check-in-related controllers
 */
function setupCheckInModule(): ModuleControllers {
  const controllers = [
    resolve(CheckInController),
    resolve(ValidateCheckInController),
  ]
  return { controllers }
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
function resolve(aClass: ConstructorClass): Controller {
  return container.get(aClass, { autobind: true })
}
