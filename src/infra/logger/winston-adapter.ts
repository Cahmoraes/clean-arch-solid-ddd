import { inject, injectable } from 'inversify'
import winston from 'winston'

import { TYPES } from '../ioc/types'
import { EXCHANGES } from '../queue/exchanges'
import type { Queue } from '../queue/queue'
import type { Logger } from './logger'

@injectable()
export class WinstonAdapter implements Logger {
  private readonly logger: winston.Logger

  constructor(
    @inject(TYPES.Queue)
    private readonly queue: Queue,
  ) {
    this.logger = winston.createLogger({
      format: winston.format.combine(...this.formats()),
      transports: [],
    })
    this.enableConsoleTransport()
  }

  private formats() {
    return [
      winston.format.colorize(),
      winston.format.printf(this.formatMessage),
    ]
  }

  private enableConsoleTransport() {
    this.logger.add(
      new winston.transports.Console({
        format: winston.format.combine(...this.formats()),
      }),
    )
  }

  private formatMessage(info: winston.Logform.TransformableInfo): string {
    const level = info.level
    const instance = info.instance ?? ''
    const formattedMessage =
      typeof info.message === 'object'
        ? JSON.stringify(info.message, null, 2)
        : info.message
    return `${level}: ${instance} - ${formattedMessage}`
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

  public async publish(type: keyof Logger, message: string) {
    await this.queue.publish(EXCHANGES.LOG, {
      type,
      message,
    })
  }
}
