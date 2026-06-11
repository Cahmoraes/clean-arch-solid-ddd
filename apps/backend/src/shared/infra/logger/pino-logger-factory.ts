import pino from "pino"
import { isDevelopment } from "../env/index.js"

export function createPinoLogger(): pino.Logger {
	const transport = isDevelopment()
		? {
				target: "pino-pretty",
				options: { colorize: true, translateTime: "SYS:standard" },
			}
		: undefined

	return pino({ level: "info", transport })
}
