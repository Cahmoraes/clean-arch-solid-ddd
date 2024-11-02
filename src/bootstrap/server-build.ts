import type { AuthenticateController } from '@/infra/controllers/user/authenticate.controller'
import type { CreateUserController } from '@/infra/controllers/user/create-user.controller'
import { FastifyAdapter } from '@/infra/server/fastify-adapter'
import { container } from '@/shared/ioc/container'
import { TYPES } from '@/shared/ioc/types'

export function serverBuild() {
  const fastifyServer = new FastifyAdapter()
  const userController = container.get<CreateUserController>(
    TYPES.Controllers.User,
  )
  const authenticateController = container.get<AuthenticateController>(
    TYPES.Controllers.Authenticate,
  )
  userController.handle(fastifyServer)
  authenticateController.handle(fastifyServer)
  return fastifyServer
}
