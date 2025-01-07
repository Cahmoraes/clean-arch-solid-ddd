import { CheckInController } from '@/infra/controllers/check-in/check-in.controller'
import { ValidateCheckInController } from '@/infra/controllers/check-in/validate-check-in.controller'
import { CreateGymController } from '@/infra/controllers/gym/create-gym.controller'
import { SearchGymController } from '@/infra/controllers/gym/search-gym.controller'
import { QueueController } from '@/infra/controllers/queue-controller'
import { AuthenticateController } from '@/infra/controllers/user/authenticate.controller'
import { ChangePasswordController } from '@/infra/controllers/user/change-password.controller'
import { CreateUserController } from '@/infra/controllers/user/create-user.controller'
import { MyProfileController } from '@/infra/controllers/user/my-profile.controller'
import { RefreshTokenController } from '@/infra/controllers/user/refresh-token.controller'
import { UserMetricsController } from '@/infra/controllers/user/user-metrics.controller'
import { UserProfileController } from '@/infra/controllers/user/user-profile.controller'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'
import type { Queue } from '@/infra/queue/queue'
import { FastifyAdapter } from '@/infra/server/fastify-adapter'

export async function serverBuild() {
  const fastifyServer = container.resolve(FastifyAdapter)
  const userController = container.resolve(CreateUserController)
  const authenticateController = container.resolve(AuthenticateController)
  const userProfileController = container.resolve(UserProfileController)
  const checkInController = container.resolve(CheckInController)
  const gymController = container.resolve(CreateGymController)
  const searchGymController = container.resolve(SearchGymController)
  const validateCheckInController = container.resolve(ValidateCheckInController)
  const myProfileController = container.resolve(MyProfileController)
  const userMetricsController = container.resolve(UserMetricsController)
  const refreshTokenController = container.resolve(RefreshTokenController)
  const changePasswordController = container.resolve(ChangePasswordController)
  const queue = container.get<Queue>(TYPES.Queue)
  await queue.connect()
  const queueController = container.resolve(QueueController)
  await queueController.init()
  userController.handle(fastifyServer)
  authenticateController.handle(fastifyServer)
  userProfileController.handle(fastifyServer)
  checkInController.handle(fastifyServer)
  gymController.handle(fastifyServer)
  searchGymController.handle(fastifyServer)
  validateCheckInController.handle(fastifyServer)
  myProfileController.handle(fastifyServer)
  userMetricsController.handle(fastifyServer)
  refreshTokenController.handle(fastifyServer)
  changePasswordController.handle(fastifyServer)
  return fastifyServer
}
