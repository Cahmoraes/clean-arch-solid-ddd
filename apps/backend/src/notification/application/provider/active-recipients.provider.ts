export interface ActiveRecipientsProvider {
	listActiveUserIds(): Promise<string[]>
}
