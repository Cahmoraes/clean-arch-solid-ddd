import "reflect-metadata"

import { serverBuild } from "@/bootstrap/server-build"

import { setupCronJob } from "./bootstrap/setup-cron-job"
import type { HttpServer } from "./shared/infra/server/http-server"

async function main(): Promise<HttpServer> {
	const server = await serverBuild()
	await server.listen()
	setupCronJob()
	return server
}

async function setupGracefulShutdown(server: HttpServer): Promise<void> {
	await server.close()
	process.exit()
}

const server = await main()

process.on("SIGINT", () => setupGracefulShutdown(server))
process.on("SIGTERM", () => setupGracefulShutdown(server))
