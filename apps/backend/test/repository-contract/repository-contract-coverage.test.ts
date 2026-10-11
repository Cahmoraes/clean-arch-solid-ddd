import { existsSync, readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const BACKEND_ROOT = path.resolve(import.meta.dirname, "..", "..")
const REPOSITORY = "src/shared/infra/database/repository"
const DAO = "src/shared/infra/database/dao"
const NOTIFICATION_REPOSITORY = "src/notification/infra/repository"
const NOTIFICATION_PROVIDER = "src/notification/infra/provider"

interface ContractEntry {
	helper: string
	describeName: string
	inMemory: string
	prisma: string
	mongo: string
}

const ENTRIES: ContractEntry[] = [
	{
		helper: "user-repository-contract",
		describeName: "describeUserRepositoryContract",
		inMemory: `${REPOSITORY}/in-memory/in-memory-user-repository.contract.test.ts`,
		prisma: `${REPOSITORY}/prisma/prisma-user-repository.contract.integration-test.ts`,
		mongo: `${REPOSITORY}/mongo/mongo-user-repository.integration-test.ts`,
	},
	{
		helper: "user-dao-contract",
		describeName: "describeUserDaoContract",
		inMemory: `${DAO}/in-memory/user-dao-memory.contract.test.ts`,
		prisma: `${DAO}/prisma/prisma-user-dao.contract.integration-test.ts`,
		mongo: `${DAO}/mongo/mongo-user-dao.integration-test.ts`,
	},
	{
		helper: "gym-repository-contract",
		describeName: "describeGymRepositoryContract",
		inMemory: `${REPOSITORY}/in-memory/in-memory-gym-repository.contract.test.ts`,
		prisma: `${REPOSITORY}/prisma/prisma-gym-repository.contract.integration-test.ts`,
		mongo: `${REPOSITORY}/mongo/mongo-gym-repository.integration-test.ts`,
	},
	{
		helper: "check-in-repository-contract",
		describeName: "describeCheckInRepositoryContract",
		inMemory: `${REPOSITORY}/in-memory/in-memory-check-in-repository.contract.test.ts`,
		prisma: `${REPOSITORY}/prisma/prisma-check-in-repository.contract.integration-test.ts`,
		mongo: `${REPOSITORY}/mongo/mongo-check-in-repository.integration-test.ts`,
	},
	{
		helper: "plan-repository-contract",
		describeName: "describePlanRepositoryContract",
		inMemory: `${REPOSITORY}/in-memory/in-memory-plan-repository.contract.test.ts`,
		prisma: `${REPOSITORY}/prisma/prisma-plan-repository.contract.integration-test.ts`,
		mongo: `${REPOSITORY}/mongo/mongo-plan-repository.integration-test.ts`,
	},
	{
		helper: "stripe-webhook-event-repository-contract",
		describeName: "describeStripeWebhookEventRepositoryContract",
		inMemory: `${REPOSITORY}/in-memory/in-memory-stripe-webhook-event-repository.contract.test.ts`,
		prisma: `${REPOSITORY}/prisma/prisma-stripe-webhook-event-repository.contract.integration-test.ts`,
		mongo: `${REPOSITORY}/mongo/mongo-stripe-webhook-event-repository.integration-test.ts`,
	},
	{
		helper: "subscription-repository-contract",
		describeName: "describeSubscriptionRepositoryContract",
		inMemory: `${REPOSITORY}/in-memory/in-memory-subscription-repository.contract.test.ts`,
		prisma: `${REPOSITORY}/prisma/prisma-subscription-repository.contract.integration-test.ts`,
		mongo: `${REPOSITORY}/mongo/mongo-subscription-repository.integration-test.ts`,
	},
	{
		helper: "notification-repository-contract",
		describeName: "describeNotificationRepositoryContract",
		inMemory: `${NOTIFICATION_REPOSITORY}/in-memory/in-memory-notification.repository.contract.test.ts`,
		prisma: `${NOTIFICATION_REPOSITORY}/prisma/prisma-notification.repository.contract.integration-test.ts`,
		mongo: `${NOTIFICATION_REPOSITORY}/mongo/mongo-notification.repository.integration-test.ts`,
	},
	{
		helper: "active-recipients-provider-contract",
		describeName: "describeActiveRecipientsProviderContract",
		inMemory: `${NOTIFICATION_PROVIDER}/in-memory/in-memory-active-recipients.provider.contract.test.ts`,
		prisma: `${NOTIFICATION_PROVIDER}/prisma/prisma-active-recipients.provider.contract.integration-test.ts`,
		mongo: `${NOTIFICATION_PROVIDER}/mongo/mongo-active-recipients.provider.integration-test.ts`,
	},
	{
		helper: "user-activity-dao-contract",
		describeName: "describeUserActivityDaoContract",
		inMemory: `${DAO}/in-memory/user-activity-dao-memory.contract.test.ts`,
		prisma: `${DAO}/prisma/prisma-user-activity-dao.contract.integration-test.ts`,
		mongo: `${DAO}/mongo/mongo-user-activity-dao.integration-test.ts`,
	},
]

function read(relativePath: string): string {
	return readFileSync(path.join(BACKEND_ROOT, relativePath), "utf8")
}

describe("repository contract coverage", () => {
	it("AC-10: every contract helper in test/repository-contract is registered here", () => {
		const helpers = readdirSync(
			path.join(BACKEND_ROOT, "test/repository-contract"),
		)
			.filter((file) => file.endsWith("-contract.ts"))
			.map((file) => file.replace(/\.ts$/, ""))
			.sort()

		expect(helpers).toEqual(ENTRIES.map((entry) => entry.helper).sort())
	})

	it.each(
		ENTRIES,
	)("AC-10: $describeName is invoked against in-memory, Prisma and Mongo", (entry) => {
		const helperImport = `test/repository-contract/${entry.helper}`
		const sides = [
			{ file: entry.inMemory, suffix: ".contract.test.ts" },
			{ file: entry.prisma, suffix: ".contract.integration-test.ts" },
			{ file: entry.mongo, suffix: ".integration-test.ts" },
		]

		for (const side of sides) {
			expect(side.file.endsWith(side.suffix), `${side.file} suffix`).toBe(true)
			expect(
				existsSync(path.join(BACKEND_ROOT, side.file)),
				`${side.file} exists`,
			).toBe(true)
			const source = read(side.file)
			expect(source, `${side.file} imports the helper`).toContain(helperImport)
			expect(source, `${side.file} calls the helper`).toContain(
				`${entry.describeName}(`,
			)
		}
	})
})
