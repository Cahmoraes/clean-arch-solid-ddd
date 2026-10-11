import { describeCheckInRepositoryContract } from "test/repository-contract/check-in-repository-contract"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { InMemoryCheckInRepository } from "./in-memory-check-in-repository"

describeCheckInRepositoryContract("in-memory", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new InMemoryCheckInRepository(),
		newId: () => recorder.newId(),
		ensureReferences: async () => {},
		cleanup: async () => {},
	}
})
