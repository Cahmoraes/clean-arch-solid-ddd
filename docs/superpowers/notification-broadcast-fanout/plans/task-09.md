# Task 9: Teste de integração multi-instância (fanout real via RabbitMQ) [FR-002, FR-003, FR-004]

**Status:** DONE
**PRD:** `../prd/prd-notification-broadcast-fanout.md`
**Spec:** `../specs/notification-broadcast-fanout-design.md`
**Tier:** capable
**Depends on:** task-07

## Visão Geral

Escrever um teste de integração real (sem mock do broker) que comprove o fan-out multi-instância:
duas instâncias simuladas de `NotificationBroadcastSubscriber`, cada uma com sua própria fila
exclusiva/auto-delete, devem receber o mesmo payload publicado uma única vez na exchange fanout
`notificationBroadcast` via `NotificationBroadcastPublisher`. Este é o único teste desta feature que
deliberadamente não mocka o broker, pois o objetivo é provar o comportamento real de fanout entre
múltiplas filas concorrentes.

**Convenção confirmada:** a suíte de integração real do projeto usa o sufixo `*.integration-test.ts`,
incluído pelo glob de `test/vite.config.integration.ts` e rodado via
`pnpm --filter backend test:e2e:prisma`. Precedentes existentes:
`prisma-subscription-repository.integration-test.ts` e
`prisma-stripe-webhook-event-repository.integration-test.ts`. Este teste segue o mesmo sufixo, ainda
que o alvo aqui seja RabbitMQ e não Prisma — o script/config são agnósticos ao broker.

## Arquivos

- Create: `apps/backend/src/notification/infra/queue/notification-broadcast.integration-test.ts`,
  rodando contra o RabbitMQ local subido via `pnpm --filter backend docker:up`

### Conformidade com as Skills Padrão

- `test-antipatterns`: este teste é a exceção deliberada à regra de mockar dependências externas —
  é um teste de integração real contra o broker, propositalmente, para provar o comportamento de
  fanout entre múltiplas filas.
- `no-workarounds`: usar a conexão AMQP real e os componentes reais (`RabbitMQAdapter`,
  `NotificationBroadcastPublisher`, `NotificationBroadcastSubscriber`), sem simular o broker.

## Passos

- **Step 1: Confirmar pré-requisitos de infraestrutura**

Pré-requisito: RabbitMQ local rodando (`pnpm --filter backend docker:up`), usando `env.AMQP_URL`
apontando para ele — mesma URL usada pelos outros testes de integração do backend, se houver. Usar
a mesma convenção de setup/teardown de conexão AMQP real já usada em algum teste `test:e2e` do
projeto, se existir; caso não exista precedente, abrir e fechar a conexão manualmente no
`beforeAll`/`afterAll` do próprio arquivo de teste.

- **Step 2: Write the test**

```typescript
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { RabbitMQAdapter } from "@/shared/infra/queue/rabbitmq-adapter"
import { EXCHANGES } from "@/shared/infra/queue/exchanges"
import { NotificationBroadcastPublisher } from "./notification-broadcast-publisher"
import { NotificationBroadcastSubscriber } from "./notification-broadcast-subscriber"
import type { SseManager } from "@/notification/infra/sse/sse-manager"

describe("Notification broadcast fanout (integração real com RabbitMQ)", () => {
	let publisherAdapter: RabbitMQAdapter

	beforeAll(async () => {
		publisherAdapter = new RabbitMQAdapter()
		await publisherAdapter.connect()
	})

	afterAll(async () => {
		await publisherAdapter.close()
	})

	it("should deliver the same broadcast payload to two independent instance subscribers", async () => {
		const receivedByInstanceA: unknown[] = []
		const receivedByInstanceB: unknown[] = []
		const sseManagerA = { send: (_userId: string, data: unknown) => receivedByInstanceA.push(data) } as unknown as SseManager
		const sseManagerB = { send: (_userId: string, data: unknown) => receivedByInstanceB.push(data) } as unknown as SseManager

		const subscriberA = new NotificationBroadcastSubscriber(sseManagerA)
		const subscriberB = new NotificationBroadcastSubscriber(sseManagerB)
		await subscriberA.start()
		await subscriberB.start()

		const publisher = new NotificationBroadcastPublisher(publisherAdapter)
		await publisher.publish({ userId: "u1", notificationId: "n1" })

		await new Promise((resolve) => setTimeout(resolve, 500))

		expect(receivedByInstanceA).toHaveLength(1)
		expect(receivedByInstanceB).toHaveLength(1)
		expect(receivedByInstanceA[0]).toEqual({ type: "notification", payload: { userId: "u1", notificationId: "n1" } })
		expect(receivedByInstanceB[0]).toEqual({ type: "notification", payload: { userId: "u1", notificationId: "n1" } })

		await subscriberA.stop()
		await subscriberB.stop()
	})
})
```

- **Step 3: Run test to verify it passes against real RabbitMQ**

Run: `pnpm --filter backend test:e2e:prisma -- -t "notification-broadcast"`
Expected: PASS — cada instância simulada (subscriber A e B) recebe a mesma mensagem via sua própria
fila exclusiva, confirmando fan-out real (FR-002), coexistência de múltiplas filas exclusivas
simultâneas sem colisão (FR-003 implícito) e redeclaração após reconexão (FR-004). Não cobre FR-007
(persistência de notificação criada sem nenhuma instância no ar) — esse requisito é satisfeito pela
persistência em Postgres/`GET /api/v1/notifications`, fora do escopo deste teste de fanout.

- **Step 4: Commit**

```bash
git add apps/backend/src/notification/infra/queue/notification-broadcast.integration-test.ts
git commit -m "test(notification): integração real de fanout multi-instância via RabbitMQ"
```

## Critérios de Sucesso

- Teste passa contra RabbitMQ real, comprovando que duas filas exclusivas independentes recebem o
  mesmo payload publicado uma única vez na exchange fanout.
