import type { ResolutionContext } from "inversify"

import { isProduction } from "@/shared/infra/env"
import { BullMQAdapter } from "@/shared/infra/queue/bullmq-adapter"
import type { Queue } from "@/shared/infra/queue/queue"
import { QueueMemoryAdapter } from "@/shared/infra/queue/queue-memory-adapter"

export class WorkerProvider {
	public static provide(context: ResolutionContext): Queue {
		return isProduction()
			? context.get(BullMQAdapter, { autobind: true })
			: context.get(QueueMemoryAdapter, { autobind: true })
	}
}
