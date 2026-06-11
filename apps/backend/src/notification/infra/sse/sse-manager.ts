import { injectable } from "inversify"

export interface SseClient {
	raw: {
		write(chunk: string): void
	}
}

@injectable()
export class SseManager {
	private readonly clients = new Map<string, Set<SseClient>>()

	public add(userId: string, reply: SseClient): void {
		const userClients = this.clients.get(userId)
		if (!userClients) {
			this.clients.set(userId, new Set([reply]))
			return
		}
		userClients.add(reply)
	}

	public remove(userId: string, reply: SseClient): void {
		const userClients = this.clients.get(userId)
		if (!userClients) {
			return
		}
		userClients.delete(reply)
		if (userClients.size === 0) {
			this.clients.delete(userId)
		}
	}

	public send(userId: string, data: unknown): void {
		const userClients = this.clients.get(userId)
		if (!userClients) {
			return
		}
		const message = `data: ${JSON.stringify(data)}\n\n`
		const deadClients: SseClient[] = []
		for (const reply of userClients) {
			try {
				reply.raw.write(message)
			} catch {
				deadClients.push(reply)
			}
		}
		for (const deadClient of deadClients) {
			this.remove(userId, deadClient)
		}
	}

	public clientCount(userId: string): number {
		return this.clients.get(userId)?.size ?? 0
	}
}
