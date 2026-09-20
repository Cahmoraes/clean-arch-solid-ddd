import type { ResolutionContext } from "inversify"
import type { ActiveRecipientsProvider } from "@/notification/application/provider/active-recipients.provider.js"
import { InMemoryActiveRecipientsProvider } from "@/notification/infra/provider/in-memory/in-memory-active-recipients.provider.js"
import { PrismaActiveRecipientsProvider } from "@/notification/infra/provider/prisma/prisma-active-recipients.provider.js"
import { env, isProduction } from "@/shared/infra/env/index.js"

export class ActiveRecipientsProviderResolver {
	public static provide(context: ResolutionContext): ActiveRecipientsProvider {
		if (!isProduction()) {
			return context.get(InMemoryActiveRecipientsProvider, { autobind: true })
		}
		if (env.DATABASE_PROVIDER === "prisma") {
			return context.get(PrismaActiveRecipientsProvider, { autobind: true })
		}
		return context.get(InMemoryActiveRecipientsProvider, { autobind: true })
	}
}
