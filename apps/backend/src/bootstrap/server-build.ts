import type { Controller } from "@/shared/infra/controller/controller"
import { container } from "@/shared/infra/ioc/container"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import { EXCHANGES } from "@/shared/infra/queue/exchanges"
import type { Queue } from "@/shared/infra/queue/queue"
import type { FastifyAdapter } from "@/shared/infra/server/fastify-adapter"

import { setupAnalyticsModule } from "./setup-analytics-module"
import { setupCheckInModule } from "./setup-check-in-module"
import { setupContactModule } from "./setup-contact-module"
import { setupGymModule } from "./setup-gym-module"
import { setupHealthCheckModule } from "./setup-health-check-module"
import { setupNotificationModule } from "./setup-notification-module"
import { setupSessionModule } from "./setup-session-module"
import { setupSubscriptionModule } from "./setup-subscription-module"
import { setupUserModule } from "./setup-user-module"

export interface ModuleControllers {
	controllers: Controller[]
	workers?: Controller[]
}

export async function serverBuild() {
	const server = resolve<FastifyAdapter>(SHARED_TYPES.Server.Fastify)
	await server.prepare()
	const queue = resolve<Queue>(SHARED_TYPES.Queue)
	await queue.connect()
	const queueController = resolve(SHARED_TYPES.Controllers.Queue)
	await queueController.init()

	const modules = [
		await setupUserModule(),
		await setupGymModule(),
		await setupCheckInModule(),
		await setupSessionModule(),
		await setupHealthCheckModule(),
		await setupSubscriptionModule(),
		await setupNotificationModule(),
		await setupAnalyticsModule(),
		setupContactModule(),
	]

	await initializeControllers(modules.flatMap((m) => m.controllers))
	await initializeWorkers(modules.flatMap((m) => m.workers ?? []))

	await queue.publish(EXCHANGES.LOG, {
		message: "Server started",
	})
	return server
}

/**
 * Initialize all controllers by calling their init method
 */
async function initializeControllers(controllers: Controller[]): Promise<void> {
	for (const controller of controllers) {
		await controller.init()
	}
}

async function initializeWorkers(workers: Controller[]): Promise<void> {
	for (const worker of workers) {
		await worker.init()
	}
}

/**
 * Resolve a controller from the IoC container
 */
export function resolve<T = Controller>(serviceIdentifier: symbol): T {
	return container.get(serviceIdentifier)
}
