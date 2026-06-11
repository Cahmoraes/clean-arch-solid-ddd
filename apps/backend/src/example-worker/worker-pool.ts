import path from "node:path"
import { Worker } from "node:worker_threads"

export interface Queue {
	rawPassword: string
	resolve: CallableFunction
	reject: CallableFunction
}

export interface Resolvers {
	resolve: CallableFunction
	reject: CallableFunction
}

const workerPath = path.join(import.meta.dirname, "./worker.ts")
export class WorkerPool {
	private workers: Worker[]
	private queue: Queue[]
	private availables: Worker[]
	private resolvers: Map<Worker, Resolvers>

	constructor(size: number, workerPath: string) {
		this.queue = []
		this.resolvers = new Map()

		this.workers = [...Array(size)].map(() => {
			const worker = new Worker(workerPath)
			worker.on("message", (hash: string) => {
				const resolver = this.resolvers.get(worker)
				if (!resolver) return
				resolver.resolve(hash)
				this.resolvers.delete(worker)
				this.onWorkerFree(worker)
			})
			worker.on("error", (err) => {
				const resolver = this.resolvers.get(worker)
				if (!resolver) return
				resolver.reject(err)
				this.resolvers.delete(worker)
				this.onWorkerFree(worker)
			})
			return worker
		})
		this.availables = [...this.workers]
	}

	private onWorkerFree(worker: Worker): void {
		if (!this.queue.length) {
			this.availables.push(worker)
			return
		}
		// biome-ignore lint/style/noNonNullAssertion: intencional
		const nextJob = this.queue.shift()!
		this.resolvers.set(worker, nextJob)
		worker.postMessage({ workerData: { rawPassword: nextJob.rawPassword } })
	}

	public run(rawPassword: string): Promise<string> {
		return new Promise((resolve, reject) => {
			if (!this.availables.length) {
				this.queue.push({
					rawPassword,
					resolve,
					reject,
				})
				return
			}
			// biome-ignore lint/style/noNonNullAssertion: intencional
			const worker = this.availables.shift()!
			this.resolvers.set(worker, { resolve, reject })
			worker.postMessage({
				workerData: {
					rawPassword,
				},
			})
		})
	}
}

import os from "node:os"

const POOL_SIZE = os.cpus().length - 1
console.log(POOL_SIZE)

const pool = new WorkerPool(POOL_SIZE, workerPath)
const results = await Promise.all([
	pool.run("senha-1"),
	pool.run("senha-2"),
	pool.run("senha-3"),
	pool.run("senha-4"),
	pool.run("senha-5"),
	pool.run("senha-3"),
	pool.run("senha-4"),
	pool.run("senha-5"),
	pool.run("senha-3"),
	pool.run("senha-4"),
	pool.run("senha-5"),
	pool.run("senha-3"),
	pool.run("senha-4"),
	pool.run("senha-5"),
])

console.log(results)
