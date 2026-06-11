interface Message<T = unknown> {
	type: string
	payload?: unknown
	resolve?: (value: T) => void
	reject?: (reasong?: unknown) => void
	replyTo?: Actor
}

type Behavior = (message: Message) => void | Promise<void>

class Actor {
	private mailbox: Message[] = []
	private processing = false
	private behavior: Behavior

	constructor(behavior: Behavior) {
		this.behavior = behavior
	}

	public send(message: Message): void {
		this.mailbox.push(message)
		this.process()
	}

	public async ask(message: Omit<Message, "resolve" | "reject">) {
		return new Promise((resolve, reject) => {
			this.send({ ...message, resolve, reject })
		})
	}

	private async process(): Promise<void> {
		if (this.processing) return
		this.processing = true
		while (this.mailbox.length > 0) {
			const message = this.mailbox.shift()!
			try {
				await this.behavior(message)
			} catch (err) {
				if (!message.reject) {
					console.error(`[Actor] erro não tratado no tipo "${message.type}":`, err)
				}
				message.reject?.(err)
			}
			await new Promise((resolve) => setTimeout(resolve, 0))
		}
		this.processing = false
	}
}

function createCounterActor() {
	let count = 0
	return new Actor((message) => {
		switch (message.type) {
			case "INCREMENT":
				count += Number(message.payload) ?? 1
				break
			case "RESET":
				count = 0
				break
			case "DECREMENT":
				count -= Number(message.payload)
				break
			case "GET":
				message.resolve?.(count)
				break
			case "LOGGER": {
				const { replyTo } = message
				if (!replyTo) return
				replyTo.send({ type: "RESULT", payload: count })
				break
			}
		}
	})
}

function createLoggerActor() {
	return new Actor((message) => {
		const { type, payload } = message
		if (type !== "RESULT") return
		console.log(`[LOGGER]: ${payload}`)
	})
}

const logger = createLoggerActor()

async function init() {
	const counter = createCounterActor()
	counter.send({ type: "INCREMENT", payload: "4" })
	counter.send({ type: "INCREMENT", payload: "2" })
	counter.send({ type: "INCREMENT", payload: "5" })
	const ask = await counter.ask({ type: "GET" })
	counter.send({ type: "LOGGER", replyTo: logger })
	console.log(ask)
}

init()
