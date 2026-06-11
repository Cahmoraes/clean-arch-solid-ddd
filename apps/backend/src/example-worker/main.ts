import path from "node:path"
import { Worker } from "node:worker_threads"

const workerPath = path.join(import.meta.dirname, "./worker.ts")
async function main(rawPassword: string) {
	try {
		const hashed = await hash(rawPassword)
		console.log(hashed)
	} catch (error) {
		console.log(error)
	}
}

async function hash(rawPassword: string) {
	return new Promise((resolve, reject) => {
		const worker = new Worker(workerPath)
		worker.postMessage({
			workerData: {
				rawPassword,
			},
		})
		worker.on("message", resolve)
		worker.on("error", (error) => {
			reject(error)
		})
		worker.on("exit", (code) => {
			if (code !== 0) {
				reject(new Error(`Worker encerrou com código ${code}`))
			}
		})
	})
}

main("caique-123")
