import { ContainerModule } from 'inversify'

import { JsonWebTokenAdapter } from '@/shared/infra/auth/json-web-token-adapter'
import { QueueController } from '@/shared/infra/controller/queue-controller'
import { CookieAdapter } from '@/shared/infra/cookie/cookie-adapter'
import { NodeCronAdapter } from '@/shared/infra/cron/node-cron-adapter'
import { UpdateUserProfileCacheTask } from '@/shared/infra/cron/task/update-user-profile-cache-task'
import { PgClient } from '@/shared/infra/database/connection/pg-client'
import { prismaClient } from '@/shared/infra/database/connection/prisma-client'
import { PrismaUnitOfWork } from '@/shared/infra/database/repository/unit-of-work/prisma-unit-of-work'
import { UnitOfWorkProvider } from '@/shared/infra/database/repository/unit-of-work/unit-of-work-provider'
import { MailerGatewayMemory } from '@/shared/infra/gateway/mailer-gateway-memory'
import { NodeMailerAdapter } from '@/shared/infra/gateway/node-mailer-adapter'
import { WinstonAdapter } from '@/shared/infra/logger/winston-adapter'
import { FastifyAdapter } from '@/shared/infra/server/fastify-adapter'

import { SHARED_TYPES } from '../../types'
import { CacheDBProvider } from './cache-db-provider'
import { MailerProvider } from './mailer-provider'
import { QueueProvider } from './queue-provider'

export const infraContainer = new ContainerModule(({ bind }) => {
  bind(SHARED_TYPES.Prisma.Client).toConstantValue(prismaClient)
  bind(SHARED_TYPES.Prisma.UnitOfWork).to(PrismaUnitOfWork).inSingletonScope()
  bind(SHARED_TYPES.PG.Client).toConstantValue(new PgClient())
  bind(SHARED_TYPES.Tokens.Auth).to(JsonWebTokenAdapter)
  bind(SHARED_TYPES.Server.Fastify).to(FastifyAdapter).inSingletonScope()
  bind(SHARED_TYPES.Cookies.Manager).to(CookieAdapter).inRequestScope()
  bind(SHARED_TYPES.Redis)
    .toDynamicValue(CacheDBProvider.provide)
    .inSingletonScope()
  bind(SHARED_TYPES.Logger).to(WinstonAdapter).inSingletonScope()
  bind(SHARED_TYPES.Queue)
    .toDynamicValue(QueueProvider.provide)
    .inSingletonScope()
  bind(NodeMailerAdapter).toSelf().inSingletonScope()
  bind(MailerGatewayMemory).toSelf().inSingletonScope()
  bind(SHARED_TYPES.Mailer).toDynamicValue(MailerProvider.provide)
  bind(SHARED_TYPES.Controllers.Queue).to(QueueController).inSingletonScope()
  bind(SHARED_TYPES.UnitOfWork).toDynamicValue(UnitOfWorkProvider.provide)
  bind(SHARED_TYPES.CronJob).to(NodeCronAdapter)
  bind(SHARED_TYPES.Task.UpdateUserProfileCache).to(UpdateUserProfileCacheTask)
})
