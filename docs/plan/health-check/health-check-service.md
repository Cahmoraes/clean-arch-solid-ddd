# 🛠️ Health Check Service - Plano de Implementação

## 🎯 Objetivo

Implementar o serviço principal que coordena todas as verificações de saúde da aplicação.

## 📁 Localização

`src/shared/infra/health/health-check.service.ts`

## 📋 Atividades

### Passo 1: Estrutura Base da Classe

- [ ] Criar classe `HealthCheckService` com decorator `@injectable()`
- [ ] Implementar interface `HealthCheckService`
- [ ] Configurar injeção de dependências dos providers
- [ ] Inicializar propriedades de configuração

### Passo 2: Implementar Método Principal `checkHealth()`

- [ ] Executar verificações de todos os serviços em paralelo
- [ ] Calcular uptime da aplicação
- [ ] Determinar status geral baseado nos serviços
- [ ] Montar resposta completa do health status

### Passo 3: Implementar Verificação Individual `checkService()`

- [ ] Buscar provider específico por nome
- [ ] Executar verificação com timeout
- [ ] Tratar erros e exceções
- [ ] Retornar resultado do serviço

### Passo 4: Implementar Sistema de Cache

- [ ] Criar cache em memória para resultados
- [ ] Definir TTL (Time To Live) para cache
- [ ] Implementar lógica de invalidação
- [ ] Adicionar fallback para cache expirado

### Passo 5: Implementar Método `isHealthy()`

- [ ] Verificar status geral da aplicação
- [ ] Retornar boolean baseado nos serviços críticos
- [ ] Considerar serviços opcionais vs obrigatórios

## 📝 Implementação Detalhada

### Estrutura da Classe
```typescript
@injectable()
export class HealthCheckService implements IHealthCheckService {
  private readonly startTime: Date
  private readonly cache = new Map<string, CachedHealth>()
  
  constructor(
    @inject(TYPES.HealthCheck.Providers.Database)
    private readonly databaseProvider: HealthProvider,
    
    @inject(TYPES.HealthCheck.Providers.Email)
    private readonly emailProvider: HealthProvider,
    
    @inject(TYPES.HealthCheck.Providers.RabbitMQ)
    private readonly rabbitMQProvider: HealthProvider,
    
    @inject(TYPES.Logger)
    private readonly logger: Logger
  ) {
    this.startTime = new Date()
  }
}
```

### Método checkHealth()
```typescript
public async checkHealth(): Promise<HealthStatus> {
  const timestamp = new Date().toISOString()
  
  try {
    // Executar verificações em paralelo
    const [database, email, messageQueue] = await Promise.allSettled([
      this.checkServiceWithCache('database', this.databaseProvider),
      this.checkServiceWithCache('email', this.emailProvider),
      this.checkServiceWithCache('messageQueue', this.rabbitMQProvider)
    ])
    
    // Montar resultado
    const services = {
      database: this.extractResult(database),
      email: this.extractResult(email),
      messageQueue: this.extractResult(messageQueue)
    }
    
    // Determinar status geral
    const status = this.determineOverallStatus(services)
    
    return {
      status,
      timestamp,
      version: this.getVersion(),
      uptime: this.getUptime(),
      services
    }
  } catch (error) {
    this.logger.error('Health check failed', error)
    throw error
  }
}
```

### Sistema de Cache
```typescript
private async checkServiceWithCache(
  serviceName: string, 
  provider: HealthProvider
): Promise<ServiceHealth> {
  const cached = this.getCachedResult(serviceName)
  
  if (cached) {
    return cached
  }
  
  const result = await this.checkServiceWithTimeout(provider)
  this.setCachedResult(serviceName, result)
  
  return result
}

private getCachedResult(serviceName: string): ServiceHealth | null {
  const cached = this.cache.get(serviceName)
  
  if (!cached) return null
  
  const isExpired = Date.now() - cached.timestamp > HEALTH_CHECK_CONSTANTS.CACHE_TIMEOUT
  
  if (isExpired) {
    this.cache.delete(serviceName)
    return null
  }
  
  return cached.health
}
```

### Verificação com Timeout
```typescript
private async checkServiceWithTimeout(provider: HealthProvider): Promise<ServiceHealth> {
  const startTime = Date.now()
  
  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Health check timeout')), HEALTH_CHECK_CONSTANTS.DEFAULT_TIMEOUT)
    })
    
    const healthCheck = provider.check()
    
    const result = await Promise.race([healthCheck, timeoutPromise])
    
    this.logger.info(`Health check completed for ${provider.name}`, {
      responseTime: Date.now() - startTime,
      status: result.status
    })
    
    return result
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    this.logger.warn(`Health check failed for ${provider.name}`, {
      error: error.message,
      responseTime
    })
    
    return {
      status: ServiceStatusType.DOWN,
      responseTime,
      lastCheck: new Date().toISOString(),
      error: error.message
    }
  }
}
```

### Determinação de Status Geral
```typescript
private determineOverallStatus(services: HealthStatus['services']): HealthStatusType {
  const criticalServices = [services.database]
  const allServices = Object.values(services)
  
  // Se algum serviço crítico estiver down, sistema está unhealthy
  const hasCriticalIssue = criticalServices.some(service => service.status === ServiceStatusType.DOWN)
  
  if (hasCriticalIssue) {
    return HealthStatusType.UNHEALTHY
  }
  
  // Se mais de 50% dos serviços estiverem down, sistema está unhealthy
  const downServices = allServices.filter(service => service.status === ServiceStatusType.DOWN)
  const healthyPercentage = (allServices.length - downServices.length) / allServices.length
  
  return healthyPercentage >= 0.5 ? HealthStatusType.HEALTHY : HealthStatusType.UNHEALTHY
}
```

### Métodos Auxiliares
```typescript
private getUptime(): number {
  return Math.floor((Date.now() - this.startTime.getTime()) / 1000)
}

private getVersion(): string {
  // Buscar do package.json ou variável de ambiente
  return process.env.APP_VERSION || '1.0.0'
}

private extractResult(settledResult: PromiseSettledResult<ServiceHealth>): ServiceHealth {
  if (settledResult.status === 'fulfilled') {
    return settledResult.value
  }
  
  return {
    status: ServiceStatusType.DOWN,
    responseTime: 0,
    lastCheck: new Date().toISOString(),
    error: settledResult.reason?.message || 'Unknown error'
  }
}
```

## 🔧 Configurações

### Passo 6: Implementar Configurações Dinâmicas

- [ ] Permitir configuração de timeouts via environment
- [ ] Configurar quais serviços são críticos
- [ ] Permitir habilitar/desabilitar cache
- [ ] Configurar TTL do cache dinamicamente

### Passo 7: Implementar Logging Estruturado

- [ ] Log de início e fim de cada verificação
- [ ] Log de performance (response time)
- [ ] Log de erros com contexto
- [ ] Métricas para observabilidade

### Passo 8: Implementar Métricas

- [ ] Contador de verificações realizadas
- [ ] Histogram de response times
- [ ] Gauge de status atual
- [ ] Alertas baseados em threshold

## ✅ Critérios de Aceitação

- [ ] Serviço principal implementado e funcional
- [ ] Verificações paralelas funcionando
- [ ] Sistema de cache operacional
- [ ] Timeouts configurados e respeitados
- [ ] Logging estruturado implementado
- [ ] Determinação de status geral correta
- [ ] Tratamento de erros robusto
- [ ] Performance otimizada

## 🔗 Dependências

- `HealthProvider` interfaces dos providers
- `Logger` para logging estruturado
- Types do health check
- Container IoC para injeção

## 📚 Referências

- Padrões de Circuit Breaker
- Práticas de Cache em aplicações
- Monitoring e Observabilidade
- Timeouts e Error Handling
