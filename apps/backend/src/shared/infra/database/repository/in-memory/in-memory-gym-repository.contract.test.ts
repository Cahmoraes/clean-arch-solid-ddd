import { describeGymRepositoryContract } from "test/repository-contract/gym-repository-contract"
import { IdRecorder } from "test/repository-contract/id-recorder"
import { GymNotPersistedError } from "@/shared/infra/errors/gym-not-persisted-error"
import { InMemoryGymRepository } from "./in-memory-gym-repository"

describeGymRepositoryContract("in-memory", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new InMemoryGymRepository(),
		newId: () => recorder.newId(),
		missingRecordError: GymNotPersistedError,
		cleanup: async () => {},
	}
})
