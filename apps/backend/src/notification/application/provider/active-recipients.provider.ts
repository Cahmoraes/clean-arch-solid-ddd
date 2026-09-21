import type { NoticeAudience } from "@/notification/domain/value-object/notice-audience.js"

export interface ActiveRecipientsProvider {
	listActiveUserIds(audience: NoticeAudience): Promise<string[]>
}
