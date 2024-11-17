import { ContainerModule, type interfaces } from 'inversify'

import { JsonWebTokenAdapter } from '@/infra/auth/json-web-token-adapter'
import { CookieAdapter } from '@/infra/cookie/cookie-adapter'
import { prismaClient } from '@/infra/database/connection/prisma-client'
import { FastifyAdapter } from '@/infra/server/fastify-adapter'

import { TYPES } from '../../types'

export const infraContainer = new ContainerModule((bind: interfaces.Bind) => {
  bind(TYPES.Prisma.Client).toConstantValue(prismaClient)
  bind(TYPES.Tokens.Auth).to(JsonWebTokenAdapter)
  bind(TYPES.Server.Fastify).to(FastifyAdapter)
  bind(TYPES.Cookies.Manager).to(CookieAdapter)
})
