import "reflect-metadata"

import type { Channel } from "amqplib"

import { container } from "../ioc/container"
import { SHARED_TYPES } from "../ioc/types"
import { EXCHANGES } from "./exchanges"
import { QUEUES } from "./queues"
import type { RabbitMQAdapter } from "./rabbitmq-adapter"

async function queueSetup() {
	const queue = container.get<RabbitMQAdapter>(SHARED_TYPES.Queue)
	console.log(queue)
	await queue.connect()
	const channel = await queue.createChannel()
	// Create exchanges
	await createExchange(channel, EXCHANGES.USER_CREATED)
	await createExchange(channel, EXCHANGES.LOG)
	await createExchange(channel, EXCHANGES.PASSWORD_CHANGED)
	await createExchange(channel, EXCHANGES.CHECK_IN_CREATED)
	//  Create queues
	await createQueue(channel, QUEUES.SEND_WELCOME_EMAIL)
	await createQueue(channel, QUEUES.LOG)
	await createQueue(channel, QUEUES.NOTIFY_PASSWORD_CHANGED)
	await createQueue(channel, QUEUES.CHECK_IN)
	// Bind queues to exchanges
	await bindQueueToExchange(
		channel,
		QUEUES.SEND_WELCOME_EMAIL,
		EXCHANGES.USER_CREATED,
	)
	await bindQueueToExchange(channel, QUEUES.LOG, EXCHANGES.LOG)
	await bindQueueToExchange(
		channel,
		QUEUES.CHECK_IN,
		EXCHANGES.CHECK_IN_CREATED,
	)
	// Close connection
	await channel.close()
	await queue.close()
}

async function createExchange(
	channel: Channel,
	exchange: string,
): Promise<void> {
	await channel.assertExchange(exchange, "direct", { durable: true })
}

async function createQueue(channel: Channel, queue: string): Promise<void> {
	await channel.assertQueue(queue, { durable: true })
}

async function bindQueueToExchange(
	channel: Channel,
	queue: string,
	exchange: string,
): Promise<void> {
	await channel.bindQueue(queue, exchange, "")
}

queueSetup()
