import { type ExecException, exec } from "node:child_process"

async function waitingForPostgres() {
	exec(
		"docker exec postgresql-dev pg_isready -h localhost -p 5432 -U docker",
		handleReturn,
	)
	function handleReturn(_error: ExecException | null, stdout: string) {
		if (!stdout.includes("accepting connections")) {
			process.stdout.write(".")
			waitingForPostgres()
			return
		}
		console.log("\n\n🍏 Postgres está pronto e aceitando conexões!\n")
	}
}

process.stdout.write("\n\n🚀 Aguardando Postgres aceitar conexões")
waitingForPostgres()
