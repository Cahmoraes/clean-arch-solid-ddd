# PRD — Conclusão do Sistema de Webhooks do Stripe

## Visão Geral

O sistema de assinaturas da plataforma utiliza o Stripe como gateway de pagamento. Atualmente, o fluxo de criação de clientes e assinaturas está parcialmente implementado, mas os eventos assíncronos disparados pelo Stripe após mudanças de estado das assinaturas não são processados. Isso significa que cancelamentos, falhas de pagamento e atualizações de status no Stripe não se refletem no estado local do usuário e da assinatura, criando inconsistências críticas entre os dois sistemas.

O objetivo desta funcionalidade é completar o ciclo de vida das assinaturas, garantindo que o estado interno da plataforma esteja sempre sincronizado com os eventos enviados pelo Stripe via webhooks.

---

## Objetivos

- O status da assinatura local deve refletir fielmente o estado da assinatura no Stripe em até 30 segundos após o evento
- Usuários com assinaturas canceladas ou com pagamentos em atraso devem ter acesso à plataforma suspendido automaticamente
- Nenhum evento do Stripe deve ser processado mais de uma vez (idempotência garantida)
- A assinatura do webhook deve ser verificada criptograficamente a cada requisição, rejeitando qualquer evento sem assinatura válida
- O endpoint de webhook deve retornar `200` imediatamente, sem dependência de processamento síncrono de lógica de negócio

---

## Histórias de Usuário

**Usuário com assinatura ativa:**
- Como usuário com assinatura ativa, eu quero que meu acesso seja mantido enquanto meu pagamento estiver em dia, para continuar utilizando a plataforma sem interrupções

**Usuário com pagamento falho:**
- Como usuário cujo pagamento falhou, eu quero que meu acesso seja suspenso imediatamente, para que a plataforma reflita meu status de inadimplência conforme a política de negócio

**Usuário que cancelou a assinatura:**
- Como usuário que cancelou a assinatura no Stripe, eu quero que meu acesso seja suspenso automaticamente, para que o cancelamento tenha efeito imediato na plataforma sem necessidade de ação manual

**Administrador da plataforma:**
- Como administrador, eu quero que todos os eventos de webhook recebidos sejam rastreáveis, para que seja possível auditar o histórico de mudanças de status de cada assinatura

---

## Funcionalidades Principais

### 1. Processamento de Eventos de Webhook

O endpoint `POST /webhook/stripe` deve ser capaz de receber, validar e rotear os seguintes eventos do Stripe para os respectivos use cases:

| Evento Stripe                      | Comportamento esperado                                                 |
|------------------------------------|------------------------------------------------------------------------|
| `customer.subscription.updated`    | Atualizar o status da assinatura local conforme o novo status do Stripe |
| `customer.subscription.deleted`    | Cancelar a assinatura local e suspender o usuário vinculado            |
| `invoice.payment_failed`           | Atualizar o status da assinatura para `past_due` e suspender o usuário |

**Requisitos funcionais:**

- RF-01: O controller deve extrair o cabeçalho `stripe-signature` da requisição e verificá-lo usando o `STRIPE_WEBHOOK_SECRET` configurado em ambiente
- RF-02: Requisições sem assinatura válida ou com assinatura inválida devem ser rejeitadas com status `400`
- RF-03: O endpoint deve retornar status `200` imediatamente após validação da assinatura, antes de executar qualquer lógica de negócio
- RF-04: O tipo do evento (`event.type`) deve ser usado para rotear o processamento para o use case correspondente
- RF-05: Eventos de tipos não mapeados devem ser ignorados sem erro

### 2. Use Case — Ativar Assinatura (`ActivateSubscriptionUseCase`)

Acionado quando `customer.subscription.updated` traz status `active`.

**Requisitos funcionais:**

- RF-06: Localizar a assinatura local pelo `billingSubscriptionId` (ID da assinatura no Stripe)
- RF-07: Atualizar o status da assinatura local para `active`
- RF-08: Ativar o usuário vinculado à assinatura caso esteja suspenso
- RF-09: Persistir as alterações via repositório

### 3. Use Case — Cancelar Assinatura (`CancelSubscriptionUseCase`)

Acionado pelos eventos `customer.subscription.deleted` ou `customer.subscription.updated` com status `canceled`.

**Requisitos funcionais:**

- RF-10: Localizar a assinatura local pelo `billingSubscriptionId`
- RF-11: Chamar o método `cancel()` da entidade `Subscription`, atualizando status para `canceled` e registrando `canceledAt`
- RF-12: Suspender o usuário vinculado à assinatura
- RF-13: Persistir as alterações via repositório

### 4. Tratamento de Falha de Pagamento

Acionado pelo evento `invoice.payment_failed`.

**Requisitos funcionais:**

- RF-14: Localizar a assinatura local pelo ID do cliente Stripe (`customerId`) presente no objeto `invoice`
- RF-15: Atualizar o status da assinatura local para `past_due`
- RF-16: Suspender o usuário vinculado à assinatura
- RF-17: Persistir as alterações via repositório

### 5. Idempotência

**Requisitos funcionais:**

- RF-18: Cada evento do Stripe possui um ID único (`event.id`). Eventos já processados devem ser identificados e ignorados, retornando `200` sem reprocessamento
- RF-19: O sistema deve persistir os IDs dos eventos processados com data/hora de processamento

### 6. Repositório Prisma para Assinaturas

**Requisitos funcionais:**

- RF-20: Implementar `PrismaSubscriptionRepository` satisfazendo a interface `SubscriptionRepository`
- RF-21: A interface `SubscriptionRepository` deve incluir o método `ofBillingSubscriptionId(billingSubscriptionId: string): Promise<Subscription | null>` para busca por ID do Stripe
- RF-22: O schema Prisma deve incluir o model `Subscription` com os campos: `id`, `userId`, `billingSubscriptionId`, `status`, `createdAt`, `updatedAt`, `canceledAt`
- RF-23: O `SubscriptionRepositoryProvider` deve selecionar `PrismaSubscriptionRepository` em produção

---

## Experiência do Usuário

Esta funcionalidade não possui interface visual direta — é um sistema de processamento assíncrono orientado a eventos. A experiência do usuário se manifesta indiretamente:

- **Usuário ativo:** não percebe nenhuma mudança; o acesso continua normal enquanto o pagamento está em dia
- **Usuário suspenso:** ao tentar acessar recursos protegidos após suspensão, recebe resposta de acesso negado (comportamento já existente via `UserStatus`)
- **Fluxo assíncrono:** do ponto de vista operacional, o sistema deve processar eventos de webhook de forma transparente, sem expor detalhes técnicos ao usuário final

**Personas envolvidas:**
- Usuário pagante (impactado pelo resultado do processamento)
- Administrador da plataforma (monitora integridade da integração)
- Sistema Stripe (produtor dos eventos)

---

## Restrições Técnicas de Alto Nível

- O sistema deve integrar-se com a API do Stripe usando a SDK oficial (`stripe` npm package), mantendo compatibilidade com a versão de API já configurada (`2025-06-30.basil`)
- A verificação de assinatura do webhook requer acesso ao corpo bruto da requisição (`rawBody`); o servidor Fastify já está configurado para preservar o `rawBody`
- O `STRIPE_WEBHOOK_SECRET` deve ser obrigatório em ambiente de produção e configurado via variável de ambiente (`env`)
- A interface `SubscriptionGateway` deve ser estendida para incluir o método `createEventWebhook`, garantindo que implementações de teste também suportem o contrato
- O processamento pós-validação deve ser tolerante a falhas: uma exceção no use case não deve causar retorno de erro ao Stripe (para evitar reenvio desnecessário)
- O sistema de idempotência deve usar o banco de dados como fonte de verdade, garantindo consistência em cenários de múltiplas instâncias
- A tabela de assinaturas Prisma deve ter índice único em `billingSubscriptionId` e índice em `userId` para buscas eficientes

---

## Fora de Escopo

- Processamento dos eventos `invoice.payment_succeeded`, `customer.subscription.created` e `customer.subscription.trial_will_end` (não solicitados nesta entrega)
- Interface de administração para visualização de eventos processados
- Sistema de notificação por e-mail em caso de falha de pagamento ou cancelamento
- Reativação manual de assinaturas por administrador via painel
- Integração com outros provedores de pagamento além do Stripe
- Retentativas automáticas de cobrança gerenciadas pela plataforma (responsabilidade do Stripe)
- Período de carência antes da suspensão em caso de falha de pagamento
- Downgrade para plano gratuito como alternativa à suspensão
