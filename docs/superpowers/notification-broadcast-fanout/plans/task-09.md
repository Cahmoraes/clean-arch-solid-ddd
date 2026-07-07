# Task 9: Teste de integração multi-instância (fanout real via RabbitMQ) [FR-002, FR-003, FR-004, FR-007]

**Status:** PENDING
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

**Atenção:** antes de criar o arquivo, confirmar a convenção real de nome/local de teste de
integração com RabbitMQ usada no projeto (se houver precedente) e o comando exato para rodá-lo — não
presumir sem verificar.

## Arquivos

- Create: `apps/backend/src/notification/infra/queue/notification-broadcast.e2e-test.ts` (ou o
  padrão de nome usado pela suíte `test:e2e:prisma`/RabbitMQ do projeto — confirmar convenção real
  de nome de arquivo de teste de integração com RabbitMQ antes de criar; se não houver precedente de
  teste de integração com RabbitMQ real no repo, seguir o padrão `*.business-flow-test.ts` adaptado
  para infraestrutura, rodando contra o RabbitMQ local subido via `pnpm --filter backend docker:up`)

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

Run o comando exato conforme a suíte de integração do backend — usar
`pnpm --filter backend test:e2e:prisma` como referência de comando se este teste for colocado nessa
suíte, ou o script equivalente configurado no `package.json` do backend para testes que dependem de
infraestrutura real. Confirmar o nome exato do script antes de rodar, lendo
`apps/backend/package.json`.
Expected: PASS — cada instância simulada (subscriber A e B) recebe a mesma mensagem via sua própria
fila exclusiva, confirmando fan-out real (FR-002), coexistência de múltiplas filas exclusivas
simultâneas sem colisão (FR-003 implícito) e ausência de perda de mensagem entre publish e consumo
(FR-004/FR-007 no caminho feliz).

- **Step 4: Commit**

```bash
git add apps/backend/src/notification/infra/queue/notification-broadcast.e2e-test.ts
git commit -m "test(notification): integração real de fanout multi-instância via RabbitMQ"
```

## Critérios de Sucesso

- Teste passa contra RabbitMQ real, comprovando que duas filas exclusivas independentes recebem o
  mesmo payload publicado uma única vez na exchange fanout.
