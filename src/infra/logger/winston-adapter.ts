import { injectable } from 'inversify'
import winston from 'winston'

import type { Logger } from './logger'

@injectable()
export class WinstonAdapter implements Logger {
  private readonly logger: winston.Logger

  constructor() {
    this.logger = winston.createLogger({
      format: winston.format.combine(...this.formats()),
      transports: [new winston.transports.Console()],
    })
  }

  private formats() {
    return [
      winston.format.colorize(),
      winston.format.printf(this.formatMessage),
    ]
  }

  private formatMessage(info: winston.Logform.TransformableInfo): string {
    const formattedMessage =
      typeof info.message === 'object'
        ? JSON.stringify(info.message, null, 2)
        : info.message
    return `${info.level}: ${info.instance || ''} ${formattedMessage}`
  }

  public error(instance: object, message: string | object): void {
    this.logger.error({
      instance: instance.constructor.name,
      message: message,
    })
  }

  public warn(instance: object, message: string | object): void {
    this.logger.warn({
      instance: instance.constructor.name,
      message: message,
    })
  }

  public info(instance: object, message: string | object): void {
    this.logger.info({
      instance: instance.constructor.name,
      message: message,
    })
  }
}
