# 🐰 RabbitMQ Health Provider - Plano de Implementação

## 🎯 Objetivo

Implementar o provider responsável por verificar a saúde da conectividade com o RabbitMQ e suas filas.

## 📁 Localização

`src/shared/infra/health/providers/rabbitmq-health.provider.ts`

## 📋 Atividades

### Passo 1: Estrutura Base do Provider

- [ ] Criar classe `RabbitMQHealthProvider` com decorator `@injectable()`
- [ ] Implementar interface `HealthProvider`
- [ ] Configurar injeção de dependências do RabbitMQ client
- [ ] Definir propriedade `name` como 'messageQueue'

### Passo 2: Implementar Método `check()`

- [ ] Verificar conectividade com broker RabbitMQ
- [ ] Medir tempo de resposta da conexão
- [ ] Capturar status das filas principais
- [ ] Tratar erros de conexão e autenticação

### Passo 3: Implementar Verificação de Filas

- [ ] Listar filas existentes
- [ ] Verificar número de mensagens pendentes
- [ ] Monitorar consumidores ativos
- [ ] Detectar filas problemáticas

### Passo 4: Implementar Verificações Avançadas

- [ ] Testar publicação/consumo de mensagem teste
- [ ] Verificar exchanges e bindings
- [ ] Monitorar deadletter queues
- [ ] Validar configurações de durabilidade

### Passo 5: Implementar Métricas Específicas

- [ ] Coletar métricas de throughput
- [ ] Monitorar latência de mensagens
- [ ] Rastrear taxa de erro de delivery
- [ ] Exportar estatísticas de cluster

## 📝 Implementação Detalhada

### Estrutura da Classe
```typescript
@injectable()
export class RabbitMQHealthProvider implements HealthProvider {
  public readonly name = 'messageQueue'
  
  constructor(
    @inject(TYPES.Services.MessageQueue)
    private readonly messageQueueService: MessageQueueService,
    
    @inject(TYPES.Logger)
    private readonly logger: Logger,
    
    @inject(TYPES.Config.RabbitMQ)
    private readonly rabbitConfig: RabbitMQConfig
  ) {}
}
```

### Método check() Principal
```typescript
public async check(): Promise<ServiceHealth> {
  const startTime = Date.now()
  const lastCheck = new Date().toISOString()
  
  try {
    // Verificação de conectividade
    await this.verifyConnection()
    
    // Verificações avançadas
    const metadata = await this.gatherRabbitMQMetrics()
    
    const responseTime = Date.now() - startTime
    
    this.logger.debug('RabbitMQ health check completed successfully', {
      responseTime,
      metadata
    })
    
    return {
      status: ServiceStatusType.UP,
      responseTime,
      lastCheck,
      metadata
    }
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    
    this.logger.error('RabbitMQ health check failed', {
      error: error.message,
      responseTime,
      errorCode: error.code
    })
    
    return {
      status: ServiceStatusType.DOWN,
      responseTime,
      lastCheck,
      error: this.formatError(error),
      metadata: {
        errorCode: error.code,
        errorType: error.constructor.name,
        host: this.rabbitConfig.host,
        port: this.rabbitConfig.port
      }
    }
  }
}
```

### Verificação de Conectividade
```typescript
private async verifyConnection(): Promise<void> {
  try {
    // Verificar se a conexão está ativa
    const isConnected = await this.messageQueueService.isConnected()
    
    if (!isConnected) {
      throw new Error('RabbitMQ connection is not active')
    }
    
    // Verificar se consegue acessar informações básicas
    await this.messageQueueService.getConnectionInfo()
    
  } catch (error) {
    throw new Error(`RabbitMQ connection verification failed: ${error.message}`)
  }
}
```

### Coleta de Métricas do RabbitMQ
```typescript
private async gatherRabbitMQMetrics(): Promise<ServiceMetadata> {
  try {
    const [
      connectionInfo,
      queueStats,
      clusterInfo,
      performanceMetrics
    ] = await Promise.allSettled([
      this.getConnectionInfo(),
      this.getQueueStats(),
      this.getClusterInfo(),
      this.getPerformanceMetrics()
    ])
    
    return {
      connection: this.extractResult(connectionInfo),
      queues: this.extractResult(queueStats),
      cluster: this.extractResult(clusterInfo),
      performance: this.extractResult(performanceMetrics),
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    this.logger.warn('Failed to gather complete RabbitMQ metrics', error)
    return {
      error: 'Failed to gather complete metrics',
      timestamp: new Date().toISOString()
    }
  }
}
```

### Informações de Conexão
```typescript
private async getConnectionInfo(): Promise<any> {
  try {
    const connectionDetails = await this.messageQueueService.getConnectionInfo()
    
    return {
      host: this.rabbitConfig.host,
      port: this.rabbitConfig.port,
      vhost: this.rabbitConfig.vhost || '/',
      protocol: this.rabbitConfig.protocol || 'amqp',
      heartbeat: this.rabbitConfig.heartbeat || 60,
      connectionTimeout: this.rabbitConfig.connectionTimeout || 10000,
      channelsCount: connectionDetails.channelsCount || 0,
      isConnected: connectionDetails.isConnected || false,
      connectionName: connectionDetails.connectionName || 'health-check'
    }
  } catch (error) {
    throw new Error(`Failed to get connection info: ${error.message}`)
  }
}
```

### Estatísticas das Filas
```typescript
private async getQueueStats(): Promise<any> {
  try {
    const queues = await this.messageQueueService.listQueues()
    
    const queueDetails = await Promise.all(
      queues.map(async (queueName) => {
        try {
          const queueInfo = await this.messageQueueService.getQueueInfo(queueName)
          return {
            name: queueName,
            messages: queueInfo.messageCount || 0,
            consumers: queueInfo.consumerCount || 0,
            messagesReady: queueInfo.messagesReady || 0,
            messagesUnacknowledged: queueInfo.messagesUnacknowledged || 0,
            durable: queueInfo.durable || false,
            autoDelete: queueInfo.autoDelete || false,
            status: this.determineQueueStatus(queueInfo)
          }
        } catch (error) {
          return {
            name: queueName,
            error: error.message,
            status: 'error'
          }
        }
      })
    )
    
    return {
      totalQueues: queues.length,
      activeQueues: queueDetails.filter(q => q.status === 'healthy').length,
      problemQueues: queueDetails.filter(q => q.status !== 'healthy').length,
      queues: queueDetails
    }
  } catch (error) {
    throw new Error(`Failed to get queue stats: ${error.message}`)
  }
}

private determineQueueStatus(queueInfo: any): string {
  // Lógica para determinar se a fila está saudável
  const messageCount = queueInfo.messageCount || 0
  const consumerCount = queueInfo.consumerCount || 0
  
  // Fila com muitas mensagens sem consumidores pode indicar problema
  if (messageCount > 1000 && consumerCount === 0) {
    return 'warning'
  }
  
  // Fila com mensagens não-acknowledged muito altas
  if (queueInfo.messagesUnacknowledged > 100) {
    return 'warning'
  }
  
  return 'healthy'
}
```

### Informações do Cluster
```typescript
private async getClusterInfo(): Promise<any> {
  try {
    // Se usando RabbitMQ Management API
    const clusterStatus = await this.messageQueueService.getClusterStatus()
    
    return {
      nodes: clusterStatus.nodes || [],
      runningNodes: clusterStatus.runningNodes || [],
      partitions: clusterStatus.partitions || [],
      alarms: clusterStatus.alarms || [],
      diskFree: clusterStatus.diskFree || 'unknown',
      memoryUsed: clusterStatus.memoryUsed || 'unknown',
      uptime: clusterStatus.uptime || 0
    }
  } catch (error) {
    // Se não tiver acesso ao Management API, retornar info básica
    return {
      mode: 'single-node',
      note: 'Cluster information not available - using basic connection'
    }
  }
}
```

### Métricas de Performance
```typescript
private async getPerformanceMetrics(): Promise<any> {
  try {
    const [
      publishRate,
      consumeRate,
      latencyTest
    ] = await Promise.allSettled([
      this.getPublishRate(),
      this.getConsumeRate(),
      this.performLatencyTest()
    ])
    
    return {
      publishRate: this.extractResult(publishRate),
      consumeRate: this.extractResult(consumeRate),
      latency: this.extractResult(latencyTest)
    }
  } catch (error) {
    throw new Error(`Failed to get performance metrics: ${error.message}`)
  }
}

private async getPublishRate(): Promise<any> {
  // Implementar usando estatísticas do RabbitMQ ou métricas internas
  return {
    messagesPerSecond: 0,
    note: 'Publish rate monitoring not implemented'
  }
}

private async getConsumeRate(): Promise<any> {
  // Implementar usando estatísticas do RabbitMQ ou métricas internas  
  return {
    messagesPerSecond: 0,
    note: 'Consume rate monitoring not implemented'
  }
}

private async performLatencyTest(): Promise<any> {
  try {
    const testQueueName = 'health-check-test'
    const testMessage = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      data: 'health check test message'
    }
    
    const startTime = Date.now()
    
    // Publicar mensagem de teste
    await this.messageQueueService.publish(testQueueName, testMessage)
    
    // Consumir mensagem de teste
    const consumedMessage = await this.messageQueueService.consume(testQueueName, {
      timeout: 5000
    })
    
    const latency = Date.now() - startTime
    
    // Limpar mensagem de teste
    if (consumedMessage && consumedMessage.id === testMessage.id) {
      await this.messageQueueService.ack(consumedMessage)
    }
    
    return {
      roundTripLatency: latency,
      status: 'success'
    }
    
  } catch (error) {
    this.logger.warn('RabbitMQ latency test failed', error)
    return {
      error: error.message,
      status: 'failed'
    }
  }
}
```

### Verificação de Deadletter Queues
```typescript
private async checkDeadLetterQueues(): Promise<any> {
  try {
    const dlqNames = [
      'email_queue.dlq',
      'notification_queue.dlq',
      'failed_messages.dlq'
    ]
    
    const dlqStats = await Promise.all(
      dlqNames.map(async (dlqName) => {
        try {
          const queueInfo = await this.messageQueueService.getQueueInfo(dlqName)
          return {
            name: dlqName,
            messageCount: queueInfo.messageCount || 0,
            exists: true
          }
        } catch (error) {
          return {
            name: dlqName,
            exists: false,
            note: 'Queue does not exist'
          }
        }
      })
    )
    
    const totalDlqMessages = dlqStats
      .filter(dlq => dlq.exists)
      .reduce((sum, dlq) => sum + dlq.messageCount, 0)
    
    return {
      deadLetterQueues: dlqStats,
      totalFailedMessages: totalDlqMessages,
      status: totalDlqMessages > 0 ? 'warning' : 'healthy'
    }
  } catch (error) {
    return {
      error: 'Failed to check dead letter queues',
      status: 'unknown'
    }
  }
}
```

### Tratamento de Erros Específicos
```typescript
private formatError(error: any): string {
  // Mapear códigos de erro específicos do RabbitMQ
  const errorMappings = {
    'ECONNREFUSED': 'RabbitMQ server connection refused',
    'ENOTFOUND': 'RabbitMQ server not found',
    'ECONNRESET': 'RabbitMQ connection reset',
    'ETIMEDOUT': 'RabbitMQ connection timeout',
    'CHANNEL_ERROR': 'RabbitMQ channel error',
    'CONNECTION_FORCED': 'RabbitMQ connection forced close',
    'NOT_ALLOWED': 'RabbitMQ operation not allowed',
    'RESOURCE_ERROR': 'RabbitMQ resource error'
  }
  
  const knownError = errorMappings[error.code] || errorMappings[error.errno]
  
  if (knownError) {
    return knownError
  }
  
  // Sanitizar mensagem de erro para não expor credenciais
  return error.message
    .replace(/password=[^;]*/gi, 'password=***')
    .replace(/user=[^;]*/gi, 'user=***')
}

private extractResult(settledResult: PromiseSettledResult<any>): any {
  if (settledResult.status === 'fulfilled') {
    return settledResult.value
  }
  
  return {
    error: settledResult.reason?.message || 'Unknown error'
  }
}
```

### Health Check de Exchanges
```typescript
private async checkExchanges(): Promise<any> {
  try {
    const exchanges = await this.messageQueueService.listExchanges()
    
    const exchangeDetails = await Promise.all(
      exchanges.map(async (exchangeName) => {
        try {
          const exchangeInfo = await this.messageQueueService.getExchangeInfo(exchangeName)
          return {
            name: exchangeName,
            type: exchangeInfo.type || 'unknown',
            durable: exchangeInfo.durable || false,
            autoDelete: exchangeInfo.autoDelete || false,
            bindings: exchangeInfo.bindings || 0,
            status: 'healthy'
          }
        } catch (error) {
          return {
            name: exchangeName,
            error: error.message,
            status: 'error'
          }
        }
      })
    )
    
    return {
      totalExchanges: exchanges.length,
      exchanges: exchangeDetails
    }
  } catch (error) {
    return {
      error: 'Failed to check exchanges',
      note: 'Exchange information not available'
    }
  }
}
```

## ✅ Critérios de Aceitação

- [ ] Provider implementado e funcional
- [ ] Verificação de conectividade RabbitMQ funcionando
- [ ] Estatísticas de filas coletadas
- [ ] Métricas de performance capturadas
- [ ] Dead letter queues monitoradas
- [ ] Informações de cluster disponíveis
- [ ] Teste de latência funcionando
- [ ] Tratamento robusto de erros
- [ ] Logging estruturado implementado

## 🔗 Dependências

- `MessageQueueService` para interação com RabbitMQ
- `Logger` para logging estruturado
- `RabbitMQConfig` para configurações
- Types do health check
- Container IoC para injeção

## 📚 Referências

- RabbitMQ Management API Documentation
- AMQP 0.9.1 Protocol Specification
- RabbitMQ Monitoring Best Practices
- Message Queue Health Check Patterns
