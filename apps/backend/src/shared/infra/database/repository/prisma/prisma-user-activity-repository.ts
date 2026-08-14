import { inject, injectable } from "inversify"
import type {
	Prisma,
	PrismaClient,
} from "@/shared/infra/database/generated/prisma/client"
import { SHARED_TYPES } from "@/shared/infra/ioc/types"
import type {
	RecordUserActivityInput,
	UserActivityRepository,
} from "@/user/application/persistence/repository/user-activity-repository"

@injectable()
export class PrismaUserActivityRepository implements UserActivityRepository {
	constructor(
		@inject(SHARED_TYPES.Prisma.Client)
		private readonly prisma: PrismaClient | Prisma.TransactionClient,
	) {}

	public async record(input: RecordUserActivityInput): Promise<void> {
		await this.prisma.userActivityEvent.create({
			data: {
				userId: input.userId,
				type: input.type,
				description: input.description,
				// Boundary conversion: Application layer cannot import Prisma types
				// (dependency rule), so RecordUserActivityInput#metadata is typed as
				// Record<string, unknown>. Cast to the Prisma JSON type here, at the
				// single point where it crosses into the persistence layer.
				metadata: input.metadata as Prisma.InputJsonObject | undefined,
				occurredAt: input.occurredAt,
			},
		})
	}
}
