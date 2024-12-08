import { injectable } from 'inversify'
import winston from 'winston'

import type { Logger } from './logger'

@injectable()
export class WinstonAdapter implements Logger {
  private readonly logger: winston.Logger

  constructor() {
    this.logger = winston.createLogger({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
      transports: [new winston.transports.Console()],
    })
  }

  public error(instance: object, message: string): void {
    this.logger.error(instance.constructor.name, {
      message: `- ${message}`,
    })
  }

  public warn(instance: object, message: string): void {
    this.logger.warn(instance.constructor.name, {
      message: `- ${message}`,
    })
  }

  public info(instance: object, message: string): void {
    this.logger.info(instance.constructor.name, {
      message: `- ${message}`,
    })
  }
}
