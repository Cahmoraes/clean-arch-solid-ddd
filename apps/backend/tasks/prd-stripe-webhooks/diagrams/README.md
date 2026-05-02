# Diagramas — Webhooks Stripe

Documentacao visual da solucao descrita na [PRD](../prd.md) e [TechSpec](../techspec.md).

## Indice

| # | Arquivo | Tipo | O que mostra |
|---|---------|------|--------------|
| 1 | [01-c4-context.mmd](./01-c4-context.mmd) | C4 Context | Atores externos (Stripe, Usuario, Admin) e o sistema |
| 2 | [02-c4-container.mmd](./02-c4-container.mmd) | C4 Container | Componentes internos e suas conexoes |
| 3 | [03-sequence-webhook-flow.mmd](./03-sequence-webhook-flow.mmd) | Sequence | Fluxo completo ponta a ponta: validacao, 200 imediato, processamento async |
| 4 | [04-flowchart-worker-logic.mmd](./04-flowchart-worker-logic.mmd) | Flowchart | Logica de decisao do Worker: idempotencia + roteamento por event.type |
| 5 | [05-state-subscription-lifecycle.mmd](./05-state-subscription-lifecycle.mmd) | State | Ciclo de vida da Subscription (active, past_due, canceled) |
| 6 | [06-class-domain-model.mmd](./06-class-domain-model.mmd) | Class | Modelo de dominio: entidade, interfaces e use cases |
| 7 | [07-erd-database-schema.mmd](./07-erd-database-schema.mmd) | ERD | Schema do banco: subscriptions, users, stripe_webhook_events |

## Como visualizar

**VS Code:** instale a extensao [Markdown Mermaid Preview](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid)
e abra os arquivos `.mmd`, ou use o [Mermaid Live Editor](https://mermaid.live).

**GitHub/GitLab:** renderiza automaticamente em blocos de codigo mermaid em arquivos Markdown.

**CLI:**
```bash
npx @mermaid-js/mermaid-cli -i 03-sequence-webhook-flow.mmd -o sequence.svg
```

## Decisoes Arquiteturais Chave

- **Desacoplamento via RabbitMQ**: controller responde 200 imediatamente; negocio roda async no worker
- **Idempotencia INSERT-first**: tentativa de INSERT com `event_id` UNIQUE elimina race conditions entre instancias
- **Atomicidade via transacao compartilhada**: INSERT de idempotencia + efeitos de negocio comitados juntos ou revertidos juntos
- **`customerId` na Subscription**: evita dois saltos de repositorio no evento `invoice.payment_failed`
