# 🎯 Sprint 1 - Implementação de Webhooks Stripe

## 📋 Overview
**Objetivo**: Criar sistema robusto de webhooks para sincronização automática com Stripe  
**Duração**: 2 semanas  
**Prioridade**: 🔴 CRÍTICA  

---

## **📦 Atividade 1.1: Estrutura Base de Webhooks**

### **Checklist de Desenvolvimento**
- [ ] **Dia 1**: Configuração inicial do endpoint
- [ ] **Dia 2**: Validação de assinatura Stripe
- [ ] **Dia 3**: Handler principal de eventos
- [ ] **Dia 4**: Testes básicos de integração

### **Arquivos para Criar**

#### 1. Controller Principal
```typescript
// src/infra/webhook/stripe-webhook-controller.ts
@injectable()
export class StripeWebhookController implements Controller {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify) private httpServer: HttpServer,
    @inject(SHARED_TYPES.Queue.StripeWebhookHandler) private webhookHandler: StripeWebhookHandler,
    @inject(SHARED_TYPES.Logger) private logger: LoggerService
  ) {}

  async init(): Promise<void> {
    await this.httpServer.register('POST', '/webhook/stripe', {
      config: { rawBody: true },
      handler: this.handleWebhook.bind(this)
    })
  }

  private async handleWebhook(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // Implementação do handler
  }
}
```

#### 2. Validador de Assinatura
```typescript
// src/infra/webhook/stripe-signature-validator.ts
@injectable()
export class StripeSignatureValidator {
  validate(payload: string, signature: string): boolean {
    // Validação usando stripe.webhooks.constructEvent
  }
}
```

#### 3. Handler de Eventos
```typescript
// src/infra/webhook/stripe-webhook-handler.ts
@injectable()
export class StripeWebhookHandler {
  async handle(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
        return this.handleSubscriptionCreated(event.data.object)
      case 'customer.subscription.updated':
        return this.handleSubscriptionUpdated(event.data.object)
      case 'invoice.payment_succeeded':
        return this.handlePaymentSucceeded(event.data.object)
      case 'invoice.payment_failed':
        return this.handlePaymentFailed(event.data.object)
      default:
        this.logger.info(`Unhandled webhook event: ${event.type}`)
    }
  }
}
```

### **Testes para Implementar**
```typescript
// test/integration/webhook/stripe-webhook.test.ts
describe('Stripe Webhook Integration', () => {
  beforeEach(async () => {
    await app.ready()
  })

  it('should process subscription.created webhook', async () => {
    const payload = createWebhookPayload('customer.subscription.created')
    const signature = generateStripeSignature(payload)
    
    const response = await app.inject({
      method: 'POST',
      url: '/webhook/stripe',
      payload,
      headers: { 'stripe-signature': signature }
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({ received: true })
  })

  it('should reject invalid signatures', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/webhook/stripe',
      payload: '{}',
      headers: { 'stripe-signature': 'invalid_signature' }
    })

    expect(response.statusCode).toBe(400)
  })
})
```

---

## **📦 Atividade 1.2: Handlers Específicos de Eventos**

### **Checklist de Desenvolvimento**
- [ ] **Dia 5**: Handler para subscription events
- [ ] **Dia 6**: Handler para payment events
- [ ] **Dia 7**: Handler para customer events
- [ ] **Dia 8**: Sincronização com banco local

### **Use Cases para Implementar**

#### 1. Sincronização de Subscription
```typescript
// src/subscription/use-case/sync-subscription-with-stripe.usecase.ts
@injectable()
export class SyncSubscriptionWithStripeUseCase {
  constructor(
    @inject(SUBSCRIPTION_TYPES.Repository) private subscriptionRepo: SubscriptionRepository,
    @inject(SHARED_TYPES.Gateway.Stripe) private stripeGateway: StripeSubscriptionGateway
  ) {}

  async execute(stripeSubscriptionId: string): Promise<Either<Error, void>> {
    // 1. Buscar subscription no Stripe
    // 2. Buscar subscription local
    // 3. Sincronizar dados (status, próxima cobrança, etc.)
    // 4. Atualizar no banco local
  }
}
```

#### 2. Atualização de Status de Pagamento
```typescript
// src/subscription/use-case/update-payment-status.usecase.ts
@injectable()
export class UpdatePaymentStatusUseCase {
  async execute(invoiceId: string, status: 'succeeded' | 'failed'): Promise<Either<Error, void>> {
    // 1. Buscar invoice no Stripe
    // 2. Identificar subscription relacionada
    // 3. Atualizar status local
    // 4. Disparar eventos de domínio (se necessário)
  }
}
```

---

## **📦 Atividade 1.3: Sistema de Tratamento de Erros**

### **Checklist de Desenvolvimento**
- [ ] **Dia 9**: Retry logic para webhooks falhados
- [ ] **Dia 10**: Dead letter queue para eventos problemáticos
- [ ] **Dia 11**: Notificações de erro para admins
- [ ] **Dia 12**: Dashboard de monitoramento

### **Implementações Necessárias**

#### 1. Retry Logic
```typescript
// src/infra/webhook/webhook-retry-handler.ts
@injectable()
export class WebhookRetryHandler {
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAYS = [1000, 5000, 15000] // ms

  async handleWithRetry(event: Stripe.Event, attempt: number = 0): Promise<void> {
    try {
      await this.webhookHandler.handle(event)
    } catch (error) {
      if (attempt < this.MAX_RETRIES) {
        await this.delay(this.RETRY_DELAYS[attempt])
        return this.handleWithRetry(event, attempt + 1)
      }
      
      // Enviar para dead letter queue
      await this.sendToDeadLetterQueue(event, error)
    }
  }
}
```

#### 2. Dead Letter Queue
```typescript
// src/infra/queue/webhook-dead-letter-queue.ts
@injectable()
export class WebhookDeadLetterQueue {
  async add(event: Stripe.Event, error: Error): Promise<void> {
    // Salvar evento problemático para análise posterior
    await this.queueService.publish('webhook.dead_letter', {
      event,
      error: error.message,
      timestamp: new Date(),
      attempts: 3
    })
  }
}
```

---

## **📦 Atividade 1.4: Testes e Validação**

### **Checklist de Desenvolvimento**
- [ ] **Dia 13**: Testes unitários completos
- [ ] **Dia 14**: Testes de integração
- [ ] **Dia 14**: Testes de carga (opcional)

### **Cenários de Teste Críticos**

#### 1. Testes de Eventos Válidos
```typescript
describe('Webhook Event Processing', () => {
  it('should sync subscription status when updated', async () => {
    // Cenário: Stripe atualiza status de subscription
    // Resultado: Status local deve ser atualizado também
  })

  it('should handle payment succeeded', async () => {
    // Cenário: Pagamento aprovado
    // Resultado: Subscription ativa, usuário notificado
  })

  it('should handle payment failed', async () => {
    // Cenário: Pagamento negado
    // Resultado: Retry logic ativado, usuário notificado
  })
})
```

#### 2. Testes de Falha
```typescript
describe('Webhook Error Handling', () => {
  it('should retry failed webhook processing', async () => {
    // Simular falha temporária no banco
    // Verificar que retry foi executado
  })

  it('should send to dead letter queue after max retries', async () => {
    // Simular falhas consecutivas
    // Verificar envio para DLQ
  })
})
```

---

## **⚡ Quick Start - Implementação Imediata**

### **Comando para Iniciar**
```bash
# 1. Criar estrutura de diretórios
mkdir -p src/infra/webhook
mkdir -p test/integration/webhook

# 2. Instalar dependências (se necessário)
npm install stripe@latest

# 3. Configurar variáveis de ambiente
echo "STRIPE_WEBHOOK_SECRET=whsec_test_..." >> .env
```

### **Primeiro Arquivo a Criar**
```typescript
// src/infra/webhook/stripe-webhook.routes.ts
import { FastifyInstance } from 'fastify'
import { container } from '@/bootstrap/container'
import { TYPES } from '@/infra/ioc/types'
import { StripeWebhookController } from './stripe-webhook-controller'

export async function stripeWebhookRoutes(app: FastifyInstance) {
  const webhookController = container.get<StripeWebhookController>(TYPES.StripeWebhookController)
  
  app.post('/webhook/stripe', {
    config: {
      rawBody: true
    }
  }, async (request, reply) => {
    await webhookController.handle(request, reply)
    return reply.status(200).send({ received: true })
  })
}
```

---

## **🎯 Critérios de Sucesso Sprint 1**

### **Funcionais**
- [ ] Endpoint `/webhook/stripe` responde corretamente
- [ ] Validação de assinatura Stripe funciona
- [ ] Eventos críticos são processados sem erro
- [ ] Retry logic funciona conforme esperado
- [ ] Testes passam com 100% de cobertura

### **Não-Funcionais**
- [ ] Webhook responde em < 500ms
- [ ] Sistema suporta 100 webhooks simultâneos
- [ ] 0 perda de eventos críticos
- [ ] Logs estruturados para auditoria
- [ ] Monitoramento básico funcionando

### **Entrega**
- [ ] Branch `feature/stripe-webhooks` criada
- [ ] Pull request com documentação
- [ ] Deploy em ambiente de staging
- [ ] Webhooks testados com Stripe CLI
- [ ] Documentação atualizada

---

## **📚 Recursos e Referências**

### **Documentação Stripe**
- [Webhook Guide](https://stripe.com/docs/webhooks)
- [Event Types](https://stripe.com/docs/api/events/types)
- [Webhook Security](https://stripe.com/docs/webhooks/signatures)

### **Ferramentas de Desenvolvimento**
```bash
# Stripe CLI para testar webhooks localmente
stripe listen --forward-to localhost:3333/webhook/stripe

# Simular eventos
stripe trigger customer.subscription.created
```

### **Debugging**
```typescript
// Adicionar logs detalhados
this.logger.debug('Webhook received', {
  eventType: event.type,
  eventId: event.id,
  created: event.created
})
```

---

**🚀 Próxima Ação**: Começar pela criação do arquivo `stripe-webhook.routes.ts` e configurar o endpoint básico!
