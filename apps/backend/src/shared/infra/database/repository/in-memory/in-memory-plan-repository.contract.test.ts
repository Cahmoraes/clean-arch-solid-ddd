import { IdRecorder } from "test/repository-contract/id-recorder"
import { describePlanRepositoryContract } from "test/repository-contract/plan-repository-contract"
import { PlanNotPersistedError } from "@/shared/infra/errors/plan-not-persisted-error"
import { InMemoryPlanRepository } from "./in-memory-plan-repository"

describePlanRepositoryContract("in-memory", async () => {
	const recorder = new IdRecorder()
	return {
		repository: new InMemoryPlanRepository(),
		newId: () => recorder.newId(),
		missingRecordError: PlanNotPersistedError,
		cleanup: async () => {},
	}
})
