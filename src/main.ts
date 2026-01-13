import "reflect-metadata"

import { serverBuild } from "@/bootstrap/server-build"

import { setupCronJob } from "./bootstrap/setup-cron-job"
import { SQLiteUserRepository } from "./shared/infra/database/repository/sqlite/sqlite-user-repository"
import { container } from "./shared/infra/ioc/container"
import type { HttpServer } from "./shared/infra/server/http-server"
import { User } from "./user/domain/user"

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

const sqliteUserRepository = container.get(SQLiteUserRepository)

// console.log(sqliteUserRepository)
// const user = await User.create({
// 	name: "João example",
// 	email: "joao1.silva@example.com",
// 	password: "123456",
// })
// console.log(user.value)
// await sqliteUserRepository.save(user.force.success().value)
const result = await sqliteUserRepository.userOfEmail("joao1.silva@example.com")
console.log(result)
// sqliteConnector.resetDatabase()
