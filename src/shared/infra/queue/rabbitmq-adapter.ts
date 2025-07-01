import amqp from 'amqplib'
import { injectable } from 'inversify'

import { LazyInject } from '../decorator/lazy-inject'
import { Logger as LoggerDecorate } from '../decorator/logger'
import { env } from '../env'
import { SHARED_TYPES } from '../ioc/types'
import type { Logger } from '../logger/logger'
import type { Queue } from './queue'

@injectable()
export class RabbitMQAdapter implements Queue {
  private connection?: amqp.ChannelModel
  private _channel?: amqp.Channel
  private readonly logger: Logger = LazyInject(SHARED_TYPES.Logger)

  @LoggerDecorate({
    message: '✅',
  })
  public async connect(): Promise<void> {
    this.connection = await amqp.connect(env.AMQP_URL)
  }

  public async close(): Promise<void> {
    this.assertConnection(this.connection)
    await this.connection.close()
  }

  public async publish<TData>(exchange: string, data: TData): Promise<void> {
    const channel = await this.channel()
    await channel.assertExchange(exchange, 'direct', { durable: true })
    const buffer = Buffer.from(JSON.stringify(data))
    this.logger.info(this, { exchange })
    channel.publish(exchange, '', buffer)
  }
  private async channel(): Promise<amqp.Channel> {
    if (!this._channel) {
      this._channel = await this.createChannel()
    }
    return this._channel
  }

  private assertConnection(
    connection?: amqp.ChannelModel,
  ): asserts connection is amqp.ChannelModel {
    if (!connection) {
      throw new Error('Connection not established')
    }
  }

  public createChannel(): Promise<amqp.Channel> {
    this.assertConnection(this.connection)
    return this.connection.createChannel()
  }

  public async consume(
    queue: string,
    callback: CallableFunction,
  ): Promise<void> {
    const channel = await this.channel()
    await channel.consume(
      queue,
      async (data: amqp.ConsumeMessage | null): Promise<void> => {
        if (!data) return
        const message = this.parseData(data)
        await callback(message)
        channel.ack(data)
      },
    )
  }

  private parseData<TData>(data: amqp.ConsumeMessage): TData {
    try {
      return JSON.parse(data.content.toString())
    } catch {
      return data.content.toString() as unknown as TData
    }
  }
}
