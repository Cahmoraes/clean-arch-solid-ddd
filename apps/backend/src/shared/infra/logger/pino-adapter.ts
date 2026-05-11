import { inject, injectable } from "inversify"
import type pino from "pino"
import { SHARED_TYPES } from "../ioc/types.js"
import type { Logger } from "./logger.js"

@injectable()
export class PinoAdapter implements Logger {
	constructor(
		@inject(SHARED_TYPES.PinoLogger)
		private readonly logger: pino.Logger,
	) {}

	public info(instance: object, message: string | object): void {
		this.logger.info(
			{ module: this.extractModuleName(instance) },
			this.formatMessage(message),
		)
	}

	public warn(instance: object, message: string | object): void {
		this.logger.warn(
			{ module: this.extractModuleName(instance) },
			this.formatMessage(message),
		)
	}

	public error(instance: object, message: string | object): void {
		this.logger.error(
			{ module: this.extractModuleName(instance) },
			this.formatMessage(message),
		)
	}

	private extractModuleName(instance: object): string {
		return (
			(instance as { constructor?: { name?: string } })?.constructor?.name ??
			"Unknown"
		)
	}

	private formatMessage(message: string | object): string {
		return typeof message === "object" ? JSON.stringify(message) : message
	}
}
