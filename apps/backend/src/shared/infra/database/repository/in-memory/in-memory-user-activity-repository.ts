import { injectable } from "inversify"
import type {
	RecordUserActivityInput,
	UserActivityRepository,
} from "@/user/application/persistence/repository/user-activity-repository"

@injectable()
export class InMemoryUserActivityRepository implements UserActivityRepository {
	public readonly records: RecordUserActivityInput[] = []

	public async record(input: RecordUserActivityInput): Promise<void> {
		this.records.push(input)
	}
}
