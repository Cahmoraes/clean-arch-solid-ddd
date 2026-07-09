# Task 2: Generalizar `RabbitMQAdapter.publish` para aceitar tipo e durabilidade de exchange [FR-008, FR-009]

**Status:** PENDING
**PRD:** `../prd/prd-notification-broadcast-fanout.md`
**Spec:** `../specs/notification-broadcast-fanout-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Generalizar a assinatura de `Queue.publish` e a implementação em `RabbitMQAdapter` para aceitar
um tipo de exchange opcional (`"direct" | "fanout"`, default `"direct"`) **e** uma durabilidade
opcional (`durable: boolean`, default `true`) — preservando o comportamento atual dos 7 exchanges
já existentes (todos `direct` + `durable: true`) e habilitando a Task 4 a publicar na futura
exchange fanout `notificationBroadcast` com `durable: false` (ver D4 na spec).

O parâmetro `durable` é necessário porque a exchange `notificationBroadcast` é declarada em dois
pontos independentes — `NotificationBroadcastPublisher` (Task 4, via este adapter) e
`NotificationBroadcastSubscriber` (Task 6, via `amqp-connection-manager`). O RabbitMQ recusa
(`PRECONDITION_FAILED`, fecha o canal) uma segunda declaração da mesma exchange com um `durable`
diferente do já registrado — por isso os dois pontos precisam concordar explicitamente em
`durable: false`, e o adapter não pode mais hardcodar `durable: true` para todo publish.

## Arquivos

- Modify: `apps/backend/src/shared/infra/queue/queue.ts`
- Modify: `apps/backend/src/shared/infra/queue/rabbitmq-adapter.ts`
- Test (novo): `apps/backend/src/shared/infra/queue/rabbitmq-adapter.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: união de tipo `"direct" | "fanout"`, parâmetros opcionais com default e
  uso de generics em `publish<TData>`.
- `test-antipatterns`: mock do canal amqplib deve ser mínimo, sem sobre-mockar comportamento não
  exercitado pelo teste.
- `refactoring`: mudança de assinatura de método público preservando o comportamento default para
  todos os chamadores existentes.
- `no-workarounds`: a mudança deve ser a solução real (parâmetros tipados com default), não um
  cast ou bypass de tipo, e não deve criar um segundo caminho de publicação fora do adapter.

## Passos

- **Step 1: Write the failing test**

```typescript
import { describe, expect, it, vi } from "vitest"
import { RabbitMQAdapter } from "./rabbitmq-adapter"

function makeMockChannel() {
	return {
		assertExchange: vi.fn().mockResolvedValue(undefined),
		publish: vi.fn(),
	}
}

describe("RabbitMQAdapter", () => {
	describe("publish", () => {
		it("should assert exchange as direct and durable by default", async () => {
			const adapter = new RabbitMQAdapter()
			const channel = makeMockChannel()
			// @ts-expect-error acessa campo privado para injetar canal fake no teste
			adapter["_channel"] = channel

			await adapter.publish("some-exchange", { foo: "bar" })

			expect(channel.assertExchange).toHaveBeenCalledWith("some-exchange", "direct", {
				durable: true,
			})
		})

		it("should assert exchange as fanout and non-durable when explicitly requested", async () => {
			const adapter = new RabbitMQAdapter()
			const channel = makeMockChannel()
			// @ts-expect-error acessa campo privado para injetar canal fake no teste
			adapter["_channel"] = channel

			await adapter.publish("notificationBroadcast", { userId: "u1" }, "fanout", false)

			expect(channel.assertExchange).toHaveBeenCalledWith("notificationBroadcast", "fanout", {
				durable: false,
			})
		})
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend test:run -- -t "RabbitMQAdapter"`
Expected: FAIL (assinatura de `publish` ainda não aceita terceiro/quarto parâmetro;
`assertExchange` ainda hardcoded como `"direct"` + `durable: true`).

- **Step 3: Write minimal implementation**

Em `queue.ts`, adicionar o tipo derivado e ajustar a assinatura de `publish`:

```typescript
export type ExchangeKind = "direct" | "fanout"
```

```typescript
publish<TData>(
	exchange: string,
	data: TData,
	type?: ExchangeKind,
	durable?: boolean,
): Promise<void>
```

Em `rabbitmq-adapter.ts`, importar `ExchangeKind` de `./queue` e trocar o método `publish`:

```typescript
public async publish<TData>(
	exchange: string,
	data: TData,
	type: ExchangeKind = "direct",
	durable = true,
): Promise<void> {
	const channel = await this.channel()
	await channel.assertExchange(exchange, type, { durable })
	const buffer = Buffer.from(JSON.stringify(data))
	this.logger.info(this, { exchange })
	channel.publish(exchange, "", buffer)
}
```

`QueueMemoryAdapter` NÃO precisa de nenhuma edição: dois parâmetros extras opcionais não quebram
a implementação estrutural da interface — confirmado apenas por `tsc:check` no Step 5.

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend test:run -- -t "RabbitMQAdapter"`
Expected: PASS (ambos os testes).

- **Step 5: Verificar regressão de tipos**

Run: `pnpm --filter backend tsc:check`
Expected: PASS — confirma que `QueueMemoryAdapter` e todo chamador de `Queue.publish` (os 7
exchanges `direct` existentes) continuam compilando sem alteração, pois nenhuma chamada existente
passa o terceiro ou quarto parâmetro e usam os defaults `"direct"` / `true`, preservando o
comportamento atual.

- **Step 6: Commit**

```bash
git add apps/backend/src/shared/infra/queue/queue.ts apps/backend/src/shared/infra/queue/rabbitmq-adapter.ts apps/backend/src/shared/infra/queue/rabbitmq-adapter.test.ts
git commit -m "feat(queue): RabbitMQAdapter aceita tipo e durabilidade de exchange (direct/true default, fanout/false para broadcast)"
```

## Critérios de Sucesso

- Os 2 testes novos passam.
- `tsc:check` limpo.
- Nenhuma chamada existente a `queue.publish(exchange, data)` precisa mudar.
- `publish` aceita `durable: boolean` como 4º parâmetro, default `true` — usado pela Task 4 para
  publicar em `notificationBroadcast` com `durable: false`, evitando o `PRECONDITION_FAILED`
  descrito em D4 da spec.
