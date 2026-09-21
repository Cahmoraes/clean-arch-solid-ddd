import { injectable } from "inversify"
import type { ActiveRecipientsProvider } from "@/notification/application/provider/active-recipients.provider.js"
import type { NoticeAudience } from "@/notification/domain/value-object/notice-audience.js"

@injectable()
export class InMemoryActiveRecipientsProvider
	implements ActiveRecipientsProvider
{
	public userIds: string[] = []
	public adminIds: string[] = []

	public async listActiveUserIds(audience: NoticeAudience): Promise<string[]> {
		switch (audience.value) {
			case "ADMINS":
				return this.userIds.filter((userId) => this.isAdmin(userId))
			case "MEMBERS":
				return this.userIds.filter((userId) => !this.isAdmin(userId))
			case "ALL":
				return [...this.userIds]
		}
	}

	private isAdmin(userId: string): boolean {
		return this.adminIds.includes(userId)
	}
}
