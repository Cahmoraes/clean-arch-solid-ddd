import { CheckInController } from '@/infra/controller/check-in/check-in.controller'
import { ValidateCheckInController } from '@/infra/controller/check-in/validate-check-in.controller'
import type { Controller } from '@/infra/controller/controller'
import { CreateGymController } from '@/infra/controller/gym/create-gym.controller'
import { SearchGymController } from '@/infra/controller/gym/search-gym.controller'
import { QueueController } from '@/infra/controller/queue-controller'
import { AuthenticateController } from '@/infra/controller/user/authenticate.controller'
import { ChangePasswordController } from '@/infra/controller/user/change-password.controller'
import { CreateUserController } from '@/infra/controller/user/create-user.controller'
import { FetchUsersController } from '@/infra/controller/user/fetch-users.controller'
import { MyProfileController } from '@/infra/controller/user/my-profile.controller'
import { RefreshTokenController } from '@/infra/controller/user/refresh-token.controller'
import { UserMetricsController } from '@/infra/controller/user/user-metrics.controller'
import { UserProfileController } from '@/infra/controller/user/user-profile.controller'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'
import { EXCHANGES } from '@/infra/queue/exchanges'
import type { Queue } from '@/infra/queue/queue'
import type { FastifyAdapter } from '@/infra/server/fastify-adapter'

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
