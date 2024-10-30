import 'reflect-metadata'

import { CreateUserController } from './infra/controllers/user/create-user.controller'
import { container } from './infra/ioc/container'
import { TYPES } from './infra/ioc/types'
import { FastifyAdapter } from './infra/server/fastify-adapter'
import type { HttpServer } from './infra/server/http-server'

const server: HttpServer = new FastifyAdapter()
const userController = container.get<CreateUserController>(
  TYPES.CreateUserController,
)
userController.handle(server)
server.initialize()
