# 🗄️ Database Health Provider - Plano de Implementação

## 🎯 Objetivo

Implementar o provider responsável por verificar a saúde da conexão com o banco de dados PostgreSQL.

## 📁 Localização

`src/shared/infra/health/providers/database-health.provider.ts`

## 📋 Atividades

### Passo 1: Estrutura Base do Provider

- [ ] Criar classe `DatabaseHealthProvider` com decorator `@injectable()`
- [ ] Implementar interface `HealthProvider`
- [ ] Configurar injeção de dependências do Prisma Client
- [ ] Definir propriedade `name` como 'database'

### Passo 2: Implementar Método `check()`

- [ ] Executar query simples para testar conectividade
- [ ] Medir tempo de resposta da query
- [ ] Capturar informações do pool de conexões
- [ ] Tratar erros de conexão específicos

### Passo 3: Implementar Verificação de Pool

- [ ] Obter status do pool de conexões
- [ ] Verificar número de conexões ativas/idle
- [ ] Detectar vazamentos de conexão
- [ ] Monitorar latência de queries

### Passo 4: Implementar Verificações Avançadas

- [ ] Testar read/write capabilities
- [ ] Verificar replicação (se aplicável)
- [ ] Validar esquema do banco
- [ ] Checar espaço em disco disponível

### Passo 5: Implementar Métricas Específicas

- [ ] Coletar métricas de performance
- [ ] Monitorar locks ativos
- [ ] Rastrear queries lentas
- [ ] Exportar estatísticas de conexão

## 📝 Implementação Detalhada

### Estrutura da Classe
```typescript
@injectable()
export class DatabaseHealthProvider implements HealthProvider {
  public readonly name = 'database'
  
  constructor(
    @inject(TYPES.Database.PrismaClient)
    private readonly prismaClient: PrismaClient,
    
    @inject(TYPES.Logger)
    private readonly logger: Logger
  ) {}
}
```

### Método check() Principal
```typescript
public async check(): Promise<ServiceHealth> {
  const startTime = Date.now()
  const lastCheck = new Date().toISOString()
  
  try {
    // Verificação básica de conectividade
    await this.basicConnectivityCheck()
    
    // Verificações avançadas
    const metadata = await this.gatherDatabaseMetrics()
    
    const responseTime = Date.now() - startTime
    
    this.logger.debug('Database health check completed successfully', {
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
    
    this.logger.error('Database health check failed', {
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
        errorType: error.constructor.name
      }
    }
  }
}
```

### Verificação Básica de Conectividade
```typescript
private async basicConnectivityCheck(): Promise<void> {
  try {
    // Query simples para testar conectividade
    const result = await this.prismaClient.$queryRaw`SELECT 1 as health_check`
    
    if (!result || !Array.isArray(result) || result.length === 0) {
      throw new Error('Database returned unexpected result for health check')
    }
    
    // Verificar se consegue fazer operações básicas
    await this.prismaClient.$queryRaw`SELECT NOW() as current_time`
    
  } catch (error) {
    throw new Error(`Database connectivity check failed: ${error.message}`)
  }
}
```

### Coleta de Métricas do Banco
```typescript
private async gatherDatabaseMetrics(): Promise<ServiceMetadata> {
  try {
    const [
      connectionInfo,
      databaseStats,
      performanceMetrics
    ] = await Promise.allSettled([
      this.getConnectionInfo(),
      this.getDatabaseStats(),
      this.getPerformanceMetrics()
    ])
    
    return {
      connection: this.extractResult(connectionInfo),
      database: this.extractResult(databaseStats),
      performance: this.extractResult(performanceMetrics),
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    this.logger.warn('Failed to gather complete database metrics', error)
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
  // Obter informações do pool de conexões do Prisma
  const connectionStatus = {
    // Prisma não expõe métricas de pool diretamente
    // Implementar via queries SQL quando possível
    maxConnections: await this.getMaxConnections(),
    activeConnections: await this.getActiveConnections(),
    idleConnections: await this.getIdleConnections(),
    databaseName: await this.getDatabaseName(),
    version: await this.getDatabaseVersion()
  }
  
  return connectionStatus
}

private async getMaxConnections(): Promise<number> {
  const result = await this.prismaClient.$queryRaw<[{max_connections: string}]>`
    SHOW max_connections
  `
  return parseInt(result[0].max_connections)
}

private async getActiveConnections(): Promise<number> {
  const result = await this.prismaClient.$queryRaw<[{count: bigint}]>`
    SELECT COUNT(*) as count 
    FROM pg_stat_activity 
    WHERE state = 'active'
  `
  return Number(result[0].count)
}

private async getDatabaseName(): Promise<string> {
  const result = await this.prismaClient.$queryRaw<[{current_database: string}]>`
    SELECT current_database()
  `
  return result[0].current_database
}

private async getDatabaseVersion(): Promise<string> {
  const result = await this.prismaClient.$queryRaw<[{version: string}]>`
    SELECT version()
  `
  return result[0].version.split(' ')[1] // Extrair apenas a versão
}
```

### Estatísticas do Banco
```typescript
private async getDatabaseStats(): Promise<any> {
  try {
    const [diskUsage, tableStats] = await Promise.all([
      this.getDiskUsage(),
      this.getTableStats()
    ])
    
    return {
      diskUsage,
      tableStats,
      uptime: await this.getDatabaseUptime()
    }
  } catch (error) {
    throw new Error(`Failed to get database stats: ${error.message}`)
  }
}

private async getDiskUsage(): Promise<any> {
  const result = await this.prismaClient.$queryRaw<Array<{
    database_name: string,
    size_mb: number
  }>>`
    SELECT 
      datname as database_name,
      pg_size_pretty(pg_database_size(datname)) as size_pretty,
      ROUND(pg_database_size(datname) / 1024.0 / 1024.0, 2) as size_mb
    FROM pg_database 
    WHERE datname = current_database()
  `
  
  return result[0]
}

private async getTableStats(): Promise<any> {
  const result = await this.prismaClient.$queryRaw<Array<{
    table_name: string,
    row_count: bigint,
    size_mb: number
  }>>`
    SELECT 
      schemaname,
      tablename as table_name,
      n_tup_ins + n_tup_upd + n_tup_del as total_operations,
      n_live_tup as row_count,
      ROUND(pg_total_relation_size(schemaname||'.'||tablename) / 1024.0 / 1024.0, 2) as size_mb
    FROM pg_stat_user_tables 
    ORDER BY size_mb DESC 
    LIMIT 5
  `
  
  return result
}
```

### Métricas de Performance
```typescript
private async getPerformanceMetrics(): Promise<any> {
  try {
    const [slowQueries, lockInfo] = await Promise.all([
      this.getSlowQueries(),
      this.getLockInfo()
    ])
    
    return {
      slowQueries,
      locks: lockInfo,
      avgResponseTime: await this.getAverageResponseTime()
    }
  } catch (error) {
    this.logger.warn('Failed to get performance metrics', error)
    return {
      error: 'Performance metrics unavailable'
    }
  }
}

private async getSlowQueries(): Promise<any> {
  // Requer pg_stat_statements extension
  try {
    const result = await this.prismaClient.$queryRaw<Array<{
      query: string,
      calls: bigint,
      mean_time: number
    }>>`
      SELECT 
        query,
        calls,
        mean_exec_time as mean_time
      FROM pg_stat_statements 
      WHERE mean_exec_time > 100 
      ORDER BY mean_exec_time DESC 
      LIMIT 5
    `
    
    return result
  } catch (error) {
    // Extension não disponível
    return { note: 'pg_stat_statements extension not available' }
  }
}

private async getLockInfo(): Promise<any> {
  const result = await this.prismaClient.$queryRaw<Array<{
    lock_type: string,
    count: bigint
  }>>`
    SELECT 
      mode as lock_type,
      COUNT(*) as count
    FROM pg_locks 
    GROUP BY mode
  `
  
  return result
}
```

### Tratamento de Erros Específicos
```typescript
private formatError(error: any): string {
  // Mapear códigos de erro específicos do PostgreSQL
  const errorMappings = {
    'ECONNREFUSED': 'Database connection refused',
    'ENOTFOUND': 'Database host not found',
    'ECONNRESET': 'Database connection reset',
    'ETIMEDOUT': 'Database connection timeout',
    'P1001': 'Cannot reach database server',
    'P1002': 'Database server timeout',
    'P1003': 'Database does not exist',
    'P1008': 'Operations timed out',
    'P1009': 'Database already exists',
    'P1010': 'User access denied'
  }
  
  const knownError = errorMappings[error.code] || errorMappings[error.errno]
  
  if (knownError) {
    return knownError
  }
  
  // Sanitizar mensagem de erro para não expor informações sensíveis
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

## ✅ Critérios de Aceitação

- [ ] Provider implementado e funcional
- [ ] Verificação básica de conectividade funcionando
- [ ] Métricas de pool de conexões coletadas
- [ ] Estatísticas do banco disponíveis
- [ ] Métricas de performance capturadas
- [ ] Tratamento robusto de erros
- [ ] Logging estruturado implementado
- [ ] Performance otimizada

## 🔗 Dependências

- `PrismaClient` para acesso ao banco
- `Logger` para logging estruturado
- Types do health check
- Container IoC para injeção

## 📚 Referências

- Prisma Client Documentation
- PostgreSQL System Information Functions
- Database Health Check Best Practices
- Connection Pool Monitoring
