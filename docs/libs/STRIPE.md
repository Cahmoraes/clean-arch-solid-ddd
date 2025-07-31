# Stripe

Stripe é uma plataforma completa de pagamentos que permite aceitar pagamentos online e processar transações financeiras de forma segura. O SDK Node.js do Stripe oferece uma interface robusta para integrar todos os recursos da plataforma.

## Principais Características

- **Pagamentos Online**: Cartões de crédito, débito, wallets digitais, PIX, boleto
- **Subscriptions**: Cobrança recorrente e gerenciamento de assinaturas
- **Marketplace**: Pagamentos multi-partes com Stripe Connect
- **Checkout**: Interface de checkout pré-construída e personalizável
- **Webhooks**: Notificações em tempo real de eventos de pagamento
- **Connect**: Plataforma para marketplaces e SaaS multi-tenant
- **Billing**: Faturamento avançado e gerenciamento de planos
- **Radar**: Prevenção de fraudes com machine learning
- **Terminal**: Pagamentos presenciais com hardware Stripe
- **TypeScript**: Suporte completo com tipagem strong

## Versão

Versão utilizada no projeto: **18.3.0**

## Instalação

```bash
npm install stripe
npm install --save-dev @types/stripe
```

## Casos de Uso no Projeto

### Configuração Inicial
```javascript
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  maxNetworkRetries: 3,
  timeout: 10000,
});
```

### Criar Cliente
```javascript
async function createCustomer(userData) {
  const customer = await stripe.customers.create({
    email: userData.email,
    name: userData.name,
    phone: userData.phone,
    address: {
      line1: userData.address.street,
      city: userData.address.city,
      state: userData.address.state,
      postal_code: userData.address.zipCode,
      country: 'BR',
    },
    metadata: {
      userId: userData.id.toString(),
      plan: 'basic'
    }
  });

  return customer;
}
```

### Processar Pagamento Único
```javascript
async function createPaymentIntent(amount, currency = 'brl', customerId) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100, // Stripe usa centavos
    currency: currency,
    customer: customerId,
    automatic_payment_methods: {
      enabled: true,
    },
    metadata: {
      order_id: 'order_123',
      customer_id: customerId
    }
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id
  };
}
```

### Criar Assinatura Recorrente
```javascript
async function createSubscription(customerId, priceId, trialDays = 0) {
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [
      {
        price: priceId,
      },
    ],
    trial_period_days: trialDays,
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'],
  });

  return {
    subscriptionId: subscription.id,
    clientSecret: subscription.latest_invoice.payment_intent.client_secret,
  };
}
```

### Cancelar Assinatura
```javascript
async function cancelSubscription(subscriptionId, cancelAtPeriodEnd = false) {
  if (cancelAtPeriodEnd) {
    // Cancelar no final do período atual
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    return subscription;
  } else {
    // Cancelar imediatamente
    const subscription = await stripe.subscriptions.cancel(subscriptionId);
    return subscription;
  }
}
```

### Checkout Session
```javascript
async function createCheckoutSession(items, customerId, successUrl, cancelUrl) {
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card', 'pix'],
    line_items: items.map(item => ({
      price_data: {
        currency: 'brl',
        product_data: {
          name: item.name,
          description: item.description,
          images: item.images,
        },
        unit_amount: item.price * 100,
      },
      quantity: item.quantity,
    })),
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    locale: 'pt-BR',
    metadata: {
      order_id: 'order_123'
    }
  });

  return session;
}
```

## Webhooks

### Configuração de Webhook
```javascript
const express = require('express');
const app = express();

// Middleware para receber raw body
app.use('/webhook', express.raw({ type: 'application/json' }));

app.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Processar eventos
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object);
      break;
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object);
      break;
    default:
      console.log(`Evento não tratado: ${event.type}`);
  }

  res.json({ received: true });
});
```

### Handlers de Eventos
```javascript
async function handlePaymentSucceeded(paymentIntent) {
  console.log('Pagamento bem-sucedido:', paymentIntent.id);
  
  // Atualizar status do pedido no banco de dados
  const orderId = paymentIntent.metadata.order_id;
  await updateOrderStatus(orderId, 'paid');
  
  // Enviar email de confirmação
  await sendPaymentConfirmationEmail(paymentIntent.customer);
}

async function handleSubscriptionCreated(subscription) {
  console.log('Nova assinatura criada:', subscription.id);
  
  // Ativar recursos premium para o usuário
  const customerId = subscription.customer;
  await activatePremiumFeatures(customerId);
}

async function handleInvoicePaymentFailed(invoice) {
  console.log('Falha no pagamento da fatura:', invoice.id);
  
  // Notificar usuário sobre falha no pagamento
  const customerId = invoice.customer;
  await sendPaymentFailureNotification(customerId, invoice);
}
```

## Gerenciamento de Produtos e Preços

### Criar Produto
```javascript
async function createProduct(productData) {
  const product = await stripe.products.create({
    name: productData.name,
    description: productData.description,
    images: productData.images,
    metadata: {
      category: productData.category,
      sku: productData.sku
    }
  });

  return product;
}
```

### Criar Preço
```javascript
async function createPrice(productId, amount, currency = 'brl', recurring = null) {
  const priceData = {
    product: productId,
    unit_amount: amount * 100,
    currency: currency,
  };

  if (recurring) {
    priceData.recurring = {
      interval: recurring.interval, // 'month', 'year', etc.
      interval_count: recurring.interval_count || 1,
    };
  }

  const price = await stripe.prices.create(priceData);
  return price;
}
```

## Gerenciamento de Clientes

### Atualizar Cliente
```javascript
async function updateCustomer(customerId, updates) {
  const customer = await stripe.customers.update(customerId, updates);
  return customer;
}
```

### Listar Clientes
```javascript
async function listCustomers(limit = 10, startingAfter = null) {
  const customers = await stripe.customers.list({
    limit: limit,
    starting_after: startingAfter,
  });

  return customers;
}
```

### Buscar Cliente por Email
```javascript
async function findCustomerByEmail(email) {
  const customers = await stripe.customers.list({
    email: email,
    limit: 1,
  });

  return customers.data.length > 0 ? customers.data[0] : null;
}
```

## Métodos de Pagamento

### Anexar Método de Pagamento
```javascript
async function attachPaymentMethod(paymentMethodId, customerId) {
  await stripe.paymentMethods.attach(paymentMethodId, {
    customer: customerId,
  });

  // Definir como método padrão
  await stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}
```

### Listar Métodos de Pagamento
```javascript
async function listPaymentMethods(customerId, type = 'card') {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: type,
  });

  return paymentMethods;
}
```

## Reembolsos

### Criar Reembolso
```javascript
async function createRefund(paymentIntentId, amount = null, reason = null) {
  const refundData = {
    payment_intent: paymentIntentId,
  };

  if (amount) {
    refundData.amount = amount * 100; // Centavos
  }

  if (reason) {
    refundData.reason = reason; // 'duplicate', 'fraudulent', 'requested_by_customer'
  }

  const refund = await stripe.refunds.create(refundData);
  return refund;
}
```

## Relatórios e Analytics

### Obter Balanço
```javascript
async function getBalance() {
  const balance = await stripe.balance.retrieve();
  return balance;
}
```

### Listar Transações
```javascript
async function listBalanceTransactions(limit = 10, type = null) {
  const params = { limit };
  
  if (type) {
    params.type = type; // 'charge', 'refund', 'payout', etc.
  }

  const transactions = await stripe.balanceTransactions.list(params);
  return transactions;
}
```

## Configurações Avançadas

### Configuração com Proxy
```javascript
const ProxyAgent = require('https-proxy-agent');

const stripe = new Stripe('sk_test_...', {
  httpAgent: new ProxyAgent(process.env.HTTP_PROXY),
  timeout: 20000,
  maxNetworkRetries: 3,
});
```

### Configuração para Produção
```javascript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  maxNetworkRetries: 3,
  timeout: 10000,
  telemetry: true,
  appInfo: {
    name: 'MyApp',
    version: '1.0.0',
    url: 'https://myapp.com',
  },
});
```

## Stripe Connect (Marketplace)

### Criar Conta Connect
```javascript
async function createConnectAccount(accountData) {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'BR',
    email: accountData.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
    individual: {
      first_name: accountData.firstName,
      last_name: accountData.lastName,
      email: accountData.email,
      phone: accountData.phone,
    },
  });

  return account;
}
```

### Transfer para Conta Connect
```javascript
async function createTransfer(amount, destination, metadata = {}) {
  const transfer = await stripe.transfers.create({
    amount: amount * 100,
    currency: 'brl',
    destination: destination,
    metadata: metadata,
  });

  return transfer;
}
```

## Tratamento de Erros

### Tratamento Robusto de Erros
```javascript
async function handleStripeOperation(operation) {
  try {
    return await operation();
  } catch (error) {
    switch (error.type) {
      case 'StripeCardError':
        // Cartão foi recusado
        console.error('Cartão recusado:', error.message);
        throw new Error('Pagamento recusado');
        
      case 'StripeRateLimitError':
        // Rate limit excedido
        console.error('Rate limit excedido');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await operation(); // Retry
        
      case 'StripeInvalidRequestError':
        // Parâmetros inválidos
        console.error('Parâmetros inválidos:', error.message);
        throw new Error('Dados de pagamento inválidos');
        
      case 'StripeAPIError':
        // Erro interno do Stripe
        console.error('Erro interno do Stripe:', error.message);
        throw new Error('Erro temporário no pagamento');
        
      case 'StripeConnectionError':
        // Problema de rede
        console.error('Problema de conexão:', error.message);
        throw new Error('Erro de conexão');
        
      case 'StripeAuthenticationError':
        // Chave de API inválida
        console.error('Erro de autenticação:', error.message);
        throw new Error('Erro de configuração');
        
      default:
        console.error('Erro desconhecido:', error);
        throw new Error('Erro inesperado');
    }
  }
}
```

## Integração com TypeScript

```typescript
import Stripe from 'stripe';

interface PaymentService {
  createCustomer(userData: CustomerData): Promise<Stripe.Customer>;
  processPayment(paymentData: PaymentData): Promise<Stripe.PaymentIntent>;
}

interface CustomerData {
  email: string;
  name: string;
  phone?: string;
}

interface PaymentData {
  amount: number;
  currency: string;
  customerId: string;
  metadata?: Record<string, string>;
}

class StripePaymentService implements PaymentService {
  private stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, {
      apiVersion: '2024-06-20',
    });
  }

  async createCustomer(userData: CustomerData): Promise<Stripe.Customer> {
    const params: Stripe.CustomerCreateParams = {
      email: userData.email,
      name: userData.name,
      phone: userData.phone,
    };

    return await this.stripe.customers.create(params);
  }

  async processPayment(paymentData: PaymentData): Promise<Stripe.PaymentIntent> {
    const params: Stripe.PaymentIntentCreateParams = {
      amount: paymentData.amount * 100,
      currency: paymentData.currency,
      customer: paymentData.customerId,
      metadata: paymentData.metadata,
    };

    return await this.stripe.paymentIntents.create(params);
  }
}
```

## Testes

### Configuração para Testes
```javascript
// Configuração para ambiente de teste
const stripeTest = new Stripe('sk_test_...', {
  apiVersion: '2024-06-20',
});

// Usar números de cartão de teste
const testCards = {
  visa: '4242424242424242',
  visaDebit: '4000056655665556',
  mastercard: '5555555555554444',
  amex: '378282246310005',
  declined: '4000000000000002',
  insufficientFunds: '4000000000009995',
  fraud: '4100000000000019',
};
```

### Mock de Webhooks para Teste
```javascript
const testWebhookPayload = {
  id: 'evt_test_webhook',
  object: 'event',
  type: 'payment_intent.succeeded',
  data: {
    object: {
      id: 'pi_test_payment_intent',
      amount: 2000,
      currency: 'brl',
      status: 'succeeded',
    }
  }
};

const testHeader = stripe.webhooks.generateTestHeaderString({
  payload: JSON.stringify(testWebhookPayload),
  secret: 'whsec_test_secret',
});

const event = stripe.webhooks.constructEvent(
  JSON.stringify(testWebhookPayload),
  testHeader,
  'whsec_test_secret'
);
```

## Recursos Relacionados

- [Documentação Oficial](https://stripe.com/docs)
- [API Reference](https://stripe.com/docs/api)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Testing Guide](https://stripe.com/docs/testing)
- [Webhooks Guide](https://stripe.com/docs/webhooks)

Stripe oferece uma plataforma completa e robusta para processamento de pagamentos, desde transações simples até sistemas complexos de marketplace e assinaturas, com excelente suporte para desenvolvimento em Node.js.
