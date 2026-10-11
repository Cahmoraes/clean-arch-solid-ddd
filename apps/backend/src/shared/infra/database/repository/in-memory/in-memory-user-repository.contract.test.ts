import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeUserRepositoryContract } from "test/repository-contract/user-repository-contract"
import { UserNotPersistedError } from "@/shared/infra/errors/user-not-persisted-error"
import { InMemoryUserRepository } from "./in-memory-user-repository"

describeUserRepositoryContract("in-memory", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new InMemoryUserRepository(),
		newId: () => recorder.newId(),
		missingRecordError: UserNotPersistedError,
		cleanup: async () => {},
	}
})
