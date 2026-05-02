import { type ExecException, exec } from "node:child_process"

async function waitingForRabbitmq() {
	exec(
		`docker exec rabbitmq rabbitmq-diagnostics ping 2>&1; echo "EXIT: $?"`,
		handleReturn,
	)

	function handleReturn(_error: ExecException | null, stdout: string) {
		if (!stdout.includes("Ping succeeded")) {
			process.stdout.write(".")
			waitingForRabbitmq()
			return
		}
		console.log("\n\n🉐 RabbitMQ está pronto e aceitando conexões!\n")
		exec(`npm run setup-queue`)
	}
}

process.stdout.write("\n\n🚀 Aguardando RabbitMQ aceitar conexões")
waitingForRabbitmq()
