import type { ResolutionContext } from "inversify"

import type { NotificationRepository } from "@/notification/application/repository/notification.repository.js"
import { InMemoryNotificationRepository } from "@/notification/infra/repository/in-memory/in-memory-notification.repository.js"
import { PrismaNotificationRepository } from "@/notification/infra/repository/prisma/prisma-notification.repository.js"
import { env, isProduction } from "@/shared/infra/env/index.js"

export class NotificationRepositoryProvider {
	public static provide(context: ResolutionContext): NotificationRepository {
		if (!isProduction()) {
			return context.get(InMemoryNotificationRepository, { autobind: true })
		}
		if (env.DATABASE_PROVIDER === "prisma") {
			return context.get(PrismaNotificationRepository, { autobind: true })
		}
		return context.get(InMemoryNotificationRepository, { autobind: true })
	}
}
