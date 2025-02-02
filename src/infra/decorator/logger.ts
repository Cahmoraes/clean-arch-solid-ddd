import { TYPES } from '../ioc/types'
import type { Logger } from '../logger/logger'
import { WinstonAdapter } from '../logger/winston-adapter'

export async function importLoggerWithLazyLoading(): Promise<WinstonAdapter> {
  const module = await import('../ioc/container')
  const container = module.container
  const logger = container.get<WinstonAdapter>(TYPES.Logger)
  return logger
}

export interface LoggerProps {
  type?: keyof Logger
  message: string
}

export function Logger({ message, type }: LoggerProps) {
  const loggerMethod = type ?? 'info'
  return function (
    target: any,
    propertyKey: PropertyKey,
    propertyDescriptor: PropertyDescriptor,
  ) {
    const originalMethod = propertyDescriptor.value
    propertyDescriptor.value = async function (...args: any[]) {
      const logger = await importLoggerWithLazyLoading()
      try {
        const result = await Reflect.apply(originalMethod, this, args)
        logger[loggerMethod](target, message)
        return result
      } catch (error: any) {
        logger.publish('error', error.message)
        throw error
      }
    }
  }
}
