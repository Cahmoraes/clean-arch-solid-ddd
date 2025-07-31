# AMQPlib

## Visão Geral

AMQPlib é a biblioteca oficial do Node.js para RabbitMQ (AMQP 0-9-1). No projeto, é usada para implementar filas de mensagens assíncronas, processamento de background jobs e comunicação entre serviços.

## Configuração no Projeto

### Versão
- **amqplib**: 0.10.4

### Instalação
```bash
npm install amqplib
npm install --save-dev @types/amqplib
```

## Implementação no Projeto

### 1. Connection Service
```typescript
// src/infra/queue/rabbitmq-connection.ts
import amqp, { Connection, Channel } from 'amqplib'
import { injectable } from 'inversify'
import { env } from '@/infra/env'

@injectable()
export class RabbitMQConnection {
  private connection: Connection | null = null
  private channels: Map<string, Channel> = new Map()

  async connect(): Promise<Connection> {
    if (this.connection) {
      return this.connection
    }

    try {
      this.connection = await amqp.connect(env.RABBITMQ_URL)
      
      // Event listeners para reconexão
      this.connection.on('error', (error) => {
        console.error('RabbitMQ connection error:', error)
        this.connection = null
      })

      this.connection.on('close', () => {
        console.log('RabbitMQ connection closed')
        this.connection = null
        // Implementar lógica de reconexão se necessário
      })

      console.log('Connected to RabbitMQ')
      return this.connection
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error)
      throw error
    }
  }

  async createChannel(name: string = 'default'): Promise<Channel> {
    const connection = await this.connect()
    
    if (this.channels.has(name)) {
      return this.channels.get(name)!
    }

    const channel = await connection.createChannel()
    
    // Configurar QoS para controle de concorrência
    await channel.prefetch(10) // Processar até 10 mensagens por vez
    
    this.channels.set(name, channel)
    return channel
  }

  async getChannel(name: string = 'default'): Promise<Channel> {
    if (this.channels.has(name)) {
      return this.channels.get(name)!
    }
    
    return this.createChannel(name)
  }

  async closeChannel(name: string): Promise<void> {
    const channel = this.channels.get(name)
    if (channel) {
      await channel.close()
      this.channels.delete(name)
    }
  }

  async closeConnection(): Promise<void> {
    // Fechar todos os channels
    for (const [name, channel] of this.channels) {
      await channel.close()
    }
    this.channels.clear()

    // Fechar conexão
    if (this.connection) {
      await this.connection.close()
      this.connection = null
    }
  }
}
```

### 2. Queue Service Interface
```typescript
// src/infra/queue/queue-service.ts
export interface QueueService {
  publish<T>(queue: string, message: T, options?: PublishOptions): Promise<void>
  consume<T>(queue: string, handler: MessageHandler<T>, options?: ConsumeOptions): Promise<void>
  purgeQueue(queue: string): Promise<void>
  getQueueInfo(queue: string): Promise<QueueInfo>
}

export interface PublishOptions {
  persistent?: boolean
  priority?: number
  expiration?: string
  delay?: number
  exchange?: string
  routingKey?: string
}

export interface ConsumeOptions {
  autoAck?: boolean
  prefetch?: number
  exclusive?: boolean
  priority?: number
}

export interface MessageHandler<T> {
  (message: T, context: MessageContext): Promise<void>
}

export interface MessageContext {
  ack(): void
  nack(requeue?: boolean): void
  reject(requeue?: boolean): void
  getFields(): any
  getProperties(): any
}

export interface QueueInfo {
  messageCount: number
  consumerCount: number
}
```

### 3. RabbitMQ Implementation
```typescript
// src/infra/queue/rabbitmq-service.ts
import { Channel, ConsumeMessage } from 'amqplib'
import { injectable, inject } from 'inversify'
import { TYPES } from '@/infra/ioc/types'
import { RabbitMQConnection } from './rabbitmq-connection'
import { QueueService, MessageHandler, PublishOptions, ConsumeOptions, MessageContext, QueueInfo } from './queue-service'

@injectable()
export class RabbitMQService implements QueueService {
  constructor(
    @inject(TYPES.RabbitMQConnection)
    private connection: RabbitMQConnection
  ) {}

  async publish<T>(
    queue: string, 
    message: T, 
    options: PublishOptions = {}
  ): Promise<void> {
    const channel = await this.connection.getChannel()
    
    // Garantir que a queue existe
    await channel.assertQueue(queue, {
      durable: true, // Persistir queue após restart do RabbitMQ
      arguments: {
        'x-queue-type': 'classic' // Tipo de queue clássica
      }
    })

    const messageBuffer = Buffer.from(JSON.stringify(message))
    
    const publishOptions = {
      persistent: options.persistent ?? true,
      priority: options.priority,
      expiration: options.expiration,
      timestamp: Date.now(),
      messageId: this.generateMessageId(),
      correlationId: this.generateCorrelationId()
    }

    // Aplicar delay se especificado
    if (options.delay && options.delay > 0) {
      await this.publishDelayed(queue, messageBuffer, publishOptions, options.delay)
    } else if (options.exchange && options.routingKey) {
      // Publicar via exchange
      await channel.assertExchange(options.exchange, 'direct', { durable: true })
      await channel.publish(options.exchange, options.routingKey, messageBuffer, publishOptions)
    } else {
      // Publicar diretamente na queue
      await channel.sendToQueue(queue, messageBuffer, publishOptions)
    }
  }

  private async publishDelayed(
    queue: string,
    message: Buffer,
    options: any,
    delay: number
  ): Promise<void> {
    const channel = await this.connection.getChannel()
    const delayedQueue = `${queue}.delayed`
    const deadLetterExchange = `${queue}.dlx`

    // Criar exchange de dead letter
    await channel.assertExchange(deadLetterExchange, 'direct', { durable: true })

    // Criar queue com TTL para delay
    await channel.assertQueue(delayedQueue, {
      durable: true,
      arguments: {
        'x-message-ttl': delay,
        'x-dead-letter-exchange': deadLetterExchange,
        'x-dead-letter-routing-key': queue
      }
    })

    // Bind queue original ao exchange
    await channel.bindQueue(queue, deadLetterExchange, queue)

    // Publicar na queue de delay
    await channel.sendToQueue(delayedQueue, message, options)
  }

  async consume<T>(
    queue: string,
    handler: MessageHandler<T>,
    options: ConsumeOptions = {}
  ): Promise<void> {
    const channel = await this.connection.getChannel()

    // Garantir que a queue existe
    await channel.assertQueue(queue, {
      durable: true,
      arguments: {
        'x-queue-type': 'classic'
      }
    })

    // Configurar prefetch se especificado
    if (options.prefetch) {
      await channel.prefetch(options.prefetch)
    }

    await channel.consume(
      queue,
      async (msg: ConsumeMessage | null) => {
        if (!msg) {
          console.log('Consumer cancelled by server')
          return
        }

        try {
          const message: T = JSON.parse(msg.content.toString())
          
          const context: MessageContext = {
            ack: () => channel.ack(msg),
            nack: (requeue = false) => channel.nack(msg, false, requeue),
            reject: (requeue = false) => channel.reject(msg, requeue),
            getFields: () => msg.fields,
            getProperties: () => msg.properties
          }

          await handler(message, context)

          // Auto-ack se habilitado
          if (options.autoAck !== false) {
            context.ack()
          }
        } catch (error) {
          console.error(`Error processing message from queue ${queue}:`, error)
          
          // Rejeitar mensagem e enviar para DLQ
          channel.nack(msg, false, false)
        }
      },
      {
        noAck: options.autoAck === true,
        exclusive: options.exclusive,
        priority: options.priority
      }
    )
  }

  async purgeQueue(queue: string): Promise<void> {
    const channel = await this.connection.getChannel()
    await channel.purgeQueue(queue)
  }

  async getQueueInfo(queue: string): Promise<QueueInfo> {
    const channel = await this.connection.getChannel()
    const info = await channel.checkQueue(queue)
    
    return {
      messageCount: info.messageCount,
      consumerCount: info.consumerCount
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}
```

## Queue Definitions

### 1. Queue Types
```typescript
// src/infra/queue/queue-types.ts
export const QUEUE_NAMES = {
  // User operations
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  
  // Email operations  
  EMAIL_SEND: 'email.send',
  EMAIL_WELCOME: 'email.welcome',
  EMAIL_PASSWORD_RESET: 'email.password-reset',
  
  // Check-in operations
  CHECKIN_CREATED: 'checkin.created',
  CHECKIN_VALIDATED: 'checkin.validated',
  
  // Gym operations
  GYM_CREATED: 'gym.created',
  GYM_UPDATED: 'gym.updated',
  
  // Notification operations
  NOTIFICATION_SEND: 'notification.send',
  NOTIFICATION_PUSH: 'notification.push',
  
  // Reports
  REPORT_GENERATE: 'report.generate',
  REPORT_DAILY: 'report.daily',
  REPORT_MONTHLY: 'report.monthly',
  
  // Background jobs
  CLEANUP_EXPIRED_TOKENS: 'cleanup.expired-tokens',
  BACKUP_DATABASE: 'backup.database'
} as const

export type QueueName = typeof QUEUE_NAMES[keyof typeof QUEUE_NAMES]
```

### 2. Message Types
```typescript
// src/infra/queue/message-types.ts
export interface UserCreatedMessage {
  userId: string
  email: string
  name: string
  createdAt: string
}

export interface UserUpdatedMessage {
  userId: string
  changes: Record<string, any>
  updatedAt: string
}

export interface EmailMessage {
  to: string
  subject: string
  template: string
  data: Record<string, any>
  priority?: 'low' | 'normal' | 'high'
}

export interface CheckinCreatedMessage {
  checkinId: string
  userId: string
  gymId: string
  latitude: number
  longitude: number
  createdAt: string
}

export interface NotificationMessage {
  userId: string
  title: string
  body: string
  data?: Record<string, any>
  channels: Array<'push' | 'email' | 'sms'>
}

export interface ReportGenerateMessage {
  type: 'daily' | 'monthly' | 'yearly'
  startDate: string
  endDate: string
  userId?: string
  gymId?: string
  format: 'pdf' | 'csv' | 'json'
}
```

## Message Publishers

### 1. User Event Publisher
```typescript
// src/application/user/user-event-publisher.ts
import { injectable, inject } from 'inversify'
import { TYPES } from '@/infra/ioc/types'
import { QueueService } from '@/infra/queue/queue-service'
import { QUEUE_NAMES } from '@/infra/queue/queue-types'
import { UserCreatedMessage, UserUpdatedMessage } from '@/infra/queue/message-types'
import { User } from '@/domain/user/user'

@injectable()
export class UserEventPublisher {
  constructor(
    @inject(TYPES.QueueService)
    private queueService: QueueService
  ) {}

  async publishUserCreated(user: User): Promise<void> {
    const message: UserCreatedMessage = {
      userId: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString()
    }

    await this.queueService.publish(QUEUE_NAMES.USER_CREATED, message, {
      priority: 5 // Alta prioridade para eventos de usuário
    })
  }

  async publishUserUpdated(userId: string, changes: Record<string, any>): Promise<void> {
    const message: UserUpdatedMessage = {
      userId,
      changes,
      updatedAt: new Date().toISOString()
    }

    await this.queueService.publish(QUEUE_NAMES.USER_UPDATED, message)
  }
}
```

### 2. Email Publisher
```typescript
// src/application/email/email-publisher.ts
import { injectable, inject } from 'inversify'
import { TYPES } from '@/infra/ioc/types'
import { QueueService } from '@/infra/queue/queue-service'
import { QUEUE_NAMES } from '@/infra/queue/queue-types'
import { EmailMessage } from '@/infra/queue/message-types'

@injectable()
export class EmailPublisher {
  constructor(
    @inject(TYPES.QueueService)
    private queueService: QueueService
  ) {}

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const message: EmailMessage = {
      to: email,
      subject: 'Welcome to GymPass!',
      template: 'welcome',
      data: { name },
      priority: 'high'
    }

    await this.queueService.publish(QUEUE_NAMES.EMAIL_WELCOME, message, {
      priority: 8 // Prioridade alta para emails de boas-vindas
    })
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const message: EmailMessage = {
      to: email,
      subject: 'Password Reset Request',
      template: 'password-reset',
      data: { token, resetUrl: `${process.env.APP_URL}/reset-password?token=${token}` },
      priority: 'high'
    }

    await this.queueService.publish(QUEUE_NAMES.EMAIL_PASSWORD_RESET, message, {
      priority: 9, // Prioridade muito alta para reset de senha
      expiration: '3600000' // Expira em 1 hora
    })
  }

  async sendEmail(message: EmailMessage): Promise<void> {
    const priority = this.getPriorityValue(message.priority || 'normal')
    
    await this.queueService.publish(QUEUE_NAMES.EMAIL_SEND, message, {
      priority,
      persistent: true
    })
  }

  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'low': return 3
      case 'normal': return 5
      case 'high': return 8
      default: return 5
    }
  }
}
```

## Message Consumers

### 1. Email Consumer
```typescript
// src/infra/queue/consumers/email-consumer.ts
import { injectable, inject } from 'inversify'
import { TYPES } from '@/infra/ioc/types'
import { QueueService } from '@/infra/queue/queue-service'
import { QUEUE_NAMES } from '@/infra/queue/queue-types'
import { EmailMessage } from '@/infra/queue/message-types'
import { EmailService } from '@/application/email/email-service'
import { MessageContext } from '@/infra/queue/queue-service'

@injectable()
export class EmailConsumer {
  constructor(
    @inject(TYPES.QueueService)
    private queueService: QueueService,
    
    @inject(TYPES.EmailService)
    private emailService: EmailService
  ) {}

  async start(): Promise<void> {
    // Consumer para email geral
    await this.queueService.consume<EmailMessage>(
      QUEUE_NAMES.EMAIL_SEND,
      this.handleEmailSend.bind(this),
      {
        prefetch: 5, // Processar até 5 emails por vez
        autoAck: false // Manual acknowledgment
      }
    )

    // Consumer para email de boas-vindas
    await this.queueService.consume<EmailMessage>(
      QUEUE_NAMES.EMAIL_WELCOME,
      this.handleWelcomeEmail.bind(this),
      {
        prefetch: 3,
        autoAck: false
      }
    )

    // Consumer para reset de senha
    await this.queueService.consume<EmailMessage>(
      QUEUE_NAMES.EMAIL_PASSWORD_RESET,
      this.handlePasswordResetEmail.bind(this),
      {
        prefetch: 10, // Processar rapidamente resets de senha
        autoAck: false
      }
    )
  }

  private async handleEmailSend(message: EmailMessage, context: MessageContext): Promise<void> {
    try {
      await this.emailService.sendEmail({
        to: message.to,
        subject: message.subject,
        template: message.template,
        data: message.data
      })

      console.log(`Email sent successfully to ${message.to}`)
      context.ack()
    } catch (error) {
      console.error(`Failed to send email to ${message.to}:`, error)
      
      // Verificar se é erro temporário ou permanente
      if (this.isTemporaryError(error)) {
        // Requeue para tentar novamente
        context.nack(true)
      } else {
        // Erro permanente, não requeue
        context.nack(false)
      }
    }
  }

  private async handleWelcomeEmail(message: EmailMessage, context: MessageContext): Promise<void> {
    try {
      await this.emailService.sendWelcomeEmail(message.to, message.data.name)
      context.ack()
    } catch (error) {
      console.error(`Failed to send welcome email:`, error)
      context.nack(this.isTemporaryError(error))
    }
  }

  private async handlePasswordResetEmail(message: EmailMessage, context: MessageContext): Promise<void> {
    try {
      await this.emailService.sendPasswordResetEmail(
        message.to, 
        message.data.token,
        message.data.resetUrl
      )
      context.ack()
    } catch (error) {
      console.error(`Failed to send password reset email:`, error)
      context.nack(this.isTemporaryError(error))
    }
  }

  private isTemporaryError(error: any): boolean {
    // Verificar se é erro de rede, timeout, etc.
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' ||
           error.code === 'ENOTFOUND' ||
           (error.response && error.response.status >= 500)
  }
}
```

### 2. User Event Consumer
```typescript
// src/infra/queue/consumers/user-event-consumer.ts
import { injectable, inject } from 'inversify'
import { TYPES } from '@/infra/ioc/types'
import { QueueService } from '@/infra/queue/queue-service'
import { QUEUE_NAMES } from '@/infra/queue/queue-types'
import { UserCreatedMessage, UserUpdatedMessage } from '@/infra/queue/message-types'
import { EmailPublisher } from '@/application/email/email-publisher'
import { NotificationService } from '@/application/notification/notification-service'
import { MessageContext } from '@/infra/queue/queue-service'

@injectable()
export class UserEventConsumer {
  constructor(
    @inject(TYPES.QueueService)
    private queueService: QueueService,
    
    @inject(TYPES.EmailPublisher)
    private emailPublisher: EmailPublisher,
    
    @inject(TYPES.NotificationService)
    private notificationService: NotificationService
  ) {}

  async start(): Promise<void> {
    await this.queueService.consume<UserCreatedMessage>(
      QUEUE_NAMES.USER_CREATED,
      this.handleUserCreated.bind(this),
      {
        prefetch: 10,
        autoAck: false
      }
    )

    await this.queueService.consume<UserUpdatedMessage>(
      QUEUE_NAMES.USER_UPDATED,
      this.handleUserUpdated.bind(this),
      {
        prefetch: 15,
        autoAck: false
      }
    )
  }

  private async handleUserCreated(message: UserCreatedMessage, context: MessageContext): Promise<void> {
    try {
      // Enviar email de boas-vindas
      await this.emailPublisher.sendWelcomeEmail(message.email, message.name)
      
      // Enviar notificação de boas-vindas
      await this.notificationService.sendWelcomeNotification(message.userId)
      
      // Registrar analytics
      await this.registerUserCreatedAnalytics(message)
      
      console.log(`Processed user created event for user ${message.userId}`)
      context.ack()
    } catch (error) {
      console.error(`Failed to process user created event:`, error)
      context.nack(true) // Requeue para tentar novamente
    }
  }

  private async handleUserUpdated(message: UserUpdatedMessage, context: MessageContext): Promise<void> {
    try {
      // Verificar se email foi alterado
      if (message.changes.email) {
        await this.handleEmailChanged(message.userId, message.changes.email)
      }
      
      // Verificar se senha foi alterada
      if (message.changes.password) {
        await this.handlePasswordChanged(message.userId)
      }
      
      console.log(`Processed user updated event for user ${message.userId}`)
      context.ack()
    } catch (error) {
      console.error(`Failed to process user updated event:`, error)
      context.nack(true)
    }
  }

  private async registerUserCreatedAnalytics(message: UserCreatedMessage): Promise<void> {
    // Implementar registro de analytics
    console.log(`User analytics registered for ${message.userId}`)
  }

  private async handleEmailChanged(userId: string, newEmail: string): Promise<void> {
    // Enviar confirmação de alteração de email
    await this.emailPublisher.sendEmail({
      to: newEmail,
      subject: 'Email Changed Successfully',
      template: 'email-changed',
      data: { userId },
      priority: 'high'
    })
  }

  private async handlePasswordChanged(userId: string): Promise<void> {
    // Enviar notificação de alteração de senha
    await this.notificationService.sendPasswordChangedNotification(userId)
  }
}
```

## Consumer Manager

### 1. Consumer Bootstrap
```typescript
// src/bootstrap/setup-queue-consumers.ts
import { Container } from 'inversify'
import { TYPES } from '@/infra/ioc/types'
import { EmailConsumer } from '@/infra/queue/consumers/email-consumer'
import { UserEventConsumer } from '@/infra/queue/consumers/user-event-consumer'
import { ReportConsumer } from '@/infra/queue/consumers/report-consumer'

export async function setupQueueConsumers(container: Container): Promise<void> {
  console.log('Starting queue consumers...')

  try {
    // Email consumer
    const emailConsumer = container.get<EmailConsumer>(TYPES.EmailConsumer)
    await emailConsumer.start()
    console.log('Email consumer started')

    // User event consumer
    const userEventConsumer = container.get<UserEventConsumer>(TYPES.UserEventConsumer)
    await userEventConsumer.start()
    console.log('User event consumer started')

    // Report consumer
    const reportConsumer = container.get<ReportConsumer>(TYPES.ReportConsumer)
    await reportConsumer.start()
    console.log('Report consumer started')

    console.log('All queue consumers started successfully')
  } catch (error) {
    console.error('Failed to start queue consumers:', error)
    throw error
  }
}

// Graceful shutdown
export async function shutdownQueueConsumers(container: Container): Promise<void> {
  console.log('Shutting down queue consumers...')

  try {
    const connection = container.get<RabbitMQConnection>(TYPES.RabbitMQConnection)
    await connection.closeConnection()
    console.log('Queue consumers shut down successfully')
  } catch (error) {
    console.error('Error shutting down queue consumers:', error)
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  console.log('Received SIGINT, gracefully shutting down...')
  await shutdownQueueConsumers(container)
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, gracefully shutting down...')
  await shutdownQueueConsumers(container)
  process.exit(0)
})
```

## Dead Letter Queues

### 1. DLQ Configuration
```typescript
// src/infra/queue/dead-letter-queue.ts
import { injectable, inject } from 'inversify'
import { TYPES } from '@/infra/ioc/types'
import { RabbitMQConnection } from './rabbitmq-connection'

@injectable()
export class DeadLetterQueueService {
  constructor(
    @inject(TYPES.RabbitMQConnection)
    private connection: RabbitMQConnection
  ) {}

  async setupDLQ(originalQueue: string): Promise<void> {
    const channel = await this.connection.getChannel()
    const dlqName = `${originalQueue}.dlq`
    const dlxName = `${originalQueue}.dlx`

    // Criar exchange para dead letters
    await channel.assertExchange(dlxName, 'direct', { durable: true })

    // Criar dead letter queue
    await channel.assertQueue(dlqName, {
      durable: true,
      arguments: {
        'x-message-ttl': 86400000, // 24 horas
        'x-max-length': 10000 // Máximo 10k mensagens
      }
    })

    // Bind DLQ ao exchange
    await channel.bindQueue(dlqName, dlxName, originalQueue)

    // Configurar queue original com DLX
    await channel.assertQueue(originalQueue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': dlxName,
        'x-dead-letter-routing-key': originalQueue
      }
    })
  }

  async processDLQ(dlqName: string): Promise<void> {
    const channel = await this.connection.getChannel()
    
    await channel.consume(dlqName, async (msg) => {
      if (!msg) return

      try {
        const message = JSON.parse(msg.content.toString())
        console.log('Processing DLQ message:', message)
        
        // Implementar lógica de processamento manual
        // ou reenvio para queue original
        
        channel.ack(msg)
      } catch (error) {
        console.error('Error processing DLQ message:', error)
        channel.nack(msg, false, false)
      }
    })
  }

  async requeue(dlqName: string, originalQueue: string, messageId?: string): Promise<void> {
    const channel = await this.connection.getChannel()
    
    // Se messageId especificado, requeue apenas essa mensagem
    // Caso contrário, requeue todas as mensagens da DLQ
    
    console.log(`Requeuing messages from ${dlqName} to ${originalQueue}`)
  }
}
```

## Monitoring e Health Check

### 1. Queue Health Service
```typescript
// src/infra/queue/queue-health.ts
import { injectable, inject } from 'inversify'
import { TYPES } from '@/infra/ioc/types'
import { QueueService } from './queue-service'
import { QUEUE_NAMES } from './queue-types'

interface QueueHealthInfo {
  queueName: string
  messageCount: number
  consumerCount: number
  status: 'healthy' | 'warning' | 'critical'
}

@injectable()
export class QueueHealthService {
  constructor(
    @inject(TYPES.QueueService)
    private queueService: QueueService
  ) {}

  async checkHealth(): Promise<QueueHealthInfo[]> {
    const healthInfo: QueueHealthInfo[] = []
    
    for (const queueName of Object.values(QUEUE_NAMES)) {
      try {
        const info = await this.queueService.getQueueInfo(queueName)
        
        let status: 'healthy' | 'warning' | 'critical' = 'healthy'
        
        // Determinar status baseado em métricas
        if (info.consumerCount === 0) {
          status = 'critical' // Sem consumers
        } else if (info.messageCount > 1000) {
          status = 'warning' // Muitas mensagens pendentes
        } else if (info.messageCount > 10000) {
          status = 'critical' // Queue muito cheia
        }
        
        healthInfo.push({
          queueName,
          messageCount: info.messageCount,
          consumerCount: info.consumerCount,
          status
        })
      } catch (error) {
        healthInfo.push({
          queueName,
          messageCount: -1,
          consumerCount: -1,
          status: 'critical'
        })
      }
    }
    
    return healthInfo
  }

  async getMetrics(): Promise<Record<string, any>> {
    const healthInfo = await this.checkHealth()
    
    return {
      totalQueues: healthInfo.length,
      healthyQueues: healthInfo.filter(q => q.status === 'healthy').length,
      warningQueues: healthInfo.filter(q => q.status === 'warning').length,
      criticalQueues: healthInfo.filter(q => q.status === 'critical').length,
      totalMessages: healthInfo.reduce((sum, q) => sum + Math.max(0, q.messageCount), 0),
      totalConsumers: healthInfo.reduce((sum, q) => sum + Math.max(0, q.consumerCount), 0),
      queues: healthInfo
    }
  }
}
```

## Configuração no Container IoC

### 1. Queue Module Setup
```typescript
// src/bootstrap/setup-queue-module.ts
import { Container } from 'inversify'
import { TYPES } from '@/infra/ioc/types'
import { RabbitMQConnection } from '@/infra/queue/rabbitmq-connection'
import { RabbitMQService } from '@/infra/queue/rabbitmq-service'
import { QueueService } from '@/infra/queue/queue-service'
import { EmailConsumer } from '@/infra/queue/consumers/email-consumer'
import { UserEventConsumer } from '@/infra/queue/consumers/user-event-consumer'
import { DeadLetterQueueService } from '@/infra/queue/dead-letter-queue'
import { QueueHealthService } from '@/infra/queue/queue-health'

export function setupQueueModule(container: Container): void {
  // Connection
  container.bind<RabbitMQConnection>(TYPES.RabbitMQConnection)
    .to(RabbitMQConnection)
    .inSingletonScope()

  // Queue Service
  container.bind<QueueService>(TYPES.QueueService)
    .to(RabbitMQService)
    .inSingletonScope()

  // Consumers
  container.bind<EmailConsumer>(TYPES.EmailConsumer)
    .to(EmailConsumer)
    .inSingletonScope()

  container.bind<UserEventConsumer>(TYPES.UserEventConsumer)
    .to(UserEventConsumer)
    .inSingletonScope()

  // Services
  container.bind<DeadLetterQueueService>(TYPES.DeadLetterQueueService)
    .to(DeadLetterQueueService)
    .inSingletonScope()

  container.bind<QueueHealthService>(TYPES.QueueHealthService)
    .to(QueueHealthService)
    .inSingletonScope()
}
```

## Environment Configuration

### 1. Environment Variables
```env
# .env
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USERNAME=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_VHOST=/
RABBITMQ_HEARTBEAT=60
RABBITMQ_CONNECTION_TIMEOUT=10000
```

### 2. Docker Compose
```yaml
# compose.yaml
services:
  rabbitmq:
    image: rabbitmq:3.12-management-alpine
    container_name: gympass-rabbitmq
    ports:
      - "5672:5672"    # AMQP port
      - "15672:15672"  # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: admin
      RABBITMQ_DEFAULT_VHOST: /
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    networks:
      - gympass-network
    healthcheck:
      test: rabbitmq-diagnostics -q ping
      interval: 30s
      timeout: 30s
      retries: 3

volumes:
  rabbitmq_data:

networks:
  gympass-network:
    driver: bridge
```

## Links de Referência

- [AMQPlib Documentation](https://github.com/amqp-node/amqplib)
- [RabbitMQ Tutorials](https://www.rabbitmq.com/tutorials)
- [AMQP 0-9-1 Protocol](https://www.rabbitmq.com/tutorials/amqp-concepts.html)
- [RabbitMQ Management](https://www.rabbitmq.com/management.html)
