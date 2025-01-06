import 'reflect-metadata'

import type { Channel } from 'amqplib'

import { container } from '../ioc/container'
import { TYPES } from '../ioc/types'
import { EXCHANGES } from './exchanges'
import { QUEUES } from './queues'
import type { RabbitMQAdapter } from './rabbitmq-adapter'

async function queueSetup() {
  const queue = container.get<RabbitMQAdapter>(TYPES.Queue)
  await queue.connect()
  const channel = await queue.createChannel()
  // Create exchanges
  await createExchange(channel, EXCHANGES.USER_CREATED)
  await createExchange(channel, EXCHANGES.LOG)
  await createExchange(channel, EXCHANGES.PASSWORD_CHANGED)
  //  Create queues
  await createQueue(channel, QUEUES.SEND_WELCOME_EMAIL)
  await createQueue(channel, QUEUES.LOG)
  await createQueue(channel, QUEUES.NOTIFY_PASSWORD_CHANGED)
  // Bind queues to exchanges
  await bindQueueToExchange(
    channel,
    QUEUES.SEND_WELCOME_EMAIL,
    EXCHANGES.USER_CREATED,
  )
  await bindQueueToExchange(channel, QUEUES.LOG, EXCHANGES.LOG)
  // Close connection
  await channel.close()
  await queue.close()
}

async function createExchange(
  channel: Channel,
  exchange: string,
): Promise<void> {
  await channel.assertExchange(exchange, 'direct', { durable: true })
}

async function createQueue(channel: Channel, queue: string): Promise<void> {
  await channel.assertQueue(queue, { durable: true })
}

async function bindQueueToExchange(
  channel: Channel,
  queue: string,
  exchange: string,
): Promise<void> {
  await channel.bindQueue(queue, exchange, '')
}

queueSetup()
