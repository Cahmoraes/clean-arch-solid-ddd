import "reflect-metadata"

import { join } from "node:path"
import { cwd } from "node:process"

import { config } from "dotenv"

// Forcar NODE_ENV=test antes de carregar o .env
process.env.NODE_ENV = "test"

config({
	path: [join(cwd(), ".env.test"), join(cwd(), ".env")],
	override: false, // Nao sobrescrever NODE_ENV definido acima
	quiet: true,
})

const [{ container }, { NOTIFICATION_TYPES }] = await Promise.all([
	import("@/shared/infra/ioc/container"),
	import("@/shared/infra/ioc/module/service-identifier/notification-types"),
])

container
	.rebind(NOTIFICATION_TYPES.EventHandlers.CreateNotificationOnCheckIn)
	.toConstantValue({
		subscribe: () => undefined,
	})
container
	.rebind(NOTIFICATION_TYPES.Infra.RedisNotificationSubscriber)
	.toConstantValue({
		subscribe: async () => undefined,
		disconnect: async () => undefined,
	})
container
	.rebind(NOTIFICATION_TYPES.Infra.NotificationQueueWorker)
	.toConstantValue({
		init: async () => undefined,
	})
