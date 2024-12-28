import { ContainerModule, type interfaces } from 'inversify'

import { JsonWebTokenAdapter } from '@/infra/auth/json-web-token-adapter'
import { CookieAdapter } from '@/infra/cookie/cookie-adapter'
import { prismaClient } from '@/infra/database/connection/prisma-client'
import { WinstonAdapter } from '@/infra/logger/winston-adapter'
import { RabbitMQAdapter } from '@/infra/queue/rabbitmq-adapter'
import { FastifyAdapter } from '@/infra/server/fastify-adapter'

import { TYPES } from '../../types'

export const infraContainer = new ContainerModule((bind: interfaces.Bind) => {
  bind(TYPES.Prisma.Client).toConstantValue(prismaClient)
  bind(TYPES.Tokens.Auth).to(JsonWebTokenAdapter).inSingletonScope()
  bind(TYPES.Server.Fastify).to(FastifyAdapter).inSingletonScope()
  bind(TYPES.Cookies.Manager).to(CookieAdapter).inSingletonScope()
  bind(TYPES.Logger).to(WinstonAdapter).inSingletonScope()
  bind(TYPES.Queue).to(RabbitMQAdapter).inSingletonScope()
})
