import { ContainerModule } from 'inversify'

import { JsonWebTokenAdapter } from '@/infra/auth/json-web-token-adapter'
import { QueueController } from '@/infra/controller/queue-controller'
import { CookieAdapter } from '@/infra/cookie/cookie-adapter'
import { PgClient } from '@/infra/database/connection/pg-client'
import { prismaClient } from '@/infra/database/connection/prisma-client'
import { CacheDBMemory } from '@/infra/database/redis/cache-db-memory'
import { RedisAdapter } from '@/infra/database/redis/redis-adapter'
import { MailerGatewayMemory } from '@/infra/gateway/mailer-gateway-memory'
import { NodeMailerAdapter } from '@/infra/gateway/node-mailer-adapter'
import { WinstonAdapter } from '@/infra/logger/winston-adapter'
import { QueueMemoryAdapter } from '@/infra/queue/queue-memory-adapter'
import { RabbitMQAdapter } from '@/infra/queue/rabbitmq-adapter'
import { FastifyAdapter } from '@/infra/server/fastify-adapter'

import { TYPES } from '../../types'
import { CacheDBProvider } from './cache-db-provider'
import { MailerProvider } from './mailer-provider'
import { QueueProvider } from './queue-provider'

export const infraContainer = new ContainerModule(({ bind }) => {
  bind(TYPES.Prisma.Client).toConstantValue(prismaClient)
  bind(TYPES.PG.Client).toConstantValue(new PgClient())
  bind(TYPES.Tokens.Auth).to(JsonWebTokenAdapter)
  bind(TYPES.Server.Fastify).to(FastifyAdapter).inSingletonScope()
  bind(TYPES.Cookies.Manager).to(CookieAdapter)
  bind(RedisAdapter).toSelf().inSingletonScope()
  bind(CacheDBMemory).toSelf()
  bind(TYPES.Redis).toDynamicValue(CacheDBProvider.provide)
  bind(TYPES.Logger).to(WinstonAdapter).inSingletonScope()
  bind(RabbitMQAdapter).toSelf().inSingletonScope()
  bind(QueueMemoryAdapter).toSelf()
  bind(TYPES.Queue).toDynamicValue(QueueProvider.provide)
  bind(NodeMailerAdapter).toSelf().inSingletonScope()
  bind(MailerGatewayMemory).toSelf().inSingletonScope()
  bind(TYPES.Mailer).toDynamicValue(MailerProvider.provide)
  bind(TYPES.Controllers.Queue).to(QueueController).inSingletonScope()
})
