import type { AuthenticateController } from '@/infra/controllers/user/authenticate.controller'
import type { CreateUserController } from '@/infra/controllers/user/create-user.controller'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'
import { FastifyAdapter } from '@/infra/server/fastify-adapter'

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
