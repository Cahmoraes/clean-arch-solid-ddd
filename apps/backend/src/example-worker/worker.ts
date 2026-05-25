import { parentPort } from "node:worker_threads"
import bcrypt from "bcryptjs"

parentPort?.on("message", ({ workerData }) => {
	const password = workerData.rawPassword
	const hash = bcrypt.hashSync(password, 12)
	parentPort?.postMessage(hash)
})
