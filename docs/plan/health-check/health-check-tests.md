# 🧪 Health Check Tests - Plano de Implementação

## 🎯 Objetivo

Implementar uma estratégia abrangente de testes para o sistema de Health Check, incluindo testes unitários, de integração e end-to-end.

## 📁 Localização

```
src/shared/infra/health/__tests__/
├── unit/
│   ├── health-check.service.test.ts
│   ├── health-check.controller.test.ts
│   └── providers/
│       ├── database-health.provider.test.ts
│       ├── email-health.provider.test.ts
│       └── rabbitmq-health.provider.test.ts
├── integration/
│   ├── health-check.integration.test.ts
│   └── health-check-api.integration.test.ts
└── e2e/
    └── health-check.e2e.test.ts
```

## 📋 Atividades

### Passo 1: Configurar Estrutura de Testes

- [ ] Criar diretórios de teste organizados
- [ ] Configurar mocks para dependências externas
- [ ] Setup de containers de teste
- [ ] Configurar ambiente de teste isolado

### Passo 2: Implementar Testes Unitários

- [ ] Testes do HealthCheckService
- [ ] Testes do HealthCheckController
- [ ] Testes de cada Health Provider
- [ ] Testes de error handling e edge cases

### Passo 3: Implementar Testes de Integração

- [ ] Testes com banco de dados real
- [ ] Testes com serviços externos mockados
- [ ] Testes de container IoC
- [ ] Testes de bootstrap integration

### Passo 4: Implementar Testes End-to-End

- [ ] Testes de API completa
- [ ] Testes com todos os serviços rodando
- [ ] Testes de performance
- [ ] Testes de cenários reais

### Passo 5: Configurar Test Utilities

- [ ] Factories para criação de dados de teste
- [ ] Helpers para mocking de serviços
- [ ] Utilities para assertions customizadas
- [ ] Setup de test containers (Testcontainers)

## 📝 Implementação Detalhada

### Configuração Base de Testes
```typescript
// src/shared/infra/health/__tests__/setup.ts
import { Container } from 'inversify'
import { beforeEach, afterEach } from 'vitest'

import { TYPES } from '@/shared/infra/ioc/types'
import { MockLogger } from '@/shared/infra/logger/mock-logger'

export class HealthCheckTestSetup {
  public container: Container
  
  constructor() {
    this.container = new Container()
    this.setupMocks()
  }
  
  private setupMocks(): void {
    // Logger mock
    this.container.bind(TYPES.Logger).to(MockLogger)
    
    // Database mock
    this.container.bind(TYPES.Database.PrismaClient).toConstantValue({
      $queryRaw: vi.fn(),
      $disconnect: vi.fn()
    })
    
    // Email service mock
    this.container.bind(TYPES.Services.Email).toConstantValue({
      verify: vi.fn(),
      sendEmail: vi.fn()
    })
    
    // Message queue mock
    this.container.bind(TYPES.Services.MessageQueue).toConstantValue({
      isConnected: vi.fn(),
      getConnectionInfo: vi.fn(),
      listQueues: vi.fn()
    })
  }
  
  public cleanup(): void {
    this.container.unbindAll()
  }
}

export function setupHealthCheckTest() {
  let testSetup: HealthCheckTestSetup
  
  beforeEach(() => {
    testSetup = new HealthCheckTestSetup()
  })
  
  afterEach(() => {
    testSetup.cleanup()
  })
  
  return () => testSetup
}
```

### Testes do Health Check Service
```typescript
// src/shared/infra/health/__tests__/unit/health-check.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { HealthCheckService } from '../../health-check.service'
import { DatabaseHealthProvider } from '../../providers/database-health.provider'
import { EmailHealthProvider } from '../../providers/email-health.provider'
import { RabbitMQHealthProvider } from '../../providers/rabbitmq-health.provider'
import { HealthStatusType, ServiceStatusType } from '../../types/health-check.types'
import { setupHealthCheckTest } from '../setup'

describe('HealthCheckService', () => {
  const getTestSetup = setupHealthCheckTest()
  
  let healthCheckService: HealthCheckService
  let mockDatabaseProvider: vi.Mocked<DatabaseHealthProvider>
  let mockEmailProvider: vi.Mocked<EmailHealthProvider>
  let mockRabbitMQProvider: vi.Mocked<RabbitMQHealthProvider>
  
  beforeEach(() => {
    const testSetup = getTestSetup()
    
    // Setup mocks
    mockDatabaseProvider = {
      name: 'database',
      check: vi.fn()
    } as any
    
    mockEmailProvider = {
      name: 'email',
      check: vi.fn()
    } as any
    
    mockRabbitMQProvider = {
      name: 'messageQueue',
      check: vi.fn()
    } as any
    
    // Create service with mocks
    healthCheckService = new HealthCheckService(
      mockDatabaseProvider,
      mockEmailProvider,
      mockRabbitMQProvider,
      testSetup.container.get(TYPES.Logger)
    )
  })
  
  describe('checkHealth', () => {
    it('should return healthy status when all services are up', async () => {
      // Arrange
      const mockHealthyResponse = {
        status: ServiceStatusType.UP,
        responseTime: 100,
        lastCheck: new Date().toISOString()
      }
      
      mockDatabaseProvider.check.mockResolvedValue(mockHealthyResponse)
      mockEmailProvider.check.mockResolvedValue(mockHealthyResponse)
      mockRabbitMQProvider.check.mockResolvedValue(mockHealthyResponse)
      
      // Act
      const result = await healthCheckService.checkHealth()
      
      // Assert
      expect(result.status).toBe(HealthStatusType.HEALTHY)
      expect(result.services.database.status).toBe(ServiceStatusType.UP)
      expect(result.services.email.status).toBe(ServiceStatusType.UP)
      expect(result.services.messageQueue.status).toBe(ServiceStatusType.UP)
      expect(result.timestamp).toBeDefined()
      expect(result.uptime).toBeGreaterThan(0)
    })
    
    it('should return unhealthy status when database is down', async () => {
      // Arrange
      const mockHealthyResponse = {
        status: ServiceStatusType.UP,
        responseTime: 100,
        lastCheck: new Date().toISOString()
      }
      
      const mockUnhealthyResponse = {
        status: ServiceStatusType.DOWN,
        responseTime: 5000,
        lastCheck: new Date().toISOString(),
        error: 'Connection timeout'
      }
      
      mockDatabaseProvider.check.mockResolvedValue(mockUnhealthyResponse)
      mockEmailProvider.check.mockResolvedValue(mockHealthyResponse)
      mockRabbitMQProvider.check.mockResolvedValue(mockHealthyResponse)
      
      // Act
      const result = await healthCheckService.checkHealth()
      
      // Assert
      expect(result.status).toBe(HealthStatusType.UNHEALTHY)
      expect(result.services.database.status).toBe(ServiceStatusType.DOWN)
      expect(result.services.database.error).toBe('Connection timeout')
    })
    
    it('should handle provider exceptions gracefully', async () => {
      // Arrange
      const mockHealthyResponse = {
        status: ServiceStatusType.UP,
        responseTime: 100,
        lastCheck: new Date().toISOString()
      }
      
      mockDatabaseProvider.check.mockRejectedValue(new Error('Database connection failed'))
      mockEmailProvider.check.mockResolvedValue(mockHealthyResponse)
      mockRabbitMQProvider.check.mockResolvedValue(mockHealthyResponse)
      
      // Act
      const result = await healthCheckService.checkHealth()
      
      // Assert
      expect(result.status).toBe(HealthStatusType.UNHEALTHY)
      expect(result.services.database.status).toBe(ServiceStatusType.DOWN)
      expect(result.services.database.error).toContain('Database connection failed')
    })
    
    it('should execute all checks in parallel', async () => {
      // Arrange
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
      
      mockDatabaseProvider.check.mockImplementation(() => delay(100).then(() => ({
        status: ServiceStatusType.UP,
        responseTime: 100,
        lastCheck: new Date().toISOString()
      })))
      
      mockEmailProvider.check.mockImplementation(() => delay(150).then(() => ({
        status: ServiceStatusType.UP,
        responseTime: 150,
        lastCheck: new Date().toISOString()
      })))
      
      mockRabbitMQProvider.check.mockImplementation(() => delay(80).then(() => ({
        status: ServiceStatusType.UP,
        responseTime: 80,
        lastCheck: new Date().toISOString()
      })))
      
      // Act
      const startTime = Date.now()
      await healthCheckService.checkHealth()
      const totalTime = Date.now() - startTime
      
      // Assert - Should be closer to 150ms (longest check) than 330ms (sum of all)
      expect(totalTime).toBeLessThan(250)
      expect(mockDatabaseProvider.check).toHaveBeenCalledOnce()
      expect(mockEmailProvider.check).toHaveBeenCalledOnce()
      expect(mockRabbitMQProvider.check).toHaveBeenCalledOnce()
    })
  })
  
  describe('checkService', () => {
    it('should check individual service by name', async () => {
      // Arrange
      const mockResponse = {
        status: ServiceStatusType.UP,
        responseTime: 50,
        lastCheck: new Date().toISOString()
      }
      
      mockDatabaseProvider.check.mockResolvedValue(mockResponse)
      
      // Act
      const result = await healthCheckService.checkService('database')
      
      // Assert
      expect(result).toEqual(mockResponse)
      expect(mockDatabaseProvider.check).toHaveBeenCalledOnce()
      expect(mockEmailProvider.check).not.toHaveBeenCalled()
      expect(mockRabbitMQProvider.check).not.toHaveBeenCalled()
    })
    
    it('should throw error for unknown service name', async () => {
      // Act & Assert
      await expect(healthCheckService.checkService('unknown')).rejects.toThrow('Unknown service: unknown')
    })
  })
  
  describe('isHealthy', () => {
    it('should return true when system is healthy', async () => {
      // Arrange
      const mockHealthyResponse = {
        status: ServiceStatusType.UP,
        responseTime: 100,
        lastCheck: new Date().toISOString()
      }
      
      mockDatabaseProvider.check.mockResolvedValue(mockHealthyResponse)
      mockEmailProvider.check.mockResolvedValue(mockHealthyResponse)
      mockRabbitMQProvider.check.mockResolvedValue(mockHealthyResponse)
      
      // Act
      const result = await healthCheckService.isHealthy()
      
      // Assert
      expect(result).toBe(true)
    })
    
    it('should return false when system is unhealthy', async () => {
      // Arrange
      const mockHealthyResponse = {
        status: ServiceStatusType.UP,
        responseTime: 100,
        lastCheck: new Date().toISOString()
      }
      
      const mockUnhealthyResponse = {
        status: ServiceStatusType.DOWN,
        responseTime: 5000,
        lastCheck: new Date().toISOString(),
        error: 'Connection timeout'
      }
      
      mockDatabaseProvider.check.mockResolvedValue(mockUnhealthyResponse)
      mockEmailProvider.check.mockResolvedValue(mockHealthyResponse)
      mockRabbitMQProvider.check.mockResolvedValue(mockHealthyResponse)
      
      // Act
      const result = await healthCheckService.isHealthy()
      
      // Assert
      expect(result).toBe(false)
    })
  })
})
```

### Testes do Database Health Provider
```typescript
// src/shared/infra/health/__tests__/unit/providers/database-health.provider.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

import { DatabaseHealthProvider } from '../../../providers/database-health.provider'
import { ServiceStatusType } from '../../../types/health-check.types'
import { setupHealthCheckTest } from '../../setup'

describe('DatabaseHealthProvider', () => {
  const getTestSetup = setupHealthCheckTest()
  
  let databaseProvider: DatabaseHealthProvider
  let mockPrismaClient: vi.Mocked<PrismaClient>
  
  beforeEach(() => {
    const testSetup = getTestSetup()
    
    mockPrismaClient = {
      $queryRaw: vi.fn(),
      $disconnect: vi.fn()
    } as any
    
    databaseProvider = new DatabaseHealthProvider(
      mockPrismaClient,
      testSetup.container.get(TYPES.Logger)
    )
  })
  
  describe('check', () => {
    it('should return UP status when database is accessible', async () => {
      // Arrange
      mockPrismaClient.$queryRaw.mockResolvedValue([{ health_check: 1 }])
      
      // Act
      const result = await databaseProvider.check()
      
      // Assert
      expect(result.status).toBe(ServiceStatusType.UP)
      expect(result.responseTime).toBeGreaterThan(0)
      expect(result.lastCheck).toBeDefined()
      expect(result.error).toBeUndefined()
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalledWith(['SELECT 1 as health_check'])
    })
    
    it('should return DOWN status when database query fails', async () => {
      // Arrange
      const mockError = new Error('Connection refused')
      mockPrismaClient.$queryRaw.mockRejectedValue(mockError)
      
      // Act
      const result = await databaseProvider.check()
      
      // Assert
      expect(result.status).toBe(ServiceStatusType.DOWN)
      expect(result.responseTime).toBeGreaterThan(0)
      expect(result.lastCheck).toBeDefined()
      expect(result.error).toContain('Connection refused')
    })
    
    it('should include database metadata when successful', async () => {
      // Arrange
      mockPrismaClient.$queryRaw
        .mockResolvedValueOnce([{ health_check: 1 }]) // basic check
        .mockResolvedValueOnce([{ max_connections: '100' }]) // max connections
        .mockResolvedValueOnce([{ count: 5n }]) // active connections
        .mockResolvedValueOnce([{ current_database: 'test_db' }]) // database name
        .mockResolvedValueOnce([{ version: 'PostgreSQL 14.0' }]) // version
      
      // Act
      const result = await databaseProvider.check()
      
      // Assert
      expect(result.status).toBe(ServiceStatusType.UP)
      expect(result.metadata).toBeDefined()
      expect(result.metadata.connection).toBeDefined()
    })
    
    it('should handle partial metadata failure gracefully', async () => {
      // Arrange
      mockPrismaClient.$queryRaw
        .mockResolvedValueOnce([{ health_check: 1 }]) // basic check succeeds
        .mockRejectedValueOnce(new Error('Access denied')) // metadata fails
      
      // Act
      const result = await databaseProvider.check()
      
      // Assert
      expect(result.status).toBe(ServiceStatusType.UP)
      expect(result.metadata).toBeDefined()
      expect(result.metadata.error).toContain('Failed to gather complete metrics')
    })
  })
  
  describe('name property', () => {
    it('should return correct provider name', () => {
      expect(databaseProvider.name).toBe('database')
    })
  })
})
```

### Testes de Integração da API
```typescript
// src/shared/infra/health/__tests__/integration/health-check-api.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'

import { serverBuildForTest } from '@/bootstrap/server-build-for-test'
import { HTTP_STATUS } from '@/shared/infra/controller/http-status'

describe('Health Check API Integration', () => {
  let server: FastifyInstance
  
  beforeAll(async () => {
    server = await serverBuildForTest()
    await server.ready()
  })
  
  afterAll(async () => {
    await server.close()
  })
  
  describe('GET /health', () => {
    it('should return 200 when application is healthy', async () => {
      // Act
      const response = await server.inject({
        method: 'GET',
        url: '/health'
      })
      
      // Assert
      expect(response.statusCode).toBe(HTTP_STATUS.OK)
      
      const body = JSON.parse(response.body)
      expect(body.status).toBe('healthy')
      expect(body.timestamp).toBeDefined()
      expect(body.version).toBeDefined()
      expect(body.uptime).toBeGreaterThan(0)
      expect(body.services).toBeDefined()
      expect(body.services.database).toBeDefined()
      expect(body.services.email).toBeDefined()
      expect(body.services.messageQueue).toBeDefined()
    })
    
    it('should return proper headers', async () => {
      // Act
      const response = await server.inject({
        method: 'GET',
        url: '/health'
      })
      
      // Assert
      expect(response.headers['content-type']).toContain('application/json')
      expect(response.headers['x-health-status']).toBeDefined()
      expect(response.headers['cache-control']).toBeDefined()
    })
    
    it('should handle multiple concurrent requests', async () => {
      // Act
      const requests = Array.from({ length: 10 }, () =>
        server.inject({
          method: 'GET',
          url: '/health'
        })
      )
      
      const responses = await Promise.all(requests)
      
      // Assert
      responses.forEach(response => {
        expect(response.statusCode).toBe(HTTP_STATUS.OK)
        expect(JSON.parse(response.body).status).toBe('healthy')
      })
    })
    
    it('should respect cache headers', async () => {
      // Act
      const firstResponse = await server.inject({
        method: 'GET',
        url: '/health'
      })
      
      const etag = firstResponse.headers.etag
      
      const secondResponse = await server.inject({
        method: 'GET',
        url: '/health',
        headers: {
          'if-none-match': etag
        }
      })
      
      // Assert
      expect(firstResponse.statusCode).toBe(HTTP_STATUS.OK)
      expect(secondResponse.statusCode).toBe(HTTP_STATUS.NOT_MODIFIED)
    })
  })
  
  describe('Error Scenarios', () => {
    it('should return 503 when database is down', async () => {
      // This would require mocking database to be down
      // Implementation depends on your testing strategy
    })
    
    it('should handle internal server errors gracefully', async () => {
      // This would require forcing an internal error
      // Implementation depends on your testing strategy
    })
  })
})
```

### Test Factories e Utilities
```typescript
// src/shared/infra/health/__tests__/factories/health-status.factory.ts
import { ServiceHealth, HealthStatus, ServiceStatusType, HealthStatusType } from '../../types/health-check.types'

export class HealthStatusFactory {
  static createServiceHealth(overrides: Partial<ServiceHealth> = {}): ServiceHealth {
    return {
      status: ServiceStatusType.UP,
      responseTime: 100,
      lastCheck: new Date().toISOString(),
      ...overrides
    }
  }
  
  static createHealthyServiceHealth(): ServiceHealth {
    return this.createServiceHealth({
      status: ServiceStatusType.UP,
      responseTime: Math.floor(Math.random() * 200) + 50
    })
  }
  
  static createUnhealthyServiceHealth(error: string = 'Service unavailable'): ServiceHealth {
    return this.createServiceHealth({
      status: ServiceStatusType.DOWN,
      responseTime: Math.floor(Math.random() * 3000) + 2000,
      error
    })
  }
  
  static createHealthStatus(overrides: Partial<HealthStatus> = {}): HealthStatus {
    return {
      status: HealthStatusType.HEALTHY,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: Math.floor(Math.random() * 10000) + 1000,
      services: {
        database: this.createHealthyServiceHealth(),
        email: this.createHealthyServiceHealth(),
        messageQueue: this.createHealthyServiceHealth()
      },
      ...overrides
    }
  }
  
  static createUnhealthyHealthStatus(unhealthyService: string = 'database'): HealthStatus {
    const healthStatus = this.createHealthStatus({
      status: HealthStatusType.UNHEALTHY
    })
    
    if (unhealthyService in healthStatus.services) {
      healthStatus.services[unhealthyService] = this.createUnhealthyServiceHealth()
    }
    
    return healthStatus
  }
}
```

## ✅ Critérios de Aceitação

- [ ] Estrutura de testes organizada e configurada
- [ ] Testes unitários com alta cobertura (>90%)
- [ ] Testes de integração funcionando
- [ ] Testes end-to-end validando cenários reais
- [ ] Mocks apropriados para dependências externas
- [ ] Test factories e utilities implementados
- [ ] Performance tests para verificar latência
- [ ] Testes de error handling e edge cases
- [ ] CI/CD pipeline executando todos os testes

## 🔗 Dependências

- Vitest ou Jest para test runner
- Test containers para testes de integração
- Supertest para testes de API
- Mocks para serviços externos
- Health check implementation completa

## 📚 Referências

- Testing Best Practices
- Test Pyramid Strategy
- Mocking External Dependencies
- API Testing with Fastify
- Database Testing Strategies
