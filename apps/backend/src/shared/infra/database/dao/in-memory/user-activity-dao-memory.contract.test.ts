import { IdRecorder } from "test/repository-contract/id-recorder"
import { describeUserActivityDaoContract } from "test/repository-contract/user-activity-dao-contract"
import { InMemoryUserActivityDao } from "./user-activity-dao-memory"

describeUserActivityDaoContract("in-memory", async () => {
	const recorder = new IdRecorder()
	return {
		newId: () => recorder.newId(),
		seed: async (data) =>
			new InMemoryUserActivityDao([
				...data.events.map((event) => ({
					id: event.id,
					type: event.type,
					description: event.description,
					occurredAt: event.occurredAt,
				})),
				...data.checkIns.map((checkIn) => ({
					id: checkIn.id,
					type: "CHECK_IN" as const,
					description: `Check-in — ${data.gymTitle}`,
					occurredAt: checkIn.occurredAt,
				})),
			]),
		cleanup: async () => {},
	}
})
