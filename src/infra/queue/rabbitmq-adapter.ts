import amqp from 'amqplib'
import { injectable } from 'inversify'

import { Logger } from '../decorators/logger'
import { env } from '../env'
import type { Queue } from './queue'

@injectable()
export class RabbitMQAdapter implements Queue {
  private connection?: amqp.Connection

  @Logger({
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
    const channel = await this.createChannel()
    await channel.assertExchange(exchange, 'direct', { durable: true })
    const buffer = Buffer.from(JSON.stringify(data))
    console.log({ exchange })
    channel.publish(exchange, '', buffer)
  }

  private assertConnection(
    connection?: amqp.Connection,
  ): asserts connection is amqp.Connection {
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
    const channel = await this.createChannel()
    // await channel.assertQueue(queue, { durable: true })
    await channel.consume(
      queue,
      async (data: amqp.ConsumeMessage | null): Promise<void> => {
        if (!data) return
        const message = JSON.parse(data.content.toString())
        await callback(message)
        channel.ack(data)
      },
    )
  }
}
