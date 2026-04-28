# ADR001 — Adotar Padrão Insert-First com Constraint UNIQUE para Idempotência de Webhooks do Stripe

- Status: Aceito
- Data: 28/04/2026
- Autor: Caique

---

## Decisão

Garantiremos idempotência no processamento de webhooks do Stripe tentando o INSERT direto na tabela `stripe_webhook_events` com constraint `UNIQUE` no `event_id`, dentro de uma transação atômica compartilhada com os efeitos de negócio — em vez de verificar existência com SELECT antes de inserir (padrão insert-first).

## Contexto

O Stripe pode reenviar o mesmo evento múltiplas vezes: por timeout de resposta HTTP, falhas de rede ou retentativas automáticas da plataforma. O processamento dos webhooks envolve efeitos de negócio irreversíveis — ativar assinatura, cancelar assinatura, marcar pagamento como falho — que não devem ser executados mais de uma vez para o mesmo evento.

A arquitetura desacopla a validação HTTP (`StripeWebhookController`) do processamento de negócio (`StripeWebhookWorker`) via fila RabbitMQ: o controller retorna 200 imediatamente após publicar na fila, enquanto o worker consome e processa de forma assíncrona. Essa separação aumenta a janela de reentrega e torna o controle de duplicatas no worker obrigatório.

Além disso, múltiplas instâncias do `StripeWebhookWorker` podem consumir mensagens da fila simultaneamente, exigindo que o mecanismo de idempotência seja seguro sob concorrência.

Forças que moldaram a decisão:

- Stripe não garante entrega exatamente uma vez (at-least-once delivery)
- Efeitos de negócio são irreversíveis e têm impacto financeiro direto
- O banco de dados (PostgreSQL via Prisma) já é a fonte de verdade e participa de todas as transações de negócio
- O sistema já usa `unitOfWork.runTransaction(tx)` para atomicidade — padrão estabelecido em `CheckInUseCase`

## Opções Consideradas

- **Opção 1 (SELECIONADA) — Insert-first com constraint UNIQUE**
  Tentativa de INSERT direto na tabela `stripe_webhook_events`; violação da constraint UNIQUE sinaliza duplicata e o worker ignora silenciosamente.
  - Prós: atômico ao nível do banco (ACID), elimina race conditions entre instâncias do worker; sem SELECT extra; o INSERT de idempotência e os efeitos de negócio são commitados ou revertidos juntos na mesma transação
  - Contras: usa exceção de violação de constraint como mecanismo de controle de fluxo, o que é levemente não idiomático, embora amplamente aceito para este padrão

- **Opção 2 — SELECT-then-INSERT**
  Buscar o `event_id` antes de inserir; processar apenas se não encontrado.
  - Prós: código mais explícito e linear
  - Contras: race condition entre SELECT e INSERT — duas instâncias do worker podem passar pelo SELECT simultaneamente e ambas tentarem o INSERT, processando o evento em duplicidade

- **Opção 3 — Cache em memória (Redis)**
  Verificar e registrar o `event_id` no Redis antes de processar.
  - Prós: rápido, sem I/O adicional no banco relacional
  - Contras: Redis não participa da transação do banco; inconsistência possível se o banco falhar após o registro no Redis; TTL de cache pode expirar e permitir reprocessamento; aumenta dependência de infraestrutura sem ganho concreto neste contexto

- **Opção 4 — Sem mecanismo de idempotência dedicado**
  Processar diretamente sem registro de eventos, confiando na raridade das reentregas.
  - Prós: implementação mais simples
  - Contras: sem proteção a duplicatas; sem trilha de auditoria; inaceitável para operações com impacto financeiro direto

## Consequências

- ✅ Positivo: atomicidade garantida pelo banco (ACID) — INSERT de idempotência e efeitos de negócio são commitados juntos ou revertidos juntos na mesma transação
- ✅ Positivo: eliminação de race conditions em cenários de múltiplas instâncias do worker
- ✅ Positivo: trilha de auditoria automática na tabela `stripe_webhook_events` (rastreabilidade exigida pelo PRD)
- ✅ Positivo: tolerância a falhas transientes — rollback no use case desfaz o INSERT, permitindo reenvio posterior do Stripe sem conflito de constraint
- ✅ Positivo: sem dependência de infraestrutura adicional além do banco já existente
- ❌ Negativo: uso de exceção de constraint como controle de fluxo (levemente não idiomático, porém padrão consolidado para insert-first)
- ❌ Negativo: a tabela `stripe_webhook_events` cresce indefinidamente com o volume de eventos; requer estratégia de retenção e purga periódica no longo prazo
