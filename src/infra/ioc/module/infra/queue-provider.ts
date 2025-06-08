import type { ResolutionContext } from 'inversify'

import { isProduction } from '@/infra/env'
import type { Queue } from '@/infra/queue/queue'
import { QueueMemoryAdapter } from '@/infra/queue/queue-memory-adapter'
import { RabbitMQAdapter } from '@/infra/queue/rabbitmq-adapter'
// import { RabbitMQAdapter } from '@/infra/queue/rabbitmq-adapter'

export class QueueProvider {
  public static provide(context: ResolutionContext): Queue {
    return isProduction()
      ? context.get(RabbitMQAdapter)
      : context.get(QueueMemoryAdapter)
  }
}
