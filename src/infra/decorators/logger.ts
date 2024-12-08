import type { Logger } from '../logger/logger'
import { WinstonAdapter } from '../logger/winston-adapter'

const logger = new WinstonAdapter()

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
      try {
        const result = await Reflect.apply(originalMethod, this, args)
        logger[loggerMethod](target, message)
        return result
      } catch (error: any) {
        logger.error(target, error)
        throw error
      }
    }
  }
}
