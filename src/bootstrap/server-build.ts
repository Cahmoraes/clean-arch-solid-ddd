import type { CheckInController } from '@/infra/controllers/check-in/check-in.controller'
import type { MetricsController } from '@/infra/controllers/check-in/metrics.controller'
import type { CreateGymController } from '@/infra/controllers/gym/create-gym.controller'
import type { SearchGymController } from '@/infra/controllers/gym/search-gym.controller'
import type { AuthenticateController } from '@/infra/controllers/user/authenticate.controller'
import type { CreateUserController } from '@/infra/controllers/user/create-user.controller'
import type { UserProfileController } from '@/infra/controllers/user/user-profile.controller'
import { FastifyAdapter } from '@/infra/server/fastify-adapter'
import { container } from '@/shared/ioc/container'
import { TYPES } from '@/shared/ioc/types'

export function serverBuild() {
  const fastifyServer = container.get<FastifyAdapter>(TYPES.Server.Fastify)
  const userController = container.get<CreateUserController>(
    TYPES.Controllers.CreateUser,
  )
  const authenticateController = container.get<AuthenticateController>(
    TYPES.Controllers.Authenticate,
  )
  const userProfileController = container.get<UserProfileController>(
    TYPES.Controllers.UserProfile,
  )
  const checkInController = container.get<CheckInController>(
    TYPES.Controllers.CheckIn,
  )
  const gymController = container.get<CreateGymController>(
    TYPES.Controllers.CreateGym,
  )
  const metricsController = container.get<MetricsController>(
    TYPES.Controllers.UserMetrics,
  )
  const searchGymController = container.get<SearchGymController>(
    TYPES.Controllers.SearchGym,
  )
  userController.handle(fastifyServer)
  authenticateController.handle(fastifyServer)
  userProfileController.handle(fastifyServer)
  checkInController.handle(fastifyServer)
  gymController.handle(fastifyServer)
  metricsController.handle(fastifyServer)
  searchGymController.handle(fastifyServer)
  return fastifyServer
}
