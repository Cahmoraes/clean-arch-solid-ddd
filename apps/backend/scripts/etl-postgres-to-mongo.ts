import { MongoConnection } from "@/shared/infra/database/connection/mongo/mongo-connection"
import { prismaClient } from "@/shared/infra/database/connection/prisma-client.js"
import { env } from "@/shared/infra/env"
import { PrismaEtlSource } from "./etl/prisma-etl-source"
import { runEtlWithReport } from "./etl/run-etl-with-report"

const REPORT_PATH = "etl-report.json"

async function main(): Promise<void> {
	if (!env.DATABASE_URL_MONGO) {
		throw new Error("DATABASE_URL_MONGO is required to run the ETL")
	}
	const connection = new MongoConnection(env.DATABASE_URL_MONGO)
	try {
		await connection.connect()
		await connection.assertTransactionsSupported()
		await connection.ensureIndexes()
		const report = await runEtlWithReport(
			{ source: new PrismaEtlSource(prismaClient), connection },
			REPORT_PATH,
		)
		console.log(
			`ETL finished (${report.ok ? "ok" : "inconsistent"}); excluded: ${report.orphans.length} orphans, ${report.duplicateCheckIns.length} duplicate check-ins, ${report.duplicateUserNotifications.length} duplicate user notifications; report: ${REPORT_PATH}`,
		)
		if (!report.ok) process.exitCode = 1
	} finally {
		await connection.disconnect()
		await prismaClient.$disconnect()
	}
}

await main()
