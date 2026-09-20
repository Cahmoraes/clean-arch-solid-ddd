import { inject, injectable } from "inversify"
import type { ActiveRecipientsProvider } from "@/notification/application/provider/active-recipients.provider.js"
import type { PrismaClient } from "@/shared/infra/database/generated/prisma/client"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"

@injectable()
export class PrismaActiveRecipientsProvider
	implements ActiveRecipientsProvider
{
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prismaClient: PrismaClient,
	) {}

	public async listActiveUserIds(): Promise<string[]> {
		const users = await this.prismaClient.user.findMany({
			where: { status: "activated", deleted_at: null },
			select: { id: true },
		})
		return users.map((user) => user.id)
	}
}
