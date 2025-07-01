import type { ResolutionContext } from 'inversify'

import { isProduction } from '@/shared/infra/env'
import type { Queue } from '@/shared/infra/queue/queue'
import { QueueMemoryAdapter } from '@/shared/infra/queue/queue-memory-adapter'
import { RabbitMQAdapter } from '@/shared/infra/queue/rabbitmq-adapter'
// import { RabbitMQAdapter } from '@/shared/infra/queue/rabbitmq-adapter'

export class QueueProvider {
  public static provide(context: ResolutionContext): Queue {
    return isProduction()
      ? context.get(RabbitMQAdapter, { autobind: true })
      : context.get(QueueMemoryAdapter, { autobind: true })
  }
}
