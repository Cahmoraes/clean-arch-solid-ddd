import { injectable } from "inversify"
import type { ActiveRecipientsProvider } from "@/notification/application/provider/active-recipients.provider.js"

@injectable()
export class InMemoryActiveRecipientsProvider
	implements ActiveRecipientsProvider
{
	public userIds: string[] = []

	public async listActiveUserIds(): Promise<string[]> {
		return [...this.userIds]
	}
}
