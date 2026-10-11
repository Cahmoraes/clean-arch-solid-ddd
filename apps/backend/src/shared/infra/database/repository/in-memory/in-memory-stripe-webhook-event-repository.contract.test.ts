import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeStripeWebhookEventRepositoryContract } from "test/repository-contract/stripe-webhook-event-repository-contract"
import { InMemoryStripeWebhookEventRepository } from "./in-memory-stripe-webhook-event-repository"

describeStripeWebhookEventRepositoryContract("in-memory", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new InMemoryStripeWebhookEventRepository(),
		newId: () => recorder.newId(),
		cleanup: async () => {},
	}
})
