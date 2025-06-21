# 🏷️ Health Check Types - Plano de Implementação

## 🎯 Objetivo

Definir todas as interfaces, tipos e contratos necessários para o sistema de Health Check.

## 📁 Localização

`src/shared/infra/health/types/health-check.types.ts`

## 📋 Atividades

### Passo 1: Definir Interface Principal do Health Status

- [ ] Criar interface `HealthStatus` para resposta principal
- [ ] Definir enum `HealthStatusType` para status geral
- [ ] Incluir campos obrigatórios: status, timestamp, version, uptime, services

### Passo 2: Definir Interface de Serviço Individual

- [ ] Criar interface `ServiceHealth` para cada serviço monitorado
- [ ] Definir enum `ServiceStatusType` para status de serviço
- [ ] Incluir campos: status, responseTime, lastCheck, error?, metadata?

### Passo 3: Definir Interface do Provider

- [ ] Criar interface `HealthProvider` para padronizar providers
- [ ] Definir método `check()` que retorna `Promise<ServiceHealth>`
- [ ] Incluir propriedade `name` para identificação

### Passo 4: Definir Interface do Service Principal

- [ ] Criar interface `HealthCheckService` 
- [ ] Definir método `checkHealth()` que retorna `Promise<HealthStatus>`
- [ ] Definir método `checkService(name: string)` para verificação individual

### Passo 5: Definir Tipos Auxiliares

- [ ] Criar tipo `HealthCheckConfig` para configurações
- [ ] Definir tipo `ServiceMetadata` para metadados específicos
- [ ] Criar tipo `HealthCheckResult` para resultados internos

## 📝 Implementação Detalhada

### Interface HealthStatus
```typescript
export interface HealthStatus {
  status: HealthStatusType
  timestamp: string
  version: string
  uptime: number
  services: {
    database: ServiceHealth
    email: ServiceHealth
    messageQueue: ServiceHealth
  }
}

export enum HealthStatusType {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy'
}
```

### Interface ServiceHealth
```typescript
export interface ServiceHealth {
  status: ServiceStatusType
  responseTime: number
  lastCheck: string
  error?: string
  metadata?: ServiceMetadata
}

export enum ServiceStatusType {
  UP = 'up',
  DOWN = 'down'
}

export type ServiceMetadata = Record<string, any>
```

### Interface HealthProvider
```typescript
export interface HealthProvider {
  readonly name: string
  check(): Promise<ServiceHealth>
}
```

### Interface HealthCheckService
```typescript
export interface HealthCheckService {
  checkHealth(): Promise<HealthStatus>
  checkService(serviceName: string): Promise<ServiceHealth>
  isHealthy(): Promise<boolean>
}
```

### Tipos de Configuração
```typescript
export interface HealthCheckConfig {
  timeout: number
  cacheTimeout: number
  enabledServices: string[]
  metadata: {
    version: string
    name: string
  }
}

export interface HealthCheckResult {
  serviceName: string
  health: ServiceHealth
  cached: boolean
}
```

## 🔧 Configurações

### Passo 6: Definir Constantes

- [ ] Criar constantes para timeouts padrão
- [ ] Definir nomes de serviços padronizados
- [ ] Estabelecer códigos de status HTTP

### Passo 7: Definir Utilitários de Tipo

- [ ] Criar type guards para validação
- [ ] Definir utility types para transformações
- [ ] Implementar tipos condicionais se necessário

### Implementação de Constantes
```typescript
export const HEALTH_CHECK_CONSTANTS = {
  DEFAULT_TIMEOUT: 5000,
  CACHE_TIMEOUT: 30000,
  SERVICE_NAMES: {
    DATABASE: 'database',
    EMAIL: 'email',
    MESSAGE_QUEUE: 'messageQueue'
  },
  HTTP_STATUS: {
    HEALTHY: 200,
    UNHEALTHY: 503
  }
} as const

export type ServiceName = typeof HEALTH_CHECK_CONSTANTS.SERVICE_NAMES[keyof typeof HEALTH_CHECK_CONSTANTS.SERVICE_NAMES]
```

### Type Guards
```typescript
export function isServiceHealthy(health: ServiceHealth): boolean {
  return health.status === ServiceStatusType.UP
}

export function isSystemHealthy(status: HealthStatus): boolean {
  return status.status === HealthStatusType.HEALTHY
}
```

## ✅ Critérios de Aceitação

- [ ] Todas as interfaces definidas e documentadas
- [ ] Enums com valores apropriados
- [ ] Tipos auxiliares implementados
- [ ] Constantes configuradas
- [ ] Type guards funcionais
- [ ] Exportações organizadas
- [ ] TypeScript sem erros de compilação

## 🔗 Dependências

- **Nenhuma dependência externa**
- Apenas tipos TypeScript nativos

## 📚 Referências

- Padrões de Health Check da indústria
- Especificação RFC para Health Checks
- Boas práticas de monitoramento de aplicações
