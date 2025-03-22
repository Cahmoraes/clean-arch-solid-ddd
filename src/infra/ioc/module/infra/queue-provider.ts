import type { ResolutionContext } from 'inversify'

import { isProduction } from '@/infra/env'
import type { Queue } from '@/infra/queue/queue'
import { QueueMemoryAdapter } from '@/infra/queue/queue-memory-adapter'

export class QueueProvider {
  public static provide(context: ResolutionContext): Queue {
    return isProduction()
      ? context.get(QueueMemoryAdapter)
      : context.get(QueueMemoryAdapter)
  }
}
