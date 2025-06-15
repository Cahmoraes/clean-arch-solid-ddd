import { CheckInController } from '@/check-in/infra/controller/check-in.controller'
import { ValidateCheckInController } from '@/check-in/infra/controller/validate-check-in.controller'
import type { Controller } from '@/shared/infra/controller/controller'
import { CreateGymController } from '@/gym/infra/controller/create-gym.controller'
import { SearchGymController } from '@/gym/infra/controller/search-gym.controller'
import { QueueController } from '@/shared/infra/controller/queue-controller'
import { AuthenticateController } from '@/user/infra/controller/authenticate.controller'
import { ChangePasswordController } from '@/user/infra/controller/change-password.controller'
import { CreateUserController } from '@/user/infra/controller/create-user.controller'
import { FetchUsersController } from '@/user/infra/controller/fetch-users.controller'
import { MyProfileController } from '@/user/infra/controller/my-profile.controller'
import { RefreshTokenController } from '@/user/infra/controller/refresh-token.controller'
import { UserMetricsController } from '@/user/infra/controller/user-metrics.controller'
import { UserProfileController } from '@/user/infra/controller/user-profile.controller'
import { container } from '@/shared/infra/ioc/container'
import { TYPES } from '@/shared/infra/ioc/types'
import { EXCHANGES } from '@/shared/infra/queue/exchanges'
import type { Queue } from '@/shared/infra/queue/queue'
import type { FastifyAdapter } from '@/shared/infra/server/fastify-adapter'

interface ConstructorClass {
  new (...args: any[]): Controller
}

export async function serverBuild() {
  const fastifyServer = container.get<FastifyAdapter>(TYPES.Server.Fastify)
  const userController = resolve(CreateUserController)
  const authenticateController = resolve(AuthenticateController)
  const userProfileController = resolve(UserProfileController)
  const checkInController = resolve(CheckInController)
  const gymController = resolve(CreateGymController)
  const searchGymController = resolve(SearchGymController)
  const validateCheckInController = resolve(ValidateCheckInController)
  const myProfileController = resolve(MyProfileController)
  const userMetricsController = resolve(UserMetricsController)
  const refreshTokenController = resolve(RefreshTokenController)
  const changePasswordController = resolve(ChangePasswordController)
  const fetchUsersController = resolve(FetchUsersController)
  const queue = container.get<Queue>(TYPES.Queue)
  await queue.connect()
  const queueController = resolve(QueueController)
  queueController.init()
  queue.publish(EXCHANGES.LOG, {
    message: 'Server started',
  })
  userController.init()
  authenticateController.init()
  userProfileController.init()
  checkInController.init()
  gymController.init()
  searchGymController.init()
  validateCheckInController.init()
  myProfileController.init()
  userMetricsController.init()
  refreshTokenController.init()
  changePasswordController.init()
  fetchUsersController.init()
  return fastifyServer

  function resolve(aClass: ConstructorClass): Controller {
    return container.get(aClass, { autobind: true })
  }
}
