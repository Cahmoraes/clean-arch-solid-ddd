# Tarefa 1.0: Atualizar Prisma Schema e Migração

<critical>Ler os arquivos de prd.md e techspec.md desta pasta, se você não ler esses arquivos sua tarefa será invalidada</critical>

## Visão Geral

Atualizar o schema Prisma para suportar o ciclo de vida completo das assinaturas com webhooks Stripe. Isso envolve adicionar o campo `customer_id` ao model `Subscription` (necessário para localizar assinaturas via `invoice.payment_failed`) e criar o novo model `StripeWebhookEvent` (necessário para idempotência). Ao final, a migration deve estar executada e o cliente Prisma regenerado.

<skills>
### Conformidade com Skills Padrões

- **`no-workarounds`**: não tornar o campo `customer_id` nullable como atalho — definir estratégia de backfill ou migration segura
- **`systematic-debugging`**: se a migration falhar por dados existentes, diagnosticar a causa raiz antes de ajustar o schema
</skills>

<requirements>

- O model `Subscription` deve ter o campo `customer_id String @map("customer_id")` com índice (`@@index([customer_id])`)
- O novo model `StripeWebhookEvent` deve ter os campos: `id` (UUID gerado pelo banco), `event_id` (unique), `event_type`, `processed_at` (default now)
- A tabela de eventos deve ter `@@map("stripe_webhook_events")`
- A migration deve rodar sem erros no banco local (Docker PostgreSQL)
- O cliente Prisma deve ser regenerado após a migration (`pnpm prisma:generate`)

</requirements>

## Subtarefas

- [ ] 1.1 Adicionar campo `customer_id` ao model `Subscription` no `prisma/schema.prisma`
- [ ] 1.2 Adicionar `@@index([customer_id])` ao model `Subscription`
- [ ] 1.3 Criar model `StripeWebhookEvent` com campos `id`, `event_id` (unique), `event_type`, `processed_at`
- [ ] 1.4 Executar `pnpm prisma:migrate:dev` com nome descritivo (ex: `add-customer-id-and-webhook-events`)
- [ ] 1.5 Executar `pnpm prisma:generate` para regenerar o cliente
- [ ] 1.6 Verificar que `pnpm tsc:check` passa sem erros após a geração do cliente

## Detalhes de Implementação

Consultar seção **"Modelos de Dados"** da `techspec.md` para os snippets exatos do schema Prisma.

Atenção ao risco mencionado na techspec: o campo `customer_id` pode causar falha de migration se houver linhas existentes na tabela `subscriptions`. Avaliar se é necessário tornar o campo temporariamente nullable ou fazer backfill antes de aplicar a constraint `NOT NULL`.

## Critérios de Sucesso

- `prisma/schema.prisma` contém o campo `customer_id` no model `Subscription` com índice
- `prisma/schema.prisma` contém o model `StripeWebhookEvent` com constraint `@unique` em `event_id`
- Migration aplicada com sucesso no banco local
- Cliente Prisma regenerado (`@prisma/client` reflete os novos modelos)
- `pnpm tsc:check` passa sem erros

## Testes da Tarefa

- [ ] Testes de unidade: não aplicável (apenas schema/migration)
- [ ] Testes de integração: verificar manualmente via `pnpm prisma:studio` que as tabelas `subscriptions` e `stripe_webhook_events` foram criadas/alteradas corretamente

<critical>SEMPRE CRIE E EXECUTE OS TESTES DA TAREFA ANTES DE CONSIDERÁ-LA FINALIZADA</critical>

## Arquivos relevantes

- `prisma/schema.prisma`
- `prisma/migrations/` (nova migration gerada)
