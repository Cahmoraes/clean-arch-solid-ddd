import { writeFile } from "node:fs/promises"
import { EtlBatchError, type EtlOptions, runEtl } from "./etl-runner"
import type { EtlReport } from "./etl-types"

export interface EtlFailureReport {
	generatedAt: string
	ok: false
	failedBatch: {
		collection: string
		afterId: string | null
		message: string
	}
}

async function writeReport(
	reportPath: string,
	report: EtlReport | EtlFailureReport,
): Promise<void> {
	await writeFile(reportPath, JSON.stringify(report, null, 2))
}

// A failed batch still leaves a report naming the collection and the id to resume after.
export async function runEtlWithReport(
	options: EtlOptions,
	reportPath: string,
): Promise<EtlReport> {
	try {
		const report = await runEtl(options)
		await writeReport(reportPath, report)
		return report
	} catch (error) {
		if (error instanceof EtlBatchError) {
			await writeReport(reportPath, {
				generatedAt: new Date().toISOString(),
				ok: false,
				failedBatch: {
					collection: error.collection,
					afterId: error.afterId ?? null,
					message: error.message,
				},
			})
		}
		throw error
	}
}
