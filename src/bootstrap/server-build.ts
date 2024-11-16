import type { CheckInController } from '@/infra/controllers/check-in/check-in.controller'
import type { ValidateCheckInController } from '@/infra/controllers/check-in/validate-check-in.controller'
import { CreateGymController } from '@/infra/controllers/gym/create-gym.controller'
import type { SearchGymController } from '@/infra/controllers/gym/search-gym.controller'
import type { AuthenticateController } from '@/infra/controllers/user/authenticate.controller'
import type { CreateUserController } from '@/infra/controllers/user/create-user.controller'
import type { MyProfileController } from '@/infra/controllers/user/my-profile.controller'
import type { UserMetricsController } from '@/infra/controllers/user/user-metrics.controller'
import type { UserProfileController } from '@/infra/controllers/user/user-profile.controller'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'
import { FastifyAdapter } from '@/infra/server/fastify-adapter'

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
  const searchGymController = container.get<SearchGymController>(
    TYPES.Controllers.SearchGym,
  )
  const validateCheckInController = container.get<ValidateCheckInController>(
    TYPES.Controllers.ValidateCheckIn,
  )
  const myProfileController = container.get<MyProfileController>(
    TYPES.Controllers.MyProfile,
  )
  const userMetricsController = container.get<UserMetricsController>(
    TYPES.Controllers.UserMetrics,
  )
  userController.handle(fastifyServer)
  authenticateController.handle(fastifyServer)
  userProfileController.handle(fastifyServer)
  checkInController.handle(fastifyServer)
  gymController.handle(fastifyServer)
  searchGymController.handle(fastifyServer)
  validateCheckInController.handle(fastifyServer)
  myProfileController.handle(fastifyServer)
  userMetricsController.handle(fastifyServer)
  return fastifyServer
}
