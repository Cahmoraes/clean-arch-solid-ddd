# 📧 Email Health Provider - Plano de Implementação

## 🎯 Objetivo

Implementar o provider responsável por verificar a saúde da conectividade com o serviço de email via Nodemailer.

## 📁 Localização

`src/shared/infra/health/providers/email-health.provider.ts`

## 📋 Atividades

### Passo 1: Estrutura Base do Provider

- [ ] Criar classe `EmailHealthProvider` com decorator `@injectable()`
- [ ] Implementar interface `HealthProvider`
- [ ] Configurar injeção de dependências do Nodemailer
- [ ] Definir propriedade `name` como 'email'

### Passo 2: Implementar Método `check()`

- [ ] Verificar conectividade SMTP sem enviar email
- [ ] Medir tempo de resposta da conexão
- [ ] Capturar informações do servidor SMTP
- [ ] Tratar erros de autenticação e conexão

### Passo 3: Implementar Verificação de Autenticação

- [ ] Testar credenciais SMTP
- [ ] Verificar capacidades do servidor
- [ ] Validar certificados SSL/TLS
- [ ] Detectar limitações de rate limit

### Passo 4: Implementar Verificações Avançadas

- [ ] Testar envio para email de teste (opcional)
- [ ] Verificar quotas disponíveis
- [ ] Monitorar delivery status
- [ ] Validar configurações de segurança

### Passo 5: Implementar Métricas Específicas

- [ ] Coletar estatísticas de envio
- [ ] Monitorar bounce rates
- [ ] Rastrear tempo de entrega
- [ ] Exportar métricas de provider

## 📝 Implementação Detalhada

### Estrutura da Classe
```typescript
@injectable()
export class EmailHealthProvider implements HealthProvider {
  public readonly name = 'email'
  
  constructor(
    @inject(TYPES.Services.Email)
    private readonly emailService: EmailService,
    
    @inject(TYPES.Logger)
    private readonly logger: Logger,
    
    @inject(TYPES.Config.Email)
    private readonly emailConfig: EmailConfig
  ) {}
}
```

### Método check() Principal
```typescript
public async check(): Promise<ServiceHealth> {
  const startTime = Date.now()
  const lastCheck = new Date().toISOString()
  
  try {
    // Verificação de conectividade SMTP
    await this.verifySmtpConnection()
    
    // Verificações avançadas
    const metadata = await this.gatherEmailMetrics()
    
    const responseTime = Date.now() - startTime
    
    this.logger.debug('Email health check completed successfully', {
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
    
    this.logger.error('Email health check failed', {
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
        host: this.emailConfig.host,
        port: this.emailConfig.port
      }
    }
  }
}
```

### Verificação de Conexão SMTP
```typescript
private async verifySmtpConnection(): Promise<void> {
  try {
    // Criar transporter temporário para teste
    const transporter = nodemailer.createTransporter({
      host: this.emailConfig.host,
      port: this.emailConfig.port,
      secure: this.emailConfig.secure,
      auth: {
        user: this.emailConfig.user,
        pass: this.emailConfig.password
      },
      connectionTimeout: 5000,
      socketTimeout: 5000
    })
    
    // Verificar conexão sem enviar email
    const isConnected = await transporter.verify()
    
    if (!isConnected) {
      throw new Error('SMTP server verification failed')
    }
    
    // Fechar conexão
    transporter.close()
    
  } catch (error) {
    throw new Error(`SMTP connection failed: ${error.message}`)
  }
}
```

### Coleta de Métricas do Email
```typescript
private async gatherEmailMetrics(): Promise<ServiceMetadata> {
  try {
    const [
      smtpInfo,
      serverCapabilities,
      connectionStats
    ] = await Promise.allSettled([
      this.getSmtpInfo(),
      this.getServerCapabilities(),
      this.getConnectionStats()
    ])
    
    return {
      smtp: this.extractResult(smtpInfo),
      capabilities: this.extractResult(serverCapabilities),
      connection: this.extractResult(connectionStats),
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    this.logger.warn('Failed to gather complete email metrics', error)
    return {
      error: 'Failed to gather complete metrics',
      timestamp: new Date().toISOString()
    }
  }
}
```

### Informações do SMTP
```typescript
private async getSmtpInfo(): Promise<any> {
  return {
    host: this.emailConfig.host,
    port: this.emailConfig.port,
    secure: this.emailConfig.secure,
    authMethod: this.emailConfig.authMethod || 'PLAIN',
    maxConnections: this.emailConfig.maxConnections || 5,
    maxMessages: this.emailConfig.maxMessages || 100,
    rateDelta: this.emailConfig.rateDelta || 1000,
    rateLimit: this.emailConfig.rateLimit || 5
  }
}
```

### Capacidades do Servidor
```typescript
private async getServerCapabilities(): Promise<any> {
  try {
    const transporter = nodemailer.createTransporter({
      host: this.emailConfig.host,
      port: this.emailConfig.port,
      secure: this.emailConfig.secure,
      auth: {
        user: this.emailConfig.user,
        pass: this.emailConfig.password
      }
    })
    
    // Conectar e obter informações do servidor
    await new Promise((resolve, reject) => {
      transporter.on('idle', () => {
        transporter.close()
        resolve(true)
      })
      
      transporter.on('error', (error) => {
        transporter.close()
        reject(error)
      })
      
      // Forçar conexão
      transporter.verify((error, success) => {
        if (error) {
          reject(error)
        } else {
          resolve(success)
        }
      })
    })
    
    return {
      supportsTLS: true, // Assumir suporte se conectou com secure
      supportsAuth: true,
      maxMessageSize: '25MB', // Padrão Gmail
      serverGreeting: 'SMTP Server Ready'
    }
    
  } catch (error) {
    throw new Error(`Failed to get server capabilities: ${error.message}`)
  }
}
```

### Estatísticas de Conexão
```typescript
private async getConnectionStats(): Promise<any> {
  try {
    // Simular verificação de performance
    const connectionTest = await this.performConnectionTest()
    
    return {
      latency: connectionTest.latency,
      throughput: connectionTest.throughput,
      lastSuccessfulConnection: new Date().toISOString(),
      connectionPool: {
        active: 0,
        idle: this.emailConfig.maxConnections || 5,
        total: this.emailConfig.maxConnections || 5
      }
    }
  } catch (error) {
    throw new Error(`Failed to get connection stats: ${error.message}`)
  }
}

private async performConnectionTest(): Promise<{latency: number, throughput: string}> {
  const startTime = Date.now()
  
  try {
    // Teste simples de latência
    const transporter = nodemailer.createTransporter({
      host: this.emailConfig.host,
      port: this.emailConfig.port,
      secure: this.emailConfig.secure,
      auth: {
        user: this.emailConfig.user,
        pass: this.emailConfig.password
      },
      connectionTimeout: 3000
    })
    
    await transporter.verify()
    transporter.close()
    
    const latency = Date.now() - startTime
    
    return {
      latency,
      throughput: this.calculateThroughput(latency)
    }
  } catch (error) {
    throw error
  }
}

private calculateThroughput(latency: number): string {
  // Estimativa simples baseada na latência
  if (latency < 100) return 'High'
  if (latency < 500) return 'Medium'
  return 'Low'
}
```

### Teste de Envio (Opcional)
```typescript
private async performSendTest(): Promise<boolean> {
  try {
    // Só executar se configurado para teste
    if (!this.emailConfig.enableHealthCheckTest) {
      return true
    }
    
    const testEmail = {
      from: this.emailConfig.from,
      to: this.emailConfig.testEmail || this.emailConfig.from,
      subject: 'Health Check Test',
      text: `Health check test email sent at ${new Date().toISOString()}`,
      headers: {
        'X-Health-Check': 'true',
        'X-Timestamp': Date.now().toString()
      }
    }
    
    const result = await this.emailService.sendEmail(testEmail)
    
    this.logger.info('Health check test email sent successfully', {
      messageId: result.messageId,
      to: testEmail.to
    })
    
    return true
    
  } catch (error) {
    this.logger.warn('Health check test email failed', {
      error: error.message
    })
    
    // Não falhar o health check por causa do teste de envio
    return false
  }
}
```

### Tratamento de Erros Específicos
```typescript
private formatError(error: any): string {
  // Mapear códigos de erro específicos do SMTP
  const errorMappings = {
    'ECONNREFUSED': 'SMTP server connection refused',
    'ENOTFOUND': 'SMTP server not found',
    'ECONNRESET': 'SMTP connection reset',
    'ETIMEDOUT': 'SMTP connection timeout',
    'EMESSAGE': 'Invalid email message format',
    'EAUTH': 'SMTP authentication failed',
    'EENVELOPE': 'Invalid email envelope',
    'ESOCKET': 'Socket error with SMTP server'
  }
  
  const knownError = errorMappings[error.code] || errorMappings[error.errno]
  
  if (knownError) {
    return knownError
  }
  
  // Sanitizar mensagem de erro para não expor credenciais
  return error.message
    .replace(/password=[^;]*/gi, 'password=***')
    .replace(/user=[^;]*/gi, 'user=***')
    .replace(/auth:\s*{[^}]*}/gi, 'auth: { *** }')
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

### Configuração de Rate Limiting
```typescript
private async checkRateLimits(): Promise<{withinLimits: boolean, details: any}> {
  try {
    // Verificar se estamos dentro dos limites do provider
    const stats = await this.getRecentSendingStats()
    
    const gmailLimits = {
      dailyLimit: 500, // Limite diário para contas gratuitas
      minuteLimit: 10,  // Limite por minuto
      hourlyLimit: 100  // Limite por hora
    }
    
    return {
      withinLimits: stats.dailySent < gmailLimits.dailyLimit && 
                    stats.minuteSent < gmailLimits.minuteLimit,
      details: {
        limits: gmailLimits,
        current: stats,
        utilizationPercentage: {
          daily: (stats.dailySent / gmailLimits.dailyLimit) * 100,
          minute: (stats.minuteSent / gmailLimits.minuteLimit) * 100
        }
      }
    }
  } catch (error) {
    return {
      withinLimits: true, // Assumir OK se não conseguir verificar
      details: { error: 'Could not check rate limits' }
    }
  }
}

private async getRecentSendingStats(): Promise<{dailySent: number, minuteSent: number, hourSent: number}> {
  // Esta implementação dependeria de como você está rastreando envios
  // Por exemplo, via Redis, banco de dados, ou sistema de métricas
  return {
    dailySent: 0,
    minuteSent: 0,
    hourSent: 0
  }
}
```

## ✅ Critérios de Aceitação

- [ ] Provider implementado e funcional
- [ ] Verificação de conectividade SMTP funcionando
- [ ] Autenticação testada sem exposer credenciais
- [ ] Métricas de performance coletadas
- [ ] Capacidades do servidor verificadas
- [ ] Rate limits monitorados
- [ ] Tratamento robusto de erros
- [ ] Logging estruturado implementado
- [ ] Teste de envio opcional funcionando

## 🔗 Dependências

- `EmailService` ou Nodemailer diretamente
- `Logger` para logging estruturado
- `EmailConfig` para configurações
- Types do health check
- Container IoC para injeção

## 📚 Referências

- Nodemailer Documentation
- SMTP Protocol Specifications
- Gmail/Outlook API Limits
- Email Service Health Check Best Practices
