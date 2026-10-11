import { describeGymRepositoryContract } from "test/repository-contract/gym-repository-contract"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { InMemoryGymRepository } from "./in-memory-gym-repository"

describeGymRepositoryContract("in-memory", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new InMemoryGymRepository(),
		newId: () => recorder.newId(),
		cleanup: async () => {},
	}
})
