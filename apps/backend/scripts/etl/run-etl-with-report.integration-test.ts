import { randomUUID } from "node:crypto"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createTestMongoConnection } from "test/mongo/create-test-mongo-connection"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"
import { EtlBatchError } from "./etl-runner"
import type { EtlCollection, EtlRows, EtlSource } from "./etl-types"
import { runEtlWithReport } from "./run-etl-with-report"

class FailingSource implements EtlSource {
	public async readBatch<K extends EtlCollection>(): Promise<EtlRows[K][]> {
		throw new Error("source unavailable")
	}

	public async count(): Promise<number> {
		return 0
	}
}

class EmptySource extends FailingSource {
	public override async readBatch<K extends EtlCollection>(): Promise<
		EtlRows[K][]
	> {
		return []
	}
}

describe("runEtlWithReport", () => {
	let connection: MongoConnection
	let dbName: string
	let directory: string

	beforeAll(async () => {
		dbName = `etl_${randomUUID().replaceAll("-", "")}`
		connection = await createTestMongoConnection(dbName)
		directory = await mkdtemp(join(tmpdir(), "etl-report-"))
	})

	afterAll(async () => {
		await connection.client().db(dbName).dropDatabase()
		await connection.disconnect()
		await rm(directory, { recursive: true, force: true })
	})

	it("AC-06: a failed batch writes a report naming the collection and the id to resume after, then rethrows", async () => {
		const reportPath = join(directory, "failed.json")

		const error = await runEtlWithReport(
			{ source: new FailingSource(), connection },
			reportPath,
		).catch((caught: unknown) => caught)

		expect(error).toBeInstanceOf(EtlBatchError)
		const report = JSON.parse(await readFile(reportPath, "utf8"))
		expect(report).toMatchObject({
			ok: false,
			failedBatch: { collection: "plans", afterId: null },
		})
		expect(report.failedBatch.message).toContain("plans")
	})

	it("a successful run writes the full report", async () => {
		const reportPath = join(directory, "ok.json")

		await runEtlWithReport(
			{ source: new EmptySource(), connection },
			reportPath,
		)

		const report = JSON.parse(await readFile(reportPath, "utf8"))
		expect(report.ok).toBe(true)
		expect(report.collections.plans).toMatchObject({ sourceCount: 0 })
	})
})
