import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeNotificationRepositoryContract } from "test/repository-contract/notification-repository-contract"
import { InMemoryNotificationRepository } from "./in-memory-notification.repository"

describeNotificationRepositoryContract("in-memory", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new InMemoryNotificationRepository(),
		newId: () => recorder.newId(),
		ensureReferences: async () => {},
		cleanup: async () => {},
	}
})
