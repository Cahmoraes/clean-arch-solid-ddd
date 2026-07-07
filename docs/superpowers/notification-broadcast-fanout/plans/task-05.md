# Task 5: Atualizar `NotificationQueueWorker` para publicar via `NotificationBroadcastPublisher` [FR-001, FR-005, FR-006]

**Status:** PENDING
**PRD:** `../prd/prd-notification-broadcast-fanout.md`
**Spec:** `../specs/notification-broadcast-fanout-design.md`
**Tier:** standard
**Depends on:** task-04

## Visão Geral

Trocar a dependência do `NotificationQueueWorker` de `RedisNotificationPublisher` para
`NotificationBroadcastPublisher`: o worker continua consumindo a fila durável `notificationCreated`
(nenhuma mudança nesse mecanismo), mas o callback de `consume` passa a publicar o payload na exchange
fanout do RabbitMQ em vez de publicar num canal Redis. O `ack` da fila durável continua automático
via `RabbitMQAdapter.consume` e só ocorre se o callback resolver sem lançar — preservando FR-006 sem
nenhuma mudança nesse mecanismo.

**Atenção:** o arquivo `apps/backend/src/notification/infra/worker/notification-queue-worker.ts` não
foi capturado 100% verbatim na pesquisa desta feature (imports exatos, tipo do payload, ordem exata
dos parâmetros do construtor não foram confirmados byte a byte). O Step 1 abaixo exige ler o arquivo
real antes de escrever o teste e a implementação — não presuma a assinatura.

## Arquivos

- Modify: `apps/backend/src/notification/infra/worker/notification-queue-worker.ts`
- Test (não existe hoje — criar): `apps/backend/src/notification/infra/worker/notification-queue-worker.test.ts`

### Conformidade com as Skills Padrão

- `refactoring`: troca de dependência injetada preservando o fluxo de consumo da fila durável.
- `test-antipatterns`: mock mínimo de `Queue` e de `NotificationBroadcastPublisher`, sem
  sobre-mockar.
- `no-workarounds`: usar o tipo `NotificationCreatedPayload` real já existente no arquivo — não
  inventar um novo tipo.

## Passos

- **Step 0: Ler o arquivo real antes de editar**

Antes de escrever teste ou implementação, ler
`apps/backend/src/notification/infra/worker/notification-queue-worker.ts` para confirmar a
assinatura exata do construtor e o nome/shape do tipo `NotificationCreatedPayload` usado em
`queue.consume(QUEUES.NOTIFICATION_CREATED, callback)`. O comportamento já confirmado pela pesquisa
desta feature: o worker injeta `SHARED_TYPES.Queue` e
`NOTIFICATION_TYPES.Infra.RedisNotificationPublisher`, e chama
`redisNotificationPublisher.publish(\`notifications:${payload.userId}\`, JSON.stringify(payload))`
dentro do callback de `consume` — mas o texto-fonte exato (imports, tipos) não foi capturado
verbatim. Usar a leitura real para ajustar o teste e a implementação abaixo aos tipos reais do
arquivo.

- **Step 1: Write the failing test**

```typescript
import { describe, expect, it, vi } from "vitest"
import type { Queue } from "@/shared/infra/queue/queue"
import { QUEUES } from "@/shared/infra/queue/queues"
import type { NotificationBroadcastPublisher } from "@/notification/infra/queue/notification-broadcast-publisher"
import { NotificationQueueWorker } from "./notification-queue-worker"

function makeMockQueue(): Queue {
	return {
		connect: vi.fn(),
		publish: vi.fn(),
		consume: vi.fn(),
	}
}

describe("NotificationQueueWorker", () => {
	describe("init", () => {
		it("should publish the consumed payload via NotificationBroadcastPublisher instead of Redis", async () => {
			const queue = makeMockQueue()
			const broadcastPublisher = { publish: vi.fn() } as unknown as NotificationBroadcastPublisher
			const worker = new NotificationQueueWorker(queue, broadcastPublisher)

			await worker.init()
			const consumeCallback = (queue.consume as ReturnType<typeof vi.fn>).mock.calls[0][1]
			await consumeCallback({ userId: "u1", notificationId: "n1" })

			expect(queue.consume).toHaveBeenCalledWith(QUEUES.NOTIFICATION_CREATED, expect.any(Function))
			expect(broadcastPublisher.publish).toHaveBeenCalledWith({ userId: "u1", notificationId: "n1" })
		})
	})
})
```

Ajustar o construtor `new NotificationQueueWorker(queue, broadcastPublisher)` para a ordem/nome real
de parâmetros confirmada no Step 0 — se o arquivo real usa injeção via decorators `@inject` com
Inversify resolvendo automaticamente, o teste deve instanciar manualmente passando os mocks na mesma
ordem dos parâmetros do construtor real.

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend test:run -- -t "NotificationQueueWorker"`
Expected: FAIL (ainda usa `RedisNotificationPublisher`).

- **Step 3: Write minimal implementation**

Trocar a dependência injetada de `NOTIFICATION_TYPES.Infra.RedisNotificationPublisher` para
`NOTIFICATION_TYPES.Infra.NotificationBroadcastPublisher`, e o corpo do callback de `init()` para:

```typescript
public async init(): Promise<void> {
	await this.queue.consume(QUEUES.NOTIFICATION_CREATED, async (payload: NotificationCreatedPayload) => {
		await this.notificationBroadcastPublisher.publish(payload)
	})
}
```

Manter o tipo `NotificationCreatedPayload` real do arquivo — não inventar um novo tipo; usar o já
existente. Remover o `JSON.stringify` e a construção do channel `notifications:${payload.userId}`,
pois `NotificationBroadcastPublisher.publish` já lida com a serialização via
`RabbitMQAdapter.publish`.

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend test:run -- -t "NotificationQueueWorker"`
Expected: PASS.

- **Step 5: Verificar tipos**

Run: `pnpm --filter backend tsc:check`
Expected: PASS.

- **Step 6: Confirmar regressão de FR-005 (persistência antes do broadcast)**

FR-005 exige que a notificação continue sendo persistida no PostgreSQL antes de qualquer tentativa
de broadcast em tempo real. Este worker não persiste nada — ele só consome a fila durável
`notificationCreated`, que só recebe uma mensagem depois que o use case de criação de notificação já
persistiu a entidade (fluxo existente, fora do escopo desta task). Confirmar, lendo o event handler
`apps/backend/src/notification/application/event-handler/create-notification-on-check-in-event.handler.ts`
e o use case de criação por trás dele, que a ordem "persistir no Postgres" → "publicar na fila
`notificationCreated`" permanece inalterada por esta task (nenhuma edição nesses arquivos é esperada
aqui). Rodar a suíte de testes desse handler para confirmar ausência de regressão:

Run: `pnpm --filter backend test:run -- -t "CreateNotificationOnCheckInEventHandler"`
Expected: PASS (sem nenhuma mudança de comportamento, já que esta task não toca esses arquivos).

- **Step 7: Commit**

```bash
git add apps/backend/src/notification/infra/worker/notification-queue-worker.ts apps/backend/src/notification/infra/worker/notification-queue-worker.test.ts
git commit -m "refactor(notification): worker publica broadcast via RabbitMQ em vez de Redis"
```

## Critérios de Sucesso

- Teste novo passa confirmando que o worker não referencia mais `RedisNotificationPublisher`.
- `tsc:check` limpo.
- O `ack` da fila durável continua automático via `RabbitMQAdapter.consume` (nenhuma mudança nesse
  mecanismo) — só ocorre se o callback (agora chamando `NotificationBroadcastPublisher.publish`)
  resolver sem lançar, preservando FR-006.
- Testes do `CreateNotificationOnCheckInEventHandler` continuam verdes, confirmando que a ordem
  "persistir no PostgreSQL antes do broadcast" (FR-005) não regrediu.
