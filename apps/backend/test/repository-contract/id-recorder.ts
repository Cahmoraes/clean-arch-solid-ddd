import { randomUUID } from "node:crypto"

export class IdRecorder {
	private readonly recorded: string[] = []

	public newId(): string {
		const id = randomUUID()
		this.recorded.push(id)
		return id
	}

	public get ids(): readonly string[] {
		return this.recorded
	}
}
