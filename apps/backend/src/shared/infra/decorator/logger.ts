import { SHARED_TYPES } from "../ioc/types"
import type { Logger as ILogger } from "../logger/logger"

export async function importLoggerWithLazyLoading(): Promise<ILogger> {
	const module = await import("../ioc/container")
	const container = module.container
	const logger = container.get<ILogger>(SHARED_TYPES.Logger)
	return logger
}

export interface LoggerProps {
	type?: keyof ILogger
	message: string
}

export function Logger({ message, type }: LoggerProps) {
	const loggerMethod = type ?? "info"
	return (
		target: any,
		_propertyKey: PropertyKey,
		propertyDescriptor: PropertyDescriptor,
	) => {
		const originalMethod = propertyDescriptor.value
		propertyDescriptor.value = async function (...args: any[]) {
			const logger = await importLoggerWithLazyLoading()
			try {
				const result = await Reflect.apply(originalMethod, this, args)
				logger[loggerMethod](target, message)
				return result
			} catch (error: any) {
				logger.error(target, error.message)
				throw error
			}
		}
	}
}
