# Winston

## Visão Geral

Winston é uma biblioteca de logging para Node.js projetada para ser simples, universal e extremamente versátil. No projeto, é usado como sistema principal de logging com múltiplos transports e formatação customizada.

## Configuração no Projeto

### Versão
- **winston**: 3.19.0

### Setup Principal
```typescript
// src/infra/logger/winston-logger-service.ts
import winston, { Logger } from 'winston'
import { env } from '@/infra/env'

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
}

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'cyan',
  debug: 'blue'
}

winston.addColors(logColors)

export class WinstonLoggerService {
  private logger: Logger

  constructor() {
    this.logger = winston.createLogger({
      level: this.getLogLevel(),
      levels: logLevels,
      format: this.createFormat(),
      transports: this.createTransports(),
      exitOnError: false,
      handleExceptions: true,
      handleRejections: true
    })
  }

  private getLogLevel(): string {
    return env.NODE_ENV === 'development' ? 'debug' : 'info'
  }

  private createFormat() {
    const baseFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
    )

    if (env.NODE_ENV === 'development') {
      return winston.format.combine(
        baseFormat,
        winston.format.colorize({ all: true }),
        winston.format.printf(({ timestamp, level, message, metadata, stack }) => {
          let log = `[${timestamp}] ${level}: ${message}`
          
          if (Object.keys(metadata).length > 0) {
            log += `\n${JSON.stringify(metadata, null, 2)}`
          }
          
          if (stack) {
            log += `\n${stack}`
          }
          
          return log
        })
      )
    }

    return winston.format.combine(
      baseFormat,
      winston.format.json()
    )
  }

  private createTransports(): winston.transport[] {
    const transports: winston.transport[] = []

    // Console transport
    if (env.NODE_ENV === 'development') {
      transports.push(
        new winston.transports.Console({
          level: 'debug',
          handleExceptions: true,
          handleRejections: true
        })
      )
    } else {
      transports.push(
        new winston.transports.Console({
          level: 'info',
          format: winston.format.combine(
            winston.format.uncolorize(),
            winston.format.json()
          )
        })
      )
    }

    // File transports para produção
    if (env.NODE_ENV === 'production') {
      // Logs gerais
      transports.push(
        new winston.transports.File({
          filename: 'logs/combined.log',
          level: 'info',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          format: winston.format.json()
        })
      )

      // Logs de erro
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          format: winston.format.json()
        })
      )

      // Logs de HTTP requests
      transports.push(
        new winston.transports.File({
          filename: 'logs/http.log',
          level: 'http',
          maxsize: 5242880, // 5MB
          maxFiles: 3,
          format: winston.format.json()
        })
      )
    }

    return transports
  }

  // Métodos de logging
  error(message: string, meta?: any): void {
    this.logger.error(message, meta)
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta)
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta)
  }

  http(message: string, meta?: any): void {
    this.logger.http(message, meta)
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta)
  }

  // Método genérico
  log(level: string, message: string, meta?: any): void {
    this.logger.log(level, message, meta)
  }

  // Stream para integração com Morgan (HTTP logging)
  stream = {
    write: (message: string) => {
      this.http(message.trim())
    }
  }
}
```

## Integração com Inversify

### 1. Binding no Container
```typescript
// src/bootstrap/container.ts
import { WinstonLoggerService } from '@/infra/logger/winston-logger-service'
import { TYPES } from '@/infra/ioc/types'

container.bind<WinstonLoggerService>(TYPES.LoggerService)
  .to(WinstonLoggerService)
  .inSingletonScope()
```

### 2. Uso em Services
```typescript
// src/application/user/create-user-service.ts
import { injectable, inject } from 'inversify'
import { TYPES } from '@/infra/ioc/types'
import { WinstonLoggerService } from '@/infra/logger/winston-logger-service'

@injectable()
export class CreateUserService {
  constructor(
    @inject(TYPES.UserRepository)
    private userRepository: UserRepository,
    
    @inject(TYPES.LoggerService)
    private logger: WinstonLoggerService
  ) {}

  async execute(data: CreateUserDTO): Promise<User> {
    this.logger.info('Starting user creation process', { email: data.email })

    try {
      // Verificar se usuário já existe
      const existingUser = await this.userRepository.findByEmail(data.email)
      
      if (existingUser) {
        this.logger.warn('Attempt to create user with existing email', { 
          email: data.email,
          existingUserId: existingUser.id 
        })
        throw new UserAlreadyExistsError()
      }

      // Criar usuário
      const user = await this.userRepository.create(data)
      
      this.logger.info('User created successfully', { 
        userId: user.id,
        email: user.email 
      })

      return user
    } catch (error) {
      this.logger.error('Failed to create user', {
        email: data.email,
        error: error.message,
        stack: error.stack
      })
      throw error
    }
  }
}
```

## Middleware de Logging HTTP

### 1. Morgan Integration
```typescript
// src/infra/server/logging-middleware.ts
import morgan from 'morgan'
import { FastifyRequest, FastifyReply } from 'fastify'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'
import { WinstonLoggerService } from '@/infra/logger/winston-logger-service'

export function createLoggingMiddleware() {
  const logger = container.get<WinstonLoggerService>(TYPES.LoggerService)

  // Formato personalizado para requests HTTP
  const httpFormat = ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms'

  return morgan(httpFormat, {
    stream: logger.stream,
    skip: (req, res) => {
      // Pular health checks em produção
      if (req.url === '/health' && process.env.NODE_ENV === 'production') {
        return true
      }
      return false
    }
  })
}

// Plugin para Fastify
export async function loggingPlugin(fastify: FastifyInstance) {
  // Hook para logar requests
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const logger = fastify.container.get<WinstonLoggerService>(TYPES.LoggerService)
    
    logger.http('Incoming request', {
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      requestId: request.id
    })
  })

  // Hook para logar responses
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const logger = fastify.container.get<WinstonLoggerService>(TYPES.LoggerService)
    
    const responseTime = reply.getResponseTime()
    
    logger.http('Request completed', {
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      responseTime: `${responseTime}ms`,
      requestId: request.id
    })
  })
}
```

## Structured Logging

### 1. Contexto de Request
```typescript
// src/infra/middleware/request-context-middleware.ts
import { FastifyRequest, FastifyReply } from 'fastify'
import { randomUUID } from 'node:crypto'

export interface RequestContext {
  requestId: string
  userId?: string
  userEmail?: string
  ip: string
  userAgent: string
  startTime: number
}

declare module 'fastify' {
  interface FastifyRequest {
    context: RequestContext
  }
}

export async function requestContextMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.context = {
    requestId: randomUUID(),
    ip: request.ip,
    userAgent: request.headers['user-agent'] || 'unknown',
    startTime: Date.now()
  }

  // Adicionar contexto de usuário se autenticado
  if (request.user) {
    request.context.userId = request.user.sub
    request.context.userEmail = request.user.email
  }
}
```

### 2. Logger com Contexto
```typescript
// src/infra/logger/contextual-logger.ts
import { WinstonLoggerService } from './winston-logger-service'
import { RequestContext } from '@/infra/middleware/request-context-middleware'

export class ContextualLogger {
  constructor(
    private logger: WinstonLoggerService,
    private context: RequestContext
  ) {}

  private addContext(meta: any = {}) {
    return {
      ...meta,
      requestId: this.context.requestId,
      userId: this.context.userId,
      userEmail: this.context.userEmail,
      ip: this.context.ip
    }
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, this.addContext(meta))
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, this.addContext(meta))
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, this.addContext(meta))
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, this.addContext(meta))
  }

  http(message: string, meta?: any): void {
    this.logger.http(message, this.addContext(meta))
  }
}

// Factory para criar logger contextual
export function createContextualLogger(
  logger: WinstonLoggerService,
  context: RequestContext
): ContextualLogger {
  return new ContextualLogger(logger, context)
}
```

## Error Logging

### 1. Error Handler Global
```typescript
// src/infra/error/global-error-handler.ts
import { FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import { ZodError } from 'zod'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { WinstonLoggerService } from '@/infra/logger/winston-logger-service'
import { createContextualLogger } from '@/infra/logger/contextual-logger'

export function createGlobalErrorHandler(logger: WinstonLoggerService) {
  return async (
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const contextLogger = createContextualLogger(logger, request.context)

    // Log do erro com contexto completo
    const errorContext = {
      errorType: error.constructor.name,
      errorCode: error.code,
      method: request.method,
      url: request.url,
      body: request.body,
      params: request.params,
      query: request.query,
      headers: request.headers,
      stack: error.stack
    }

    if (error instanceof ZodError) {
      contextLogger.warn('Validation error', {
        ...errorContext,
        validationErrors: error.issues
      })

      return reply.status(400).send({
        error: 'Validation Error',
        message: 'Invalid request data',
        issues: error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code
        }))
      })
    }

    if (error instanceof PrismaClientKnownRequestError) {
      contextLogger.error('Database error', {
        ...errorContext,
        prismaCode: error.code,
        prismaMessage: error.message
      })

      return reply.status(500).send({
        error: 'Database Error',
        message: 'An error occurred while processing your request'
      })
    }

    // Errors customizados da aplicação
    if (error.statusCode && error.statusCode < 500) {
      contextLogger.warn('Application error', errorContext)

      return reply.status(error.statusCode).send({
        error: error.name,
        message: error.message
      })
    }

    // Errors internos do servidor
    contextLogger.error('Internal server error', errorContext)

    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred'
    })
  }
}
```

## Performance Logging

### 1. Métricas de Performance
```typescript
// src/infra/logger/performance-logger.ts
import { WinstonLoggerService } from './winston-logger-service'

export class PerformanceLogger {
  constructor(private logger: WinstonLoggerService) {}

  logDatabaseQuery(query: string, duration: number, params?: any) {
    if (duration > 1000) { // Log slow queries (> 1s)
      this.logger.warn('Slow database query detected', {
        query,
        duration: `${duration}ms`,
        params,
        category: 'performance'
      })
    } else {
      this.logger.debug('Database query completed', {
        query,
        duration: `${duration}ms`,
        category: 'performance'
      })
    }
  }

  logServiceExecution(service: string, method: string, duration: number, success: boolean) {
    const level = duration > 5000 ? 'warn' : 'debug' // Log slow services (> 5s)

    this.logger.log(level, 'Service execution completed', {
      service,
      method,
      duration: `${duration}ms`,
      success,
      category: 'performance'
    })
  }

  logMemoryUsage() {
    const memUsage = process.memoryUsage()
    
    this.logger.info('Memory usage snapshot', {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)} MB`,
      category: 'performance'
    })
  }
}
```

### 2. Decorator para Logging Automático
```typescript
// src/infra/decorator/log-execution.ts
import { performance } from 'perf_hooks'
import { container } from '@/infra/ioc/container'
import { TYPES } from '@/infra/ioc/types'
import { WinstonLoggerService } from '@/infra/logger/winston-logger-service'

export function LogExecution(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value

  descriptor.value = async function (...args: any[]) {
    const logger = container.get<WinstonLoggerService>(TYPES.LoggerService)
    const className = target.constructor.name
    const startTime = performance.now()

    logger.debug(`Executing ${className}.${propertyKey}`, {
      className,
      methodName: propertyKey,
      arguments: args.length,
      category: 'execution'
    })

    try {
      const result = await originalMethod.apply(this, args)
      const duration = performance.now() - startTime

      logger.debug(`Completed ${className}.${propertyKey}`, {
        className,
        methodName: propertyKey,
        duration: `${duration.toFixed(2)}ms`,
        success: true,
        category: 'execution'
      })

      return result
    } catch (error) {
      const duration = performance.now() - startTime

      logger.error(`Failed ${className}.${propertyKey}`, {
        className,
        methodName: propertyKey,
        duration: `${duration.toFixed(2)}ms`,
        success: false,
        error: error.message,
        category: 'execution'
      })

      throw error
    }
  }

  return descriptor
}

// Uso do decorator
@injectable()
export class UserService {
  @LogExecution
  async createUser(data: CreateUserDTO): Promise<User> {
    // implementação...
  }
}
```

## Configuração de Log Rotation

### 1. Daily Rotate File
```bash
# Instalar winston-daily-rotate-file
npm install winston-daily-rotate-file
```

```typescript
// src/infra/logger/daily-rotate-logger.ts
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

export function createDailyRotateTransports() {
  return [
    // Combined logs com rotação diária
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d', // manter logs por 14 dias
      level: 'info'
    }),

    // Error logs com rotação diária
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d', // manter error logs por 30 dias
      level: 'error'
    }),

    // Audit logs
    new DailyRotateFile({
      filename: 'logs/audit-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '50m',
      maxFiles: '90d', // manter audit logs por 90 dias
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
}
```

## Health Check com Logging

### 1. Health Check Service
```typescript
// src/application/health/health-check-service.ts
import { injectable, inject } from 'inversify'
import { TYPES } from '@/infra/ioc/types'
import { WinstonLoggerService } from '@/infra/logger/winston-logger-service'
import { PrismaService } from '@/infra/database/prisma-service'

@injectable()
export class HealthCheckService {
  constructor(
    @inject(TYPES.LoggerService)
    private logger: WinstonLoggerService,
    
    @inject(TYPES.PrismaService)
    private prisma: PrismaService
  ) {}

  async checkHealth() {
    const checks = {
      database: false,
      memory: false,
      uptime: process.uptime()
    }

    try {
      // Verificar banco de dados
      await this.prisma.$queryRaw`SELECT 1`
      checks.database = true
      this.logger.debug('Database health check passed')
    } catch (error) {
      this.logger.error('Database health check failed', { error: error.message })
    }

    // Verificar memória
    const memUsage = process.memoryUsage()
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100
    
    if (memUsagePercent < 90) {
      checks.memory = true
    } else {
      this.logger.warn('High memory usage detected', {
        memUsagePercent: `${memUsagePercent.toFixed(2)}%`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)} MB`
      })
    }

    const isHealthy = checks.database && checks.memory

    this.logger.info('Health check completed', {
      healthy: isHealthy,
      checks,
      timestamp: new Date().toISOString()
    })

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString()
    }
  }
}
```

## Configuração de Produção

### 1. Variáveis de Ambiente
```env
# .env
NODE_ENV=production
LOG_LEVEL=info
LOG_FILE_PATH=./logs
LOG_MAX_FILE_SIZE=20971520  # 20MB
LOG_MAX_FILES=5
LOG_COMPRESS=true
```

### 2. Docker Logging
```dockerfile
# Dockerfile
FROM node:18-alpine

# Criar diretório de logs
RUN mkdir -p /app/logs

# Configurar volume para logs
VOLUME ["/app/logs"]

# ...resto do Dockerfile
```

### 3. Docker Compose com Log Driver
```yaml
# compose.yaml
services:
  api:
    build: .
    volumes:
      - ./logs:/app/logs
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info
```

## Scripts de Monitoramento

### 1. Log Analysis Script
```typescript
// scripts/analyze-logs.ts
import fs from 'fs'
import path from 'path'

interface LogEntry {
  timestamp: string
  level: string
  message: string
  [key: string]: any
}

export function analyzeLogs(logFilePath: string) {
  const logs = fs.readFileSync(logFilePath, 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return JSON.parse(line) as LogEntry
      } catch {
        return null
      }
    })
    .filter(Boolean) as LogEntry[]

  const analysis = {
    totalLogs: logs.length,
    errorCount: logs.filter(log => log.level === 'error').length,
    warnCount: logs.filter(log => log.level === 'warn').length,
    topErrors: getTopErrors(logs),
    slowQueries: getSlowQueries(logs),
    requestVolume: getRequestVolume(logs)
  }

  console.log('Log Analysis Results:')
  console.log(JSON.stringify(analysis, null, 2))
}

function getTopErrors(logs: LogEntry[]) {
  const errors = logs.filter(log => log.level === 'error')
  const errorCounts = errors.reduce((acc, log) => {
    const key = log.message
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return Object.entries(errorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([message, count]) => ({ message, count }))
}

function getSlowQueries(logs: LogEntry[]) {
  return logs
    .filter(log => log.category === 'performance' && log.duration)
    .filter(log => parseInt(log.duration.replace('ms', '')) > 1000)
    .slice(0, 10)
}

function getRequestVolume(logs: LogEntry[]) {
  const httpLogs = logs.filter(log => log.level === 'http')
  const hourlyVolume = httpLogs.reduce((acc, log) => {
    const hour = new Date(log.timestamp).getHours()
    acc[hour] = (acc[hour] || 0) + 1
    return acc
  }, {} as Record<number, number>)

  return hourlyVolume
}
```

## Links de Referência

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Winston Transports](https://github.com/winstonjs/winston/blob/master/docs/transports.md)
- [Winston Formats](https://github.com/winstonjs/winston#formats)
- [Winston Daily Rotate File](https://github.com/winstonjs/winston-daily-rotate-file)
