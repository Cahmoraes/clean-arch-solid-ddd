import { execSync } from "node:child_process"
import amqp from "amqplib"

const AMQP_URL = process.env.AMQP_URL ?? "amqp://localhost"
const RETRY_INTERVAL_MS = 1000

async function waitingForRabbitmq(): Promise<void> {
	process.stdout.write("\n\n🚀 Aguardando RabbitMQ aceitar conexões")
	while (true) {
		try {
			const conn = await amqp.connect(AMQP_URL)
			const channel = await conn.createChannel()
			await channel.close()
			await conn.close()
			console.log("\n\n🉐 RabbitMQ está pronto e aceitando conexões!\n")
			execSync("npm run setup-queue", { stdio: "inherit" })
			return
		} catch {
			process.stdout.write(".")
			await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL_MS))
		}
	}
}

await waitingForRabbitmq()
