import { describeActiveRecipientsProviderContract } from "test/repository-contract/active-recipients-provider-contract"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { InMemoryActiveRecipientsProvider } from "./in-memory-active-recipients.provider"

describeActiveRecipientsProviderContract("in-memory", async () => {
	const provider = new InMemoryActiveRecipientsProvider()
	const recorder = new IdRecorder()
	return {
		provider,
		newId: () => recorder.newId(),
		seed: async (users) => {
			const eligible = users.filter(
				(user) => user.status === "activated" && !user.deleted,
			)
			provider.userIds = eligible.map((user) => user.id)
			provider.adminIds = eligible
				.filter((user) => user.role === "ADMIN")
				.map((user) => user.id)
		},
		cleanup: async () => {},
	}
})
