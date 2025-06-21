# 🚀 Health Check Bootstrap - Plano de Implementação

## 🎯 Objetivo

Integrar o sistema de Health Check com o bootstrap da aplicação para inicialização automática.

## 📁 Localização

`src/bootstrap/setup-health-module.ts`

## 📋 Atividades

### Passo 1: Criar Health Module Setup

- [ ] Criar função `setupHealthModule()`
- [ ] Carregar health container no container principal
- [ ] Resolver e retornar health controller
- [ ] Configurar logging de inicialização

### Passo 2: Integrar com Bootstrap Principal

- [ ] Importar health module no bootstrap principal
- [ ] Adicionar ao array de controllers
- [ ] Configurar ordem de inicialização
- [ ] Tratar erros de inicialização

### Passo 3: Configurar Inicialização Condicional

- [ ] Verificar se health check está habilitado
- [ ] Carregar apenas se configurado
- [ ] Fallback para modo degradado
- [ ] Logging adequado para cada cenário

### Passo 4: Implementar Health Check Auto-Start

- [ ] Executar health check inicial na inicialização
- [ ] Validar todos os serviços no startup
- [ ] Falhar fast se serviços críticos estão down
- [ ] Logging de status inicial

### Passo 5: Configurar Graceful Shutdown

- [ ] Cleanup de recursos do health check
- [ ] Fechar conexões dos providers
- [ ] Limpar cache e timers
- [ ] Logging de shutdown

## 📝 Implementação Detalhada

### Setup Health Module
```typescript
import { Container } from 'inversify'

import { healthContainer } from '@/shared/infra/ioc/module/health/health-container'
import { HealthCheckController } from '@/shared/infra/health/health-check.controller'
import { HealthCheckService } from '@/shared/infra/health/health-check.service'
import { TYPES } from '@/shared/infra/ioc/types'
import type { Controller } from '@/shared/infra/controller/controller'
import type { Logger } from '@/shared/infra/logger/logger'

export async function setupHealthModule(container: Container): Promise<Controller[]> {
  const logger = container.get<Logger>(TYPES.Logger)
  
  try {
    logger.info('🏥 Initializing Health Check module...')
    
    // Carregar health container
    container.load(healthContainer)
    
    // Verificar se health check está habilitado
    const isEnabled = process.env.HEALTH_CHECK_ENABLED !== 'false'
    
    if (!isEnabled) {
      logger.warn('Health Check module is disabled')
      return []
    }
    
    // Resolver controller
    const healthController = container.get<HealthCheckController>(
      TYPES.HealthCheck.Controller
    )
    
    // Executar health check inicial (opcional)
    await performInitialHealthCheck(container, logger)
    
    logger.info('✅ Health Check module initialized successfully')
    
    return [healthController]
    
  } catch (error) {
    logger.error('❌ Failed to initialize Health Check module', {
      error: error.message,
      stack: error.stack
    })
    
    // Decidir se deve falhar a aplicação ou continuar sem health check
    if (process.env.HEALTH_CHECK_REQUIRED === 'true') {
      throw error
    }
    
    logger.warn('Continuing without Health Check module')
    return []
  }
}
```

### Health Check Inicial
```typescript
async function performInitialHealthCheck(
  container: Container, 
  logger: Logger
): Promise<void> {
  try {
    const shouldPerformInitialCheck = process.env.HEALTH_CHECK_ON_STARTUP === 'true'
    
    if (!shouldPerformInitialCheck) {
      logger.debug('Skipping initial health check')
      return
    }
    
    logger.info('Performing initial health check...')
    
    const healthService = container.get<HealthCheckService>(
      TYPES.HealthCheck.Service
    )
    
    const healthStatus = await healthService.checkHealth()
    
    logger.info('Initial health check completed', {
      status: healthStatus.status,
      servicesUp: Object.values(healthStatus.services)
        .filter(service => service.status === 'up').length,
      servicesDown: Object.values(healthStatus.services)
        .filter(service => service.status === 'down').length
    })
    
    // Falhar se serviços críticos estão down
    const criticalServices = ['database']
    const criticalIssues = criticalServices.filter(serviceName => 
      healthStatus.services[serviceName]?.status === 'down'
    )
    
    if (criticalIssues.length > 0) {
      throw new Error(`Critical services are down: ${criticalIssues.join(', ')}`)
    }
    
  } catch (error) {
    logger.error('Initial health check failed', {
      error: error.message
    })
    
    if (process.env.FAIL_ON_UNHEALTHY_STARTUP === 'true') {
      throw error
    }
    
    logger.warn('Continuing with unhealthy services')
  }
}
```

### Integração com Bootstrap Principal
```typescript
// src/bootstrap/server-build.ts
import { setupHealthModule } from './setup-health-module'

export async function serverBuild(): Promise<FastifyInstance> {
  try {
    // Configurar container
    const container = getContainer()
    
    // Inicializar módulos
    const controllers = await Promise.all([
      setupUserModule(container),
      setupGymModule(container),
      setupCheckInModule(container),
      setupSessionModule(container),
      setupHealthModule(container), // ← Adicionar health module
    ])
    
    const allControllers = controllers.flat()
    
    // Inicializar controllers
    await initializeControllers(allControllers)
    
    return server
    
  } catch (error) {
    logger.error('Failed to build server', error)
    throw error
  }
}
```

### Health Check com Retry Logic
```typescript
async function performInitialHealthCheckWithRetry(
  container: Container,
  logger: Logger,
  maxRetries: number = 3,
  retryDelay: number = 2000
): Promise<void> {
  let attempt = 1
  
  while (attempt <= maxRetries) {
    try {
      logger.info(`Health check attempt ${attempt}/${maxRetries}`)
      
      const healthService = container.get<HealthCheckService>(
        TYPES.HealthCheck.Service
      )
      
      const healthStatus = await healthService.checkHealth()
      
      if (healthStatus.status === 'healthy') {
        logger.info('✅ Initial health check passed')
        return
      }
      
      if (attempt === maxRetries) {
        throw new Error(`Health check failed after ${maxRetries} attempts`)
      }
      
      logger.warn(`Health check attempt ${attempt} failed, retrying in ${retryDelay}ms`)
      await new Promise(resolve => setTimeout(resolve, retryDelay))
      
    } catch (error) {
      if (attempt === maxRetries) {
        throw error
      }
      
      logger.warn(`Health check attempt ${attempt} failed: ${error.message}`)
      await new Promise(resolve => setTimeout(resolve, retryDelay))
    }
    
    attempt++
  }
}
```

### Graceful Shutdown Integration
```typescript
// src/bootstrap/server-build.ts
export async function setupGracefulShutdown(
  server: FastifyInstance,
  container: Container
): Promise<void> {
  const logger = container.get<Logger>(TYPES.Logger)
  
  const gracefulShutdown = async (signal: string) => {
    logger.info(`🛑 Received ${signal}, starting graceful shutdown...`)
    
    try {
      // Cleanup health check resources
      await cleanupHealthCheck(container, logger)
      
      // Close server
      await server.close()
      
      logger.info('✅ Graceful shutdown completed')
      process.exit(0)
      
    } catch (error) {
      logger.error('❌ Error during graceful shutdown', error)
      process.exit(1)
    }
  }
  
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
  process.on('SIGINT', () => gracefulShutdown('SIGINT'))
}

async function cleanupHealthCheck(container: Container, logger: Logger): Promise<void> {
  try {
    logger.info('Cleaning up Health Check resources...')
    
    // Limpar cache
    const cache = container.get<Map<string, any>>(TYPES.HealthCheck.Cache)
    cache.clear()
    
    // Notificar providers para cleanup
    const providers = [
      container.get(TYPES.HealthCheck.Providers.Database),
      container.get(TYPES.HealthCheck.Providers.Email),
      container.get(TYPES.HealthCheck.Providers.RabbitMQ)
    ]
    
    await Promise.all(
      providers.map(async (provider) => {
        if (provider.cleanup && typeof provider.cleanup === 'function') {
          await provider.cleanup()
        }
      })
    )
    
    logger.info('Health Check cleanup completed')
    
  } catch (error) {
    logger.warn('Error during Health Check cleanup', error)
  }
}
```

### Environment Configuration
```typescript
interface HealthCheckBootstrapConfig {
  enabled: boolean
  required: boolean
  performInitialCheck: boolean
  failOnUnhealthyStartup: boolean
  maxRetries: number
  retryDelay: number
  endpoint: string
}

function getHealthCheckConfig(): HealthCheckBootstrapConfig {
  return {
    enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
    required: process.env.HEALTH_CHECK_REQUIRED === 'true',
    performInitialCheck: process.env.HEALTH_CHECK_ON_STARTUP === 'true',
    failOnUnhealthyStartup: process.env.FAIL_ON_UNHEALTHY_STARTUP === 'true',
    maxRetries: parseInt(process.env.HEALTH_CHECK_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.HEALTH_CHECK_RETRY_DELAY || '2000'),
    endpoint: process.env.HEALTH_CHECK_ENDPOINT || '/health'
  }
}

export async function setupHealthModule(container: Container): Promise<Controller[]> {
  const config = getHealthCheckConfig()
  const logger = container.get<Logger>(TYPES.Logger)
  
  if (!config.enabled) {
    logger.info('Health Check module is disabled')
    return []
  }
  
  // Rest of the implementation using config...
}
```

### Health Check Middleware (Opcional)
```typescript
export function setupHealthCheckMiddleware(
  server: FastifyInstance,
  container: Container
): void {
  const logger = container.get<Logger>(TYPES.Logger)
  
  // Middleware para logar requests de health check
  server.addHook('preHandler', async (request, reply) => {
    if (request.url === '/health') {
      logger.debug('Health check request received', {
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        timestamp: new Date().toISOString()
      })
    }
  })
  
  // Middleware para adicionar headers de health check
  server.addHook('onSend', async (request, reply, payload) => {
    if (request.url === '/health') {
      reply.header('X-Health-Check-Version', '1.0.0')
      reply.header('X-Timestamp', new Date().toISOString())
    }
  })
}
```

## ✅ Critérios de Aceitação

- [ ] Health module setup criado e funcional
- [ ] Integração com bootstrap principal funcionando
- [ ] Inicialização condicional implementada
- [ ] Health check inicial executado no startup
- [ ] Graceful shutdown configurado
- [ ] Environment variables respeitadas
- [ ] Logging adequado implementado
- [ ] Retry logic funcionando
- [ ] Cleanup de recursos implementado

## 🔗 Dependências

- Health Container configurado
- Health Controller implementado
- Bootstrap principal da aplicação
- Logger configurado
- Environment configuration

## 📚 Referências

- Application Bootstrap Patterns
- Graceful Shutdown Best Practices
- Health Check Startup Validation
- Container Module Loading Strategies
