import type { CheckInController } from '@/infra/controllers/check-in/check-in.controller'
import type { AuthenticateController } from '@/infra/controllers/user/authenticate.controller'
import type { CreateUserController } from '@/infra/controllers/user/create-user.controller'
import type { UserProfileController } from '@/infra/controllers/user/user-profile.controller'
import { FastifyAdapter } from '@/infra/server/fastify-adapter'
import { container } from '@/shared/ioc/container'
import { TYPES } from '@/shared/ioc/types'

export function serverBuild() {
  const fastifyServer = new FastifyAdapter()
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
  userController.handle(fastifyServer)
  authenticateController.handle(fastifyServer)
  userProfileController.handle(fastifyServer)
  checkInController.handle(fastifyServer)
  return fastifyServer
}
