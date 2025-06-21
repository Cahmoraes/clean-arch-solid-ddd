# 📦 Health Check Container - Plano de Implementação

## 🎯 Objetivo

Configurar o container IoC para registrar todas as dependências do sistema de Health Check.

## 📁 Localização

`src/shared/infra/ioc/module/health/health-container.ts`

## 📋 Atividades

### Passo 1: Criar Estrutura Base do Container

- [ ] Criar módulo de container usando `ContainerModule`
- [ ] Importar todas as classes do health check
- [ ] Configurar bindings básicos
- [ ] Definir escopo dos serviços (singleton)

### Passo 2: Registrar Health Check Service

- [ ] Bind do `HealthCheckService` como singleton
- [ ] Configurar injeção de dependências dos providers
- [ ] Definir interface como token de injeção

### Passo 3: Registrar Health Check Controller

- [ ] Bind do `HealthCheckController` como singleton
- [ ] Configurar injeção do service e servidor HTTP
- [ ] Registrar no token de controllers

### Passo 4: Registrar Health Providers

- [ ] Bind do `DatabaseHealthProvider`
- [ ] Bind do `EmailHealthProvider`
- [ ] Bind do `RabbitMQHealthProvider`
- [ ] Configurar como singletons para cache

### Passo 5: Atualizar Types

- [ ] Adicionar symbols para health check no TYPES
- [ ] Organizar em namespace apropriado
- [ ] Exportar tipos para uso externo

## 📝 Implementação Detalhada

### Estrutura do Container Module
```typescript
import { ContainerModule } from 'inversify'

import { HealthCheckController } from '../health-check.controller'
import { HealthCheckService } from '../health-check.service'
import { DatabaseHealthProvider } from '../providers/database-health.provider'
import { EmailHealthProvider } from '../providers/email-health.provider'
import { RabbitMQHealthProvider } from '../providers/rabbitmq-health.provider'
import { TYPES } from '../types'

export const healthContainer = new ContainerModule((bind) => {
  // Health Check Service
  bind<HealthCheckService>(TYPES.HealthCheck.Service)
    .to(HealthCheckService)
    .inSingletonScope()

  // Health Check Controller
  bind<HealthCheckController>(TYPES.HealthCheck.Controller)
    .to(HealthCheckController)
    .inSingletonScope()

  // Health Providers
  bind<DatabaseHealthProvider>(TYPES.HealthCheck.Providers.Database)
    .to(DatabaseHealthProvider)
    .inSingletonScope()

  bind<EmailHealthProvider>(TYPES.HealthCheck.Providers.Email)
    .to(EmailHealthProvider)
    .inSingletonScope()

  bind<RabbitMQHealthProvider>(TYPES.HealthCheck.Providers.RabbitMQ)
    .to(RabbitMQHealthProvider)
    .inSingletonScope()
})
```

### Atualização do TYPES
```typescript
// src/shared/infra/ioc/types.ts
export const TYPES = {
  // ...existing types...
  
  HealthCheck: {
    Service: Symbol.for('HealthCheckService'),
    Controller: Symbol.for('HealthCheckController'),
    Providers: {
      Database: Symbol.for('DatabaseHealthProvider'),
      Email: Symbol.for('EmailHealthProvider'),
      RabbitMQ: Symbol.for('RabbitMQHealthProvider')
    }
  },
  
  // ...rest of types...
} as const
```

### Container com Configurações Avançadas
```typescript
export const healthContainer = new ContainerModule((bind) => {
  // Health Check Service com configurações
  bind<HealthCheckService>(TYPES.HealthCheck.Service)
    .to(HealthCheckService)
    .inSingletonScope()
    .whenTargetNamed('production')

  // Version for testing with mocks
  bind<HealthCheckService>(TYPES.HealthCheck.Service)
    .to(MockHealthCheckService)
    .inSingletonScope()
    .whenTargetNamed('test')

  // Health Check Controller
  bind<HealthCheckController>(TYPES.HealthCheck.Controller)
    .to(HealthCheckController)
    .inSingletonScope()

  // Providers with conditional binding
  if (process.env.NODE_ENV !== 'test') {
    bind<DatabaseHealthProvider>(TYPES.HealthCheck.Providers.Database)
      .to(DatabaseHealthProvider)
      .inSingletonScope()

    bind<EmailHealthProvider>(TYPES.HealthCheck.Providers.Email)
      .to(EmailHealthProvider)
      .inSingletonScope()

    bind<RabbitMQHealthProvider>(TYPES.HealthCheck.Providers.RabbitMQ)
      .to(RabbitMQHealthProvider)
      .inSingletonScope()
  } else {
    // Test mocks
    bind<DatabaseHealthProvider>(TYPES.HealthCheck.Providers.Database)
      .to(MockDatabaseHealthProvider)
      .inSingletonScope()

    bind<EmailHealthProvider>(TYPES.HealthCheck.Providers.Email)
      .to(MockEmailHealthProvider)
      .inSingletonScope()

    bind<RabbitMQHealthProvider>(TYPES.HealthCheck.Providers.RabbitMQ)
      .to(MockRabbitMQHealthProvider)
      .inSingletonScope()
  }
})
```

### Factory Pattern para Providers
```typescript
export const healthContainer = new ContainerModule((bind) => {
  // Factory para criar providers dinamicamente
  bind<HealthProviderFactory>(TYPES.HealthCheck.ProviderFactory)
    .to(HealthProviderFactory)
    .inSingletonScope()

  // Registrar providers via factory
  bind<HealthProvider>(TYPES.HealthCheck.Provider)
    .toFactory<HealthProvider>((context: interfaces.Context) => {
      return (providerName: string) => {
        const factory = context.container.get<HealthProviderFactory>(
          TYPES.HealthCheck.ProviderFactory
        )
        return factory.create(providerName)
      }
    })
    .whenTargetNamed('dynamic')

  // Providers individuais
  bind<HealthProvider>(TYPES.HealthCheck.Provider)
    .to(DatabaseHealthProvider)
    .inSingletonScope()
    .whenTargetNamed('database')

  bind<HealthProvider>(TYPES.HealthCheck.Provider)
    .to(EmailHealthProvider)
    .inSingletonScope()
    .whenTargetNamed('email')

  bind<HealthProvider>(TYPES.HealthCheck.Provider)
    .to(RabbitMQHealthProvider)
    .inSingletonScope()
    .whenTargetNamed('rabbitmq')
})
```

### Multi-Binding para Lista de Providers
```typescript
export const healthContainer = new ContainerModule((bind) => {
  // Service principal
  bind<HealthCheckService>(TYPES.HealthCheck.Service)
    .to(HealthCheckService)
    .inSingletonScope()

  // Controller
  bind<HealthCheckController>(TYPES.HealthCheck.Controller)
    .to(HealthCheckController)
    .inSingletonScope()

  // Multi-binding para array de providers
  bind<HealthProvider>(TYPES.HealthCheck.Providers.Collection)
    .to(DatabaseHealthProvider)
    .inSingletonScope()

  bind<HealthProvider>(TYPES.HealthCheck.Providers.Collection)
    .to(EmailHealthProvider)
    .inSingletonScope()

  bind<HealthProvider>(TYPES.HealthCheck.Providers.Collection)
    .to(RabbitMQHealthProvider)
    .inSingletonScope()
})

// No service, injetar como array:
// @multiInject(TYPES.HealthCheck.Providers.Collection)
// private readonly providers: HealthProvider[]
```

### Configuração de Cache
```typescript
export const healthContainer = new ContainerModule((bind) => {
  // Cache para health check results
  bind<Map<string, any>>(TYPES.HealthCheck.Cache)
    .toConstantValue(new Map())
    .inSingletonScope()

  // Cache com TTL
  bind<NodeCache>(TYPES.HealthCheck.CacheWithTTL)
    .toDynamicValue(() => {
      return new NodeCache({ 
        stdTTL: 30, // 30 segundos
        checkperiod: 35 // verificar a cada 35 segundos
      })
    })
    .inSingletonScope()

  // Health Check Service com cache
  bind<HealthCheckService>(TYPES.HealthCheck.Service)
    .to(CachedHealthCheckService)
    .inSingletonScope()
})
```

### Configuração com Environment Variables
```typescript
export const healthContainer = new ContainerModule((bind) => {
  // Configuração do health check
  bind<HealthCheckConfig>(TYPES.HealthCheck.Config)
    .toDynamicValue(() => ({
      enabled: process.env.HEALTH_CHECK_ENABLED !== 'false',
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000'),
      cacheTimeout: parseInt(process.env.HEALTH_CHECK_CACHE_TTL || '30000'),
      enabledServices: (process.env.HEALTH_CHECK_SERVICES || 'database,email,rabbitmq').split(','),
      endpoint: process.env.HEALTH_CHECK_ENDPOINT || '/health',
      enableMetrics: process.env.HEALTH_CHECK_METRICS === 'true'
    }))
    .inSingletonScope()

  // Conditional binding baseado na config
  bind<HealthCheckService>(TYPES.HealthCheck.Service)
    .toDynamicValue((context) => {
      const config = context.container.get<HealthCheckConfig>(TYPES.HealthCheck.Config)
      
      if (config.enabled) {
        return context.container.get<HealthCheckService>(TYPES.HealthCheck.ServiceImpl)
      } else {
        return context.container.get<DisabledHealthCheckService>(TYPES.HealthCheck.ServiceDisabled)
      }
    })
    .inSingletonScope()
})
```

## 🔧 Configurações Avançadas

### Passo 6: Configurar Conditional Bindings

- [ ] Binding diferente para ambiente de teste
- [ ] Binding condicional baseado em environment variables
- [ ] Mocks para desenvolvimento local

### Passo 7: Implementar Provider Factory

- [ ] Factory para criação dinâmica de providers
- [ ] Registro automático de novos providers
- [ ] Configuração via arquivo de configuração

### Passo 8: Configurar Multi-Injection

- [ ] Array de providers para o service
- [ ] Injeção dinâmica baseada em configuração
- [ ] Plugin system para providers externos

### Passo 9: Integrar com Container Principal

- [ ] Carregar o health container no container principal
- [ ] Configurar ordem de carregamento
- [ ] Resolver dependências circulares

```typescript
// src/shared/infra/ioc/container.ts
import { Container } from 'inversify'
import { healthContainer } from './module/health/health-container'

const container = new Container()

// Carregar módulos
container.load(
  // ...other modules...
  healthContainer
)

export { container }
```

## ✅ Critérios de Aceitação

- [ ] Container module criado e configurado
- [ ] Todos os serviços registrados corretamente
- [ ] Injeção de dependências funcionando
- [ ] Singletons configurados apropriadamente
- [ ] Types atualizados e exportados
- [ ] Bindings condicionais implementados
- [ ] Integração com container principal
- [ ] Testes de container passando

## 🔗 Dependências

- `inversify` para IoC container
- Classes do health check implementadas
- Types atualizados
- Container principal da aplicação

## 📚 Referências

- InversifyJS Documentation
- Dependency Injection Best Practices
- IoC Container Patterns
- Singleton vs Transient Scoping
