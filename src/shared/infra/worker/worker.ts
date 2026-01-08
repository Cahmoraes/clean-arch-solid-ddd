import { EVENTS } from "@/shared/domain/event/events"
import { container } from "../ioc/container"
import { SHARED_TYPES } from "../ioc/types"
import type { BullMQAdapter } from "../queue/bullmq-adapter"

try {
	const bullMQAdapter = container.get<BullMQAdapter>(SHARED_TYPES.Worker)
	bullMQAdapter
	await bullMQAdapter.connect()
	console.log(bullMQAdapter)
	bullMQAdapter.consume(EVENTS.USER_CREATED, async (job: any) => {
		console.log("**** Worker ****")
		console.log(job.data)
	})
} catch (e) {
	console.error(e)
}
