import { type interfaces } from 'inversify'

import { isDevelopment } from '@/infra/env'
import { QueueMemoryAdapter } from '@/infra/queue/queue-memory-adapter'
import { RabbitMQAdapter } from '@/infra/queue/rabbitmq-adapter'

export class QueueProvider {
  public static provide(context: interfaces.Context) {
    return isDevelopment()
      ? context.container.get(QueueMemoryAdapter)
      : context.container.get(RabbitMQAdapter)
  }
}
