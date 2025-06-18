import { ContainerModule } from 'inversify'

import { JsonWebTokenAdapter } from '@/shared/infra/auth/json-web-token-adapter'
import { QueueController } from '@/shared/infra/controller/queue-controller'
import { CookieAdapter } from '@/shared/infra/cookie/cookie-adapter'
import { PgClient } from '@/shared/infra/database/connection/pg-client'
import { prismaClient } from '@/shared/infra/database/connection/prisma-client'
import { PrismaUnitOfWork } from '@/shared/infra/database/repository/unit-of-work/prisma-unit-of-work'
import { UnitOfWorkProvider } from '@/shared/infra/database/repository/unit-of-work/unit-of-work-provider'
import { MailerGatewayMemory } from '@/shared/infra/gateway/mailer-gateway-memory'
import { NodeMailerAdapter } from '@/shared/infra/gateway/node-mailer-adapter'
import { WinstonAdapter } from '@/shared/infra/logger/winston-adapter'
import { FastifyAdapter } from '@/shared/infra/server/fastify-adapter'

import { TYPES } from '../../types'
import { CacheDBProvider } from './cache-db-provider'
import { MailerProvider } from './mailer-provider'
import { QueueProvider } from './queue-provider'

export const infraContainer = new ContainerModule(({ bind }) => {
  bind(TYPES.Prisma.Client).toConstantValue(prismaClient)
  bind(TYPES.Prisma.UnitOfWork).to(PrismaUnitOfWork).inSingletonScope()
  bind(TYPES.PG.Client).toConstantValue(new PgClient())
  bind(TYPES.Tokens.Auth).to(JsonWebTokenAdapter)
  bind(TYPES.Server.Fastify).to(FastifyAdapter).inSingletonScope()
  bind(TYPES.Cookies.Manager).to(CookieAdapter).inRequestScope()
  bind(TYPES.Redis).toDynamicValue(CacheDBProvider.provide).inSingletonScope()
  bind(TYPES.Logger).to(WinstonAdapter).inSingletonScope()
  bind(TYPES.Queue).toDynamicValue(QueueProvider.provide).inSingletonScope()
  bind(NodeMailerAdapter).toSelf().inSingletonScope()
  bind(MailerGatewayMemory).toSelf().inSingletonScope()
  bind(TYPES.Mailer).toDynamicValue(MailerProvider.provide)
  bind(TYPES.Controllers.Queue).to(QueueController).inSingletonScope()
  bind(TYPES.UnitOfWork).toDynamicValue(UnitOfWorkProvider.provide)
})
