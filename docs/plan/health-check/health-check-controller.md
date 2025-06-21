# 🌐 Health Check Controller - Plano de Implementação

## 🎯 Objetivo

Implementar o controller HTTP que expõe a rota de health check para monitoramento externo.

## 📁 Localização

`src/shared/infra/health/health-check.controller.ts`

## 📋 Atividades

### Passo 1: Estrutura Base do Controller

- [ ] Criar classe `HealthCheckController` com decorator `@injectable()`
- [ ] Implementar interface `Controller`
- [ ] Configurar injeção de dependências do service
- [ ] Definir bind methods no construtor

### Passo 2: Implementar Método `init()`

- [ ] Registrar rota `GET /health` no servidor HTTP
- [ ] Configurar rota como pública (sem autenticação)
- [ ] Adicionar logging do registro da rota
- [ ] Aplicar decorator de logging

### Passo 3: Implementar Método `callback()`

- [ ] Executar health check via service
- [ ] Determinar status HTTP baseado no resultado
- [ ] Estruturar resposta JSON
- [ ] Tratar exceções e erros

### Passo 4: Implementar Cache de Response

- [ ] Adicionar headers de cache apropriados
- [ ] Configurar TTL para clientes HTTP
- [ ] Implementar ETag para cache condicional
- [ ] Gerenciar cache-control directives

### Passo 5: Implementar Métricas HTTP

- [ ] Contar requisições de health check
- [ ] Medir tempo de resposta
- [ ] Rastrear status codes retornados
- [ ] Exportar métricas para observabilidade

## 📝 Implementação Detalhada

### Estrutura da Classe
```typescript
@injectable()
export class HealthCheckController implements Controller {
  constructor(
    @inject(TYPES.Server.Fastify)
    private readonly server: HttpServer,
    
    @inject(TYPES.Services.HealthCheck)
    private readonly healthCheckService: HealthCheckService,
    
    @inject(TYPES.Logger)
    private readonly logger: Logger
  ) {
    this.bindMethods()
  }

  private bindMethods(): void {
    this.callback = this.callback.bind(this)
  }
}
```

### Método init()
```typescript
@Logger({
  message: '🏥 Health Check endpoint registered'
})
public async init(): Promise<void> {
  this.server.register('get', '/health', {
    callback: this.callback,
    isProtected: false,
    schema: {
      description: 'Application health check endpoint',
      tags: ['monitoring'],
      response: {
        200: {
          description: 'Application is healthy',
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            version: { type: 'string' },
            uptime: { type: 'number' },
            services: { type: 'object' }
          }
        },
        503: {
          description: 'Application is unhealthy',
          type: 'object'
        }
      }
    }
  })
  
  this.logger.info('Health check endpoint initialized', {
    endpoint: '/health',
    method: 'GET'
  })
}
```

### Método callback()
```typescript
public async callback(request: FastifyRequest): Promise<FastifyReply> {
  const startTime = Date.now()
  
  try {
    this.logger.debug('Health check requested', {
      userAgent: request.headers['user-agent'],
      ip: request.ip
    })
    
    const healthStatus = await this.healthCheckService.checkHealth()
    const responseTime = Date.now() - startTime
    
    const statusCode = this.getHttpStatusCode(healthStatus)
    
    this.logger.info('Health check completed', {
      status: healthStatus.status,
      responseTime,
      statusCode
    })
    
    return ResponseFactory.create({
      status: statusCode,
      body: healthStatus,
      headers: this.buildResponseHeaders(healthStatus)
    })
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    this.logger.error('Health check failed', {
      error: error.message,
      responseTime,
      stack: error.stack
    })
    
    return ResponseFactory.create({
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Internal health check error'
      }
    })
  }
}
```

### Determinação de Status HTTP
```typescript
private getHttpStatusCode(healthStatus: HealthStatus): number {
  switch (healthStatus.status) {
    case HealthStatusType.HEALTHY:
      return HTTP_STATUS.OK
    case HealthStatusType.UNHEALTHY:
      return HTTP_STATUS.SERVICE_UNAVAILABLE
    default:
      return HTTP_STATUS.INTERNAL_SERVER_ERROR
  }
}
```

### Headers de Response
```typescript
private buildResponseHeaders(healthStatus: HealthStatus): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Health-Status': healthStatus.status,
    'X-Response-Time': Date.now().toString()
  }
  
  // Cache headers baseados no status
  if (healthStatus.status === HealthStatusType.HEALTHY) {
    headers['Cache-Control'] = 'public, max-age=30'
    headers['ETag'] = this.generateETag(healthStatus)
  } else {
    headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    headers['Pragma'] = 'no-cache'
    headers['Expires'] = '0'
  }
  
  return headers
}

private generateETag(healthStatus: HealthStatus): string {
  const content = JSON.stringify({
    status: healthStatus.status,
    servicesStatus: Object.entries(healthStatus.services).map(([name, service]) => ({
      name,
      status: service.status
    }))
  })
  
  return `"${Buffer.from(content).toString('base64')}"`
}
```

## 🔧 Configurações Avançadas

### Passo 6: Implementar Rate Limiting

- [ ] Configurar rate limit para endpoint
- [ ] Definir limites por IP
- [ ] Implementar whitelist para monitoring tools
- [ ] Retornar headers de rate limit

```typescript
private setupRateLimit(): void {
  // Rate limiting: 60 requests per minute per IP
  this.server.addHook('preHandler', async (request, reply) => {
    if (request.url === '/health') {
      const rateLimitResult = await this.checkRateLimit(request.ip)
      
      if (!rateLimitResult.allowed) {
        reply.code(429).send({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded for health check endpoint'
        })
      }
    }
  })
}
```

### Passo 7: Implementar Conditional Requests

- [ ] Suportar If-None-Match header
- [ ] Retornar 304 Not Modified quando apropriado
- [ ] Otimizar bandwidth para monitoring frequente

```typescript
private handleConditionalRequest(request: FastifyRequest, healthStatus: HealthStatus): FastifyReply | null {
  const ifNoneMatch = request.headers['if-none-match']
  const currentETag = this.generateETag(healthStatus)
  
  if (ifNoneMatch === currentETag) {
    return ResponseFactory.create({
      status: HTTP_STATUS.NOT_MODIFIED,
      headers: {
        'ETag': currentETag,
        'Cache-Control': 'public, max-age=30'
      }
    })
  }
  
  return null
}
```

### Passo 8: Implementar Métricas Prometheus

- [ ] Contador de requisições por status
- [ ] Histogram de response times
- [ ] Gauge de último status conhecido
- [ ] Labels para diferentes tipos de client

```typescript
private updateMetrics(healthStatus: HealthStatus, responseTime: number): void {
  // Incrementar contador de requests
  this.metricsService.incrementCounter('health_check_requests_total', {
    status: healthStatus.status
  })
  
  // Registrar response time
  this.metricsService.observeHistogram('health_check_response_time_seconds', responseTime / 1000)
  
  // Atualizar gauge de status
  this.metricsService.setGauge('health_check_status', healthStatus.status === 'healthy' ? 1 : 0)
  
  // Métricas por serviço
  Object.entries(healthStatus.services).forEach(([serviceName, service]) => {
    this.metricsService.setGauge('service_health_status', service.status === 'up' ? 1 : 0, {
      service: serviceName
    })
  })
}
```

## ✅ Critérios de Aceitação

- [ ] Rota `/health` registrada e funcional
- [ ] Resposta JSON estruturada corretamente
- [ ] Status HTTP apropriados retornados
- [ ] Headers de cache configurados
- [ ] Rate limiting implementado
- [ ] Logging estruturado funcionando
- [ ] Métricas sendo coletadas
- [ ] Tratamento de erros robusto
- [ ] Performance otimizada

## 🔗 Dependências

- `HealthCheckService` para lógica de negócio
- `HttpServer` (Fastify) para registrar rota
- `Logger` para logging estruturado
- `ResponseFactory` para padronização
- `MetricsService` (opcional) para observabilidade

## 📚 Referências

- RFC 7231 - HTTP Status Codes
- RFC 7234 - HTTP Caching
- Prometheus Metrics Best Practices
- Fastify Documentation
- Health Check API Standards
