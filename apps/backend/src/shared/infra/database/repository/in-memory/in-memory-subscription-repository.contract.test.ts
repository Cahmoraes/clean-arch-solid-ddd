import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeSubscriptionRepositoryContract } from "test/repository-contract/subscription-repository-contract"
import { InMemorySubscriptionRepository } from "./in-memory-subscription-repository"

describeSubscriptionRepositoryContract("in-memory", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new InMemorySubscriptionRepository(),
		newId: () => recorder.newId(),
		ensureReferences: async () => {},
		cleanup: async () => {},
	}
})
