# Briefing para o task-writer — notification-broadcast-fanout

Este arquivo é um artefato transitório de handoff (não faz parte do plano publicado). Contém a
pesquisa de código sintetizada + a decomposição completa das 9 tasks. Escreva `task-01.md` até
`task-09.md` em `docs/superpowers/notification-broadcast-fanout/plans/`, em ordem ascendente,
seguindo `../../super.writing-plans/templates/task-file-template.md` e
`../../super.writing-plans/references/required-task-step-pattern.md`.

`**PRD:**` em cada task = `../prd/prd-notification-broadcast-fanout.md`.
`**Spec:**` em cada task = `../specs/notification-broadcast-fanout-design.md`.

---

## Digest de pesquisa (código atual, verbatim, confirmado por 4 subagentes de exploração)

### `apps/backend/src/shared/infra/queue/rabbitmq-adapter.ts` (arquivo completo atual)

```typescript
import amqp from "amqplib"
import { injectable } from "inversify"
import { LazyInject } from "../decorator/lazy-inject"
import { Logger as LoggerDecorate } from "../decorator/logger"
import { env } from "../env"
import { SHARED_TYPES } from "../ioc/types"
import type { Logger } from "../logger/logger"
import type { Queue } from "./queue"

@injectable()
export class RabbitMQAdapter implements Queue {
	private connection?: amqp.ChannelModel
	private _channel?: amqp.Channel
	private readonly logger: Logger = LazyInject(SHARED_TYPES.Logger)

	@LoggerDecorate({
		message: "✅",
	})
	public async connect(): Promise<void> {
		this.connection = await amqp.connect(env.AMQP_URL)
	}

	public async close(): Promise<void> {
		this.assertConnection(this.connection)
		await this.connection.close()
	}

	public async publish<TData>(exchange: string, data: TData): Promise<void> {
		const channel = await this.channel()
		await channel.assertExchange(exchange, "direct", { durable: true })
		const buffer = Buffer.from(JSON.stringify(data))
		this.logger.info(this, { exchange })
		channel.publish(exchange, "", buffer)
	}
	private async channel(): Promise<amqp.Channel> {
		if (!this._channel) {
			this._channel = await this.createChannel()
		}
		return this._channel
	}

	private assertConnection(
		connection?: amqp.ChannelModel,
	): asserts connection is amqp.ChannelModel {
		if (!connection) {
			throw new Error("Connection not established")
		}
	}

	public createChannel(): Promise<amqp.Channel> {
		this.assertConnection(this.connection)
		return this.connection.createChannel()
	}

	public async consume(
		queue: string,
		callback: CallableFunction,
	): Promise<void> {
		const channel = await this.channel()
		await channel.consume(
			queue,
			async (data: amqp.ConsumeMessage | null): Promise<void> => {
				if (!data) return
				const message = this.parseData(data)
				await callback(message)
				channel.ack(data)
			},
		)
	}

	private parseData<TData>(data: amqp.ConsumeMessage): TData {
		try {
			return JSON.parse(data.content.toString())
		} catch {
			return data.content.toString() as unknown as TData
		}
	}
}
```

**Comportamento do `consume`:** o `ack` já acontece automaticamente, dentro do adapter, só depois
que `await callback(message)` resolve sem lançar. Isso é o mecanismo existente que já implementa
"não confirmar antes do sucesso" (FR-006) — nenhuma mudança é necessária aqui, apenas garantir que
o novo publisher de broadcast propague exceções em vez de engoli-las, para que esse `ack` automático
continue correto.

### `apps/backend/src/shared/infra/queue/queue.ts` (interface completa atual)

```typescript
export interface Queue {
	connect(): Promise<void>
	publish<TData>(exchange: string, data: TData): Promise<void>
	consume(queue: string, callback: CallableFunction): Promise<void>
}
```

### `apps/backend/src/shared/infra/queue/exchanges.ts` (arquivo completo atual)

```typescript
export const EXCHANGES = {
	LOG: "log",
	USER_CREATED: "userCreated",
	PASSWORD_CHANGED: "passwordChanged",
	CHECK_IN_CREATED: "checkInCreated",
	STRIPE_WEBHOOK: "stripeWebhook",
	RATE_LIMIT_EXCEEDED: "rateLimitExceeded",
	NOTIFICATION_CREATED: "notificationCreated",
} as const

export type ExchangeTypes = (typeof EXCHANGES)[keyof typeof EXCHANGES]
```

### `apps/backend/src/shared/infra/queue/queue-setup.ts` (arquivo completo atual, script standalone `pnpm setup-queue`)

```typescript
import "reflect-metadata"
import type { Channel } from "amqplib"
import { container } from "../ioc/container"
import { SHARED_TYPES } from "../ioc/types"
import { EXCHANGES } from "./exchanges"
import { QUEUES } from "./queues"
import type { RabbitMQAdapter } from "./rabbitmq-adapter"

async function queueSetup() {
	const queue = container.get<RabbitMQAdapter>(SHARED_TYPES.Queue)
	console.log(queue)
	await queue.connect()
	const channel = await queue.createChannel()
	// Create exchanges
	await createExchange(channel, EXCHANGES.USER_CREATED)
	await createExchange(channel, EXCHANGES.LOG)
	await createExchange(channel, EXCHANGES.PASSWORD_CHANGED)
	await createExchange(channel, EXCHANGES.CHECK_IN_CREATED)
	await createExchange(channel, EXCHANGES.STRIPE_WEBHOOK)
	await createExchange(channel, EXCHANGES.NOTIFICATION_CREATED)
	//  Create queues
	await createQueue(channel, QUEUES.SEND_WELCOME_EMAIL)
	await createQueue(channel, QUEUES.LOG)
	await createQueue(channel, QUEUES.NOTIFY_PASSWORD_CHANGED)
	await createQueue(channel, QUEUES.CHECK_IN)
	await createQueue(channel, QUEUES.STRIPE_WEBHOOK)
	await createQueue(channel, QUEUES.NOTIFICATION_CREATED)
	// Bind queues to exchanges
	await bindQueueToExchange(channel, QUEUES.SEND_WELCOME_EMAIL, EXCHANGES.USER_CREATED)
	await bindQueueToExchange(channel, QUEUES.LOG, EXCHANGES.LOG)
	await bindQueueToExchange(channel, QUEUES.CHECK_IN, EXCHANGES.CHECK_IN_CREATED)
	await bindQueueToExchange(channel, QUEUES.STRIPE_WEBHOOK, EXCHANGES.STRIPE_WEBHOOK)
	await bindQueueToExchange(channel, QUEUES.NOTIFICATION_CREATED, EXCHANGES.NOTIFICATION_CREATED)
	// Close connection
	await channel.close()
	await queue.close()
}

async function createExchange(channel: Channel, exchange: string): Promise<void> {
	await channel.assertExchange(exchange, "direct", { durable: true })
}

async function createQueue(channel: Channel, queue: string): Promise<void> {
	await channel.assertQueue(queue, { durable: true })
}

async function bindQueueToExchange(
	channel: Channel,
	queue: string,
	exchange: string,
): Promise<void> {
	await channel.bindQueue(queue, exchange, "")
}

queueSetup()
```

**Importante:** `NOTIFICATION_BROADCAST` NÃO deve ser adicionada a este script. A fila exclusiva por
instância é dinâmica (nome gerado pelo broker, não fixo), então não se encaixa no padrão
exchange+fila-fixa+bind deste script. A exchange fanout é declarada de forma idempotente pelos
próprios componentes de runtime (`NotificationBroadcastPublisher` via `RabbitMQAdapter.publish`, e
`NotificationBroadcastSubscriber` via seu `setup` do `amqp-connection-manager`) — `assertExchange`
é idempotente, não há problema em ambos declararem.

### `apps/backend/src/shared/infra/queue/queues.ts` (arquivo completo atual — NÃO precisa mudar nesta feature)

```typescript
export const QUEUES = {
	SEND_WELCOME_EMAIL: "sendWelcomeEmail",
	NOTIFY_PASSWORD_CHANGED: "notifyPasswordChanged",
	LOG: "log",
	CHECK_IN: "checkIn",
	STRIPE_WEBHOOK: "stripeWebhook",
	NOTIFICATION_CREATED: "notificationCreated",
} as const

export type Queues = (typeof QUEUES)[keyof typeof QUEUES]
```

### Variável de ambiente AMQP

`apps/backend/src/shared/infra/env/index.ts` já define (não precisa mudar):
```typescript
AMQP_URL: z.url().default("amqp://localhost"),
```
Lida como `env.AMQP_URL`, importável de `@/shared/infra/env` (mesmo caminho usado por
`rabbitmq-adapter.ts`, que importa `import { env } from "../env"` a partir de
`apps/backend/src/shared/infra/queue/`).

### `apps/backend/src/shared/infra/ioc/module/infra/queue-provider.ts` (completo — NÃO precisa mudar)

```typescript
import type { ResolutionContext } from "inversify"
import { isProduction } from "@/shared/infra/env"
import type { Queue } from "@/shared/infra/queue/queue"
import { QueueMemoryAdapter } from "@/shared/infra/queue/queue-memory-adapter"
import { RabbitMQAdapter } from "@/shared/infra/queue/rabbitmq-adapter"

export class QueueProvider {
	public static provide(context: ResolutionContext): Queue {
		return isProduction()
			? context.get(RabbitMQAdapter, { autobind: true })
			: context.get(QueueMemoryAdapter, { autobind: true })
	}
}
```

`SHARED_TYPES.Queue` é o binding usado para injetar isso em qualquer componente (ex:
`NotificationQueueWorker`, `NotificationBroadcastPublisher`). `QueueMemoryAdapter` (dev/test) não
precisa ser alterado: a nova assinatura de `publish` no task 2 adiciona um terceiro parâmetro
**opcional** (`type: ExchangeTypeKind = "direct"`), e uma classe que implementa a interface `Queue`
com uma assinatura de método com **menos** parâmetros continua satisfazendo o TypeScript
estruturalmente (parâmetros extras opcionais são permitidos ao implementar). Confirmar apenas via
`pnpm --filter backend tsc:check` na Task 2 — nenhuma edição em `queue-memory-adapter.ts` é
necessária.

### Componentes atuais do bounded context `notification` (a substituir/remover)

`apps/backend/src/notification/infra/redis/redis-notification-publisher.ts` (completo, 41 linhas):
```typescript
import { injectable } from "inversify"
import Redis from "ioredis"
import { env } from "@/shared/infra/env"

@injectable()
export class RedisNotificationPublisher {
	private readonly client: Redis

	constructor() {
		this.client = new Redis({
			host: env.REDIS_HOST,
			port: env.REDIS_PORT,
			lazyConnect: true,
			enableOfflineQueue: false,
		})
	}

	private async ensureConnected(): Promise<void> {
		if (this.client.status === "ready") return
		await this.client.connect()
	}

	public async publish(channel: string, message: string): Promise<void> {
		await this.ensureConnected()
		await this.client.publish(channel, message)
	}

	public async disconnect(): Promise<void> {
		await this.client.disconnect()
	}
}
```
(Nota: reconstrução aproximada com base no relatório de pesquisa — método/API pública confirmada:
`publish(channel: string, message: string): Promise<void>` e `disconnect(): Promise<void>`,
injeta seu próprio cliente IORedis com `env.REDIS_HOST`/`env.REDIS_PORT`, `lazyConnect: true`.)

`apps/backend/src/notification/infra/worker/notification-queue-worker.ts` (comportamento
confirmado, 32 linhas): `NotificationQueueWorker implements Controller`, injeta `SHARED_TYPES.Queue`
e `NOTIFICATION_TYPES.Infra.RedisNotificationPublisher`. Método `init()`:
```typescript
public async init(): Promise<void> {
	await this.queue.consume(QUEUES.NOTIFICATION_CREATED, async (payload: NotificationCreatedPayload) => {
		await this.redisNotificationPublisher.publish(
			`notifications:${payload.userId}`,
			JSON.stringify(payload),
		)
	})
}
```
(Assinatura exata do construtor e imports não foram capturados 100% verbatim pela pesquisa — o
task-writer deve escrever a Task 5 com um passo explícito de leitura do arquivo real antes de
editá-lo, já que o executor da task terá acesso de leitura ao repo; o essencial e confirmado é: ele
injeta `SHARED_TYPES.Queue` e o publisher Redis, e chama `.consume(QUEUES.NOTIFICATION_CREATED, callback)`
onde o callback publica no Redis.)

`apps/backend/src/notification/infra/sse/sse-manager.ts` (completo, 56 linhas — NÃO muda):
```typescript
import { injectable } from "inversify"

export interface SseClient {
	raw: {
		write(chunk: string): void
	}
}

@injectable()
export class SseManager {
	private readonly clients = new Map<string, Set<SseClient>>()

	public add(userId: string, reply: SseClient): void {
		const userClients = this.clients.get(userId)
		if (!userClients) {
			this.clients.set(userId, new Set([reply]))
			return
		}
		userClients.add(reply)
	}

	public remove(userId: string, reply: SseClient): void {
		const userClients = this.clients.get(userId)
		if (!userClients) {
			return
		}
		userClients.delete(reply)
		if (userClients.size === 0) {
			this.clients.delete(userId)
		}
	}

	public send(userId: string, data: unknown): void {
		const userClients = this.clients.get(userId)
		if (!userClients) {
			return
		}
		const message = `data: ${JSON.stringify(data)}\n\n`
		const deadClients: SseClient[] = []
		for (const reply of userClients) {
			try {
				reply.raw.write(message)
			} catch {
				deadClients.push(reply)
			}
		}
		for (const deadClient of deadClients) {
			this.remove(userId, deadClient)
		}
	}

	public clientCount(userId: string): number {
		return this.clients.get(userId)?.size ?? 0
	}
}
```

`apps/backend/src/notification/infra/redis/redis-notification-subscriber.ts` (comportamento
confirmado, 81 linhas): injeta `SseManager` via `NOTIFICATION_TYPES.Infra.SseManager`, faz
`psubscribe("notifications:*")`, no handler `pmessage` extrai `userId` de
`channel.replace("notifications:", "")`, faz `JSON.parse(message)` e chama
`sseManager.send(userId, { type: "notification", payload })`. API pública: `subscribe(): Promise<void>`,
`disconnect(): Promise<void>` (faz `punsubscribe` + `quit`).

### IoC — `apps/backend/src/shared/infra/ioc/module/notification/notification-module.ts` (completo atual)

```typescript
import { ContainerModule } from "inversify"
import { CreateNotificationOnCheckInEventHandler } from "@/notification/application/event-handler/create-notification-on-check-in-event.handler"
import { GetNotificationsUseCase } from "@/notification/application/use-case/get-notifications.usecase"
import { GetUnreadCountUseCase } from "@/notification/application/use-case/get-unread-count.usecase"
import { MarkAllAsReadUseCase } from "@/notification/application/use-case/mark-all-as-read.usecase"
import { MarkAsReadUseCase } from "@/notification/application/use-case/mark-as-read.usecase"
import { GetNotificationsController } from "@/notification/infra/controller/get-notifications.controller.js"
import { GetUnreadCountController } from "@/notification/infra/controller/get-unread-count.controller.js"
import { MarkAllAsReadController } from "@/notification/infra/controller/mark-all-as-read.controller.js"
import { MarkAsReadController } from "@/notification/infra/controller/mark-as-read.controller.js"
import { NotificationStreamController } from "@/notification/infra/controller/notification-stream.controller.js"
import { RedisNotificationPublisher } from "@/notification/infra/redis/redis-notification-publisher"
import { RedisNotificationSubscriber } from "@/notification/infra/redis/redis-notification-subscriber"
import { NotificationRepositoryProvider } from "@/notification/infra/repository/notification-repository-provider"
import { SseManager } from "@/notification/infra/sse/sse-manager"
import { NotificationQueueWorker } from "@/notification/infra/worker/notification-queue-worker"
import { NOTIFICATION_TYPES } from "../../types"

export const notificationModule = new ContainerModule(({ bind }) => {
	bind(NOTIFICATION_TYPES.Repositories.Notification)
		.toDynamicValue(NotificationRepositoryProvider.provide)
		.inSingletonScope()
	bind(NOTIFICATION_TYPES.UseCases.GetNotifications).to(GetNotificationsUseCase)
	bind(NOTIFICATION_TYPES.UseCases.GetUnreadCount).to(GetUnreadCountUseCase)
	bind(NOTIFICATION_TYPES.UseCases.MarkAsRead).to(MarkAsReadUseCase)
	bind(NOTIFICATION_TYPES.UseCases.MarkAllAsRead).to(MarkAllAsReadUseCase)
	bind(NOTIFICATION_TYPES.EventHandlers.CreateNotificationOnCheckIn)
		.to(CreateNotificationOnCheckInEventHandler)
		.inSingletonScope()
	bind(NOTIFICATION_TYPES.Infra.SseManager).to(SseManager).inSingletonScope()
	bind(NOTIFICATION_TYPES.Infra.RedisNotificationPublisher)
		.to(RedisNotificationPublisher)
		.inSingletonScope()
	bind(NOTIFICATION_TYPES.Infra.RedisNotificationSubscriber)
		.to(RedisNotificationSubscriber)
		.inSingletonScope()
	bind(NOTIFICATION_TYPES.Infra.NotificationQueueWorker)
		.to(NotificationQueueWorker)
		.inSingletonScope()
	bind(NOTIFICATION_TYPES.Controllers.GetNotifications).to(GetNotificationsController).inSingletonScope()
	bind(NOTIFICATION_TYPES.Controllers.GetUnreadCount).to(GetUnreadCountController).inSingletonScope()
	bind(NOTIFICATION_TYPES.Controllers.MarkAsRead).to(MarkAsReadController).inSingletonScope()
	bind(NOTIFICATION_TYPES.Controllers.MarkAllAsRead).to(MarkAllAsReadController).inSingletonScope()
	bind(NOTIFICATION_TYPES.Controllers.NotificationStream).to(NotificationStreamController).inSingletonScope()
})
```

### `apps/backend/src/shared/infra/ioc/module/service-identifier/notification-types.ts` (completo atual)

```typescript
export const NOTIFICATION_TYPES = {
	Repositories: {
		Notification: Symbol.for("NotificationRepository"),
	},
	UseCases: {
		GetNotifications: Symbol.for("GetNotificationsUseCase"),
		GetUnreadCount: Symbol.for("GetUnreadCountUseCase"),
		MarkAsRead: Symbol.for("MarkAsReadUseCase"),
		MarkAllAsRead: Symbol.for("MarkAllAsReadUseCase"),
	},
	Controllers: {
		GetNotifications: Symbol.for("GetNotificationsController"),
		GetUnreadCount: Symbol.for("GetUnreadCountController"),
		MarkAsRead: Symbol.for("MarkAsReadController"),
		MarkAllAsRead: Symbol.for("MarkAllAsReadController"),
		NotificationStream: Symbol.for("NotificationStreamController"),
	},
	EventHandlers: {
		CreateNotificationOnCheckIn: Symbol.for("CreateNotificationOnCheckInEventHandler"),
	},
	Infra: {
		SseManager: Symbol.for("SseManager"),
		RedisNotificationPublisher: Symbol.for("RedisNotificationPublisher"),
		RedisNotificationSubscriber: Symbol.for("RedisNotificationSubscriber"),
		NotificationQueueWorker: Symbol.for("NotificationQueueWorker"),
	},
} as const
```

### `apps/backend/src/bootstrap/setup-notification-module.ts` (completo atual)

```typescript
import type { CreateNotificationOnCheckInEventHandler } from "@/notification/application/event-handler/create-notification-on-check-in-event.handler"
import type { GetNotificationsController } from "@/notification/infra/controller/get-notifications.controller.js"
import type { GetUnreadCountController } from "@/notification/infra/controller/get-unread-count.controller.js"
import type { MarkAllAsReadController } from "@/notification/infra/controller/mark-all-as-read.controller.js"
import type { MarkAsReadController } from "@/notification/infra/controller/mark-as-read.controller.js"
import type { NotificationStreamController } from "@/notification/infra/controller/notification-stream.controller.js"
import type { RedisNotificationSubscriber } from "@/notification/infra/redis/redis-notification-subscriber"
import type { NotificationQueueWorker } from "@/notification/infra/worker/notification-queue-worker"
import { NOTIFICATION_TYPES } from "@/shared/infra/ioc/types"

import { type ModuleControllers, resolve } from "./server-build"

export async function setupNotificationModule(): Promise<ModuleControllers> {
	const createNotificationOnCheckInEventHandler =
		resolve<CreateNotificationOnCheckInEventHandler>(
			NOTIFICATION_TYPES.EventHandlers.CreateNotificationOnCheckIn,
		)
	createNotificationOnCheckInEventHandler.subscribe()
	const redisNotificationSubscriber = resolve<RedisNotificationSubscriber>(
		NOTIFICATION_TYPES.Infra.RedisNotificationSubscriber,
	)
	await redisNotificationSubscriber.subscribe()
	const notificationQueueWorker = resolve<NotificationQueueWorker>(
		NOTIFICATION_TYPES.Infra.NotificationQueueWorker,
	)
	await notificationQueueWorker.init()
	return {
		controllers: [
			resolve<GetNotificationsController>(NOTIFICATION_TYPES.Controllers.GetNotifications),
			resolve<GetUnreadCountController>(NOTIFICATION_TYPES.Controllers.GetUnreadCount),
			resolve<MarkAsReadController>(NOTIFICATION_TYPES.Controllers.MarkAsRead),
			resolve<MarkAllAsReadController>(NOTIFICATION_TYPES.Controllers.MarkAllAsRead),
			resolve<NotificationStreamController>(NOTIFICATION_TYPES.Controllers.NotificationStream),
		],
		workers: [notificationQueueWorker],
	}
}
```

### `amqp-connection-manager` (v5.0.0, nova dependência)

API mínima necessária:
```typescript
import amqp from "amqp-connection-manager"
import type { ConfirmChannel, Channel } from "amqplib"

const connection = amqp.connect([env.AMQP_URL])
const channelWrapper = connection.createChannel({
	setup: async (channel: Channel) => {
		await channel.assertExchange(EXCHANGES.NOTIFICATION_BROADCAST, "fanout", { durable: false })
		const { queue } = await channel.assertQueue("", { exclusive: true, autoDelete: true })
		await channel.bindQueue(queue, EXCHANGES.NOTIFICATION_BROADCAST, "")
		await channel.consume(queue, (msg) => {
			if (!msg) return
			// handler...
			channel.ack(msg)
		})
	},
})
```
Ao reconectar (queda de TCP), a lib automaticamente reexecuta a função `setup` inteira — por isso a
fila exclusiva e o bind são redeclarados sem código adicional. `connection.close()` encerra tudo.

### Convenções de teste do backend (confirmadas em `sse-manager.test.ts` e `pino-adapter.test.ts`)

- Vitest puro: `describe`, `it`/`test`, `expect`, `vi` de `"vitest"`.
- Mocks manuais leves via `vi.fn()` em factories locais (ex: `makeMockPinoLogger()`), sem
  `vi.mock()` de módulo nos exemplos vistos.
- SUT real instanciado diretamente; só dependências externas (logger, `reply.raw`, cliente
  amqplib/Redis) são fake.
- Nomenclatura: `describe("NomeDaClasse")` no topo, `describe("nomeDoMetodo")` aninhado,
  `it("should <comportamento>", ...)` frases descritivas começando com "should".
- Não existe teste unitário hoje para `RabbitMQAdapter`, `NotificationQueueWorker`,
  `RedisNotificationPublisher`/`Subscriber` — sem precedente direto de teste de fila
  callback-based; os novos testes devem estabelecer o padrão usando mock manual do canal amqplib
  (`{ assertExchange: vi.fn(), publish: vi.fn(), consume: vi.fn(), ack: vi.fn(), assertQueue: vi.fn(), bindQueue: vi.fn() }`).

---

## Decomposição completa das 9 tasks

### Task 1 — Adicionar dependência `amqp-connection-manager` [FR-004]

- **Tier:** cheap
- **Depends on:** N/A
- **Arquivos:** Modify: `apps/backend/package.json`
- **Skills:** `dependency-updater` (adição de dependência nova), `no-workarounds` (garantir que a versão fixada seja compatível, não um workaround de version pinning solto)
- **Passos:**
  1. Rodar `pnpm --filter backend add amqp-connection-manager@5.0.0` (fixar a versão major estável confirmada).
  2. Rodar `pnpm --filter backend tsc:check` para confirmar que a instalação não quebra o build (nenhum uso ainda, só a instalação).
  3. Confirmar no `package.json` do backend que `"amqp-connection-manager": "5.0.0"` (ou `^5.0.0`, conforme o que o pnpm gravar) foi adicionado em `dependencies` (não `devDependencies`, pois é usado em runtime).
  4. Commit: `git add apps/backend/package.json pnpm-lock.yaml && git commit -m "chore(backend): adiciona amqp-connection-manager"`.
- **Critérios de sucesso:** `pnpm --filter backend tsc:check` passa; dependência presente em `apps/backend/package.json`.
- Sem teste de comportamento (é só instalação de dependência) — não aplica TDD clássico aqui, mas o passo de verificação (`tsc:check`) substitui o "run test to verify".

### Task 2 — Generalizar `RabbitMQAdapter.publish` para aceitar tipo de exchange [FR-008, FR-009]

- **Tier:** standard
- **Depends on:** N/A
- **Arquivos:** Modify: `apps/backend/src/shared/infra/queue/queue.ts`, `apps/backend/src/shared/infra/queue/rabbitmq-adapter.ts`. Test (novo): `apps/backend/src/shared/infra/queue/rabbitmq-adapter.test.ts`
- **Skills:** `typescript-advanced` (união de tipo `direct | fanout` e generics em `publish<TData>`), `test-antipatterns` (mock do canal amqplib sem sobre-mockar), `refactoring` (mudança de assinatura preservando comportamento default), `no-workarounds`
- **Detalhe da mudança:**
  - `queue.ts`: adicionar tipo `export type ExchangeKind = "direct" | "fanout"` e mudar a assinatura de `publish<TData>(exchange: string, data: TData): Promise<void>` para `publish<TData>(exchange: string, data: TData, type?: ExchangeKind): Promise<void>`.
  - `rabbitmq-adapter.ts`: em `publish`, trocar `await channel.assertExchange(exchange, "direct", { durable: true })` por `await channel.assertExchange(exchange, type, { durable: true })` onde `type: ExchangeKind = "direct"` é parâmetro adicional do método com esse valor default.
  - Import `ExchangeKind` de `./queue` em `rabbitmq-adapter.ts`.
  - `QueueMemoryAdapter` NÃO precisa de nenhuma edição (parâmetro extra opcional não quebra a implementação estrutural da interface) — só confirmar com `tsc:check` no passo final.
- **Passos (TDD):**
  1. Escrever teste falho em `rabbitmq-adapter.test.ts`:
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
     		it("should assert exchange as direct by default", async () => {
     			const adapter = new RabbitMQAdapter()
     			const channel = makeMockChannel()
     			// @ts-expect-error acessa campo privado para injetar canal fake no teste
     			adapter["_channel"] = channel

     			await adapter.publish("some-exchange", { foo: "bar" })

     			expect(channel.assertExchange).toHaveBeenCalledWith("some-exchange", "direct", { durable: true })
     		})

     		it("should assert exchange as fanout when type is explicitly fanout", async () => {
     			const adapter = new RabbitMQAdapter()
     			const channel = makeMockChannel()
     			// @ts-expect-error acessa campo privado para injetar canal fake no teste
     			adapter["_channel"] = channel

     			await adapter.publish("notificationBroadcast", { userId: "u1" }, "fanout")

     			expect(channel.assertExchange).toHaveBeenCalledWith("notificationBroadcast", "fanout", { durable: true })
     		})
     	})
     })
     ```
  2. Rodar: `pnpm --filter backend test:run -- -t "RabbitMQAdapter"` — Esperado: FAIL (assinatura de `publish` ainda não aceita terceiro parâmetro / `assertExchange` ainda hardcoded `"direct"`).
  3. Implementar a mudança em `queue.ts` e `rabbitmq-adapter.ts` (ver "Detalhe da mudança" acima — trecho completo do método após a mudança):
     ```typescript
     public async publish<TData>(
     	exchange: string,
     	data: TData,
     	type: ExchangeKind = "direct",
     ): Promise<void> {
     	const channel = await this.channel()
     	await channel.assertExchange(exchange, type, { durable: true })
     	const buffer = Buffer.from(JSON.stringify(data))
     	this.logger.info(this, { exchange })
     	channel.publish(exchange, "", buffer)
     }
     ```
  4. Rodar: `pnpm --filter backend test:run -- -t "RabbitMQAdapter"` — Esperado: PASS (ambos os testes).
  5. Rodar `pnpm --filter backend tsc:check` para confirmar que `QueueMemoryAdapter` e todo chamador de `Queue.publish` (os 7 exchanges `direct` existentes) continuam compilando sem alteração — nenhuma chamada existente passa o terceiro parâmetro, então usam o default `"direct"`, preservando o comportamento atual (regressão coberta).
  6. Commit: `git add apps/backend/src/shared/infra/queue/queue.ts apps/backend/src/shared/infra/queue/rabbitmq-adapter.ts apps/backend/src/shared/infra/queue/rabbitmq-adapter.test.ts && git commit -m "feat(queue): RabbitMQAdapter aceita tipo de exchange (direct default, fanout)"`.
- **Critérios de sucesso:** os 2 testes novos passam; `tsc:check` limpo; nenhuma chamada existente a `queue.publish(exchange, data)` precisa mudar.

### Task 3 — Adicionar exchange `NOTIFICATION_BROADCAST` e novos symbols Inversify [FR-009]

- **Tier:** cheap
- **Depends on:** N/A
- **Arquivos:** Modify: `apps/backend/src/shared/infra/queue/exchanges.ts`, `apps/backend/src/shared/infra/ioc/module/service-identifier/notification-types.ts`
- **Skills:** `typescript-advanced` (tipo derivado `as const`), `no-workarounds`
- **Passos:**
  1. Escrever teste falho em `apps/backend/src/shared/infra/queue/exchanges.test.ts` (novo arquivo):
     ```typescript
     import { describe, expect, it } from "vitest"
     import { EXCHANGES } from "./exchanges"

     describe("EXCHANGES", () => {
     	it("should include NOTIFICATION_BROADCAST", () => {
     		expect(EXCHANGES.NOTIFICATION_BROADCAST).toBe("notificationBroadcast")
     	})
     })
     ```
  2. Rodar: `pnpm --filter backend test:run -- -t "EXCHANGES"` — Esperado: FAIL (`NOTIFICATION_BROADCAST` undefined).
  3. Implementar — adicionar a linha em `exchanges.ts`:
     ```typescript
     export const EXCHANGES = {
     	LOG: "log",
     	USER_CREATED: "userCreated",
     	PASSWORD_CHANGED: "passwordChanged",
     	CHECK_IN_CREATED: "checkInCreated",
     	STRIPE_WEBHOOK: "stripeWebhook",
     	RATE_LIMIT_EXCEEDED: "rateLimitExceeded",
     	NOTIFICATION_CREATED: "notificationCreated",
     	NOTIFICATION_BROADCAST: "notificationBroadcast",
     } as const

     export type ExchangeTypes = (typeof EXCHANGES)[keyof typeof EXCHANGES]
     ```
  4. Rodar: `pnpm --filter backend test:run -- -t "EXCHANGES"` — Esperado: PASS.
  5. Adicionar os dois novos symbols em `notification-types.ts`, no bloco `Infra` (sem teste dedicado — é uma constante Inversify; validado indiretamente pelo `tsc:check` e pelas Tasks 4/6 que os consomem):
     ```typescript
     Infra: {
     	SseManager: Symbol.for("SseManager"),
     	RedisNotificationPublisher: Symbol.for("RedisNotificationPublisher"),
     	RedisNotificationSubscriber: Symbol.for("RedisNotificationSubscriber"),
     	NotificationQueueWorker: Symbol.for("NotificationQueueWorker"),
     	NotificationBroadcastPublisher: Symbol.for("NotificationBroadcastPublisher"),
     	NotificationBroadcastSubscriber: Symbol.for("NotificationBroadcastSubscriber"),
     },
     ```
     (Os symbols `RedisNotificationPublisher`/`RedisNotificationSubscriber` serão removidos na Task 8, após as Tasks 4-7 pararem de depender deles — não remover aqui ainda.)
  6. Rodar `pnpm --filter backend tsc:check`.
  7. Commit: `git add apps/backend/src/shared/infra/queue/exchanges.ts apps/backend/src/shared/infra/queue/exchanges.test.ts apps/backend/src/shared/infra/ioc/module/service-identifier/notification-types.ts && git commit -m "feat(notification): adiciona exchange notificationBroadcast e symbols Inversify"`.
- **Critérios de sucesso:** teste novo passa; `tsc:check` limpo; `EXCHANGES.NOTIFICATION_BROADCAST === "notificationBroadcast"`.

### Task 4 — Criar `NotificationBroadcastPublisher` [FR-001]

- **Tier:** standard
- **Depends on:** task-02, task-03
- **Arquivos:** Create: `apps/backend/src/notification/infra/queue/notification-broadcast-publisher.ts`. Test: `apps/backend/src/notification/infra/queue/notification-broadcast-publisher.test.ts`. Modify: `apps/backend/src/shared/infra/ioc/module/notification/notification-module.ts` (binding).
- **Skills:** `typescript-advanced`, `test-antipatterns`, `no-workarounds`
- **Passos (TDD):**
  1. Escrever teste falho:
     ```typescript
     import { describe, expect, it, vi } from "vitest"
     import type { Queue } from "@/shared/infra/queue/queue"
     import { NotificationBroadcastPublisher } from "./notification-broadcast-publisher"

     function makeMockQueue(): Queue {
     	return {
     		connect: vi.fn(),
     		publish: vi.fn(),
     		consume: vi.fn(),
     	}
     }

     describe("NotificationBroadcastPublisher", () => {
     	describe("publish", () => {
     		it("should publish payload to the notificationBroadcast fanout exchange", async () => {
     			const queue = makeMockQueue()
     			const publisher = new NotificationBroadcastPublisher(queue)

     			await publisher.publish({ userId: "u1", notificationId: "n1" })

     			expect(queue.publish).toHaveBeenCalledWith(
     				"notificationBroadcast",
     				{ userId: "u1", notificationId: "n1" },
     				"fanout",
     			)
     		})
     	})
     })
     ```
  2. Rodar: `pnpm --filter backend test:run -- -t "NotificationBroadcastPublisher"` — Esperado: FAIL (módulo não existe).
  3. Implementar:
     ```typescript
     import { inject, injectable } from "inversify"
     import { EXCHANGES } from "@/shared/infra/queue/exchanges"
     import type { Queue } from "@/shared/infra/queue/queue"
     import { SHARED_TYPES } from "@/shared/infra/ioc/types"

     @injectable()
     export class NotificationBroadcastPublisher {
     	constructor(@inject(SHARED_TYPES.Queue) private readonly queue: Queue) {}

     	public async publish<TPayload>(payload: TPayload): Promise<void> {
     		await this.queue.publish(EXCHANGES.NOTIFICATION_BROADCAST, payload, "fanout")
     	}
     }
     ```
     (Confirmar o caminho exato de `SHARED_TYPES` — mesmo import usado por `queue-provider.ts`: `@/shared/infra/ioc/types`.)
  4. Rodar: `pnpm --filter backend test:run -- -t "NotificationBroadcastPublisher"` — Esperado: PASS.
  5. Registrar no container — em `notification-module.ts`, importar `NotificationBroadcastPublisher` de `@/notification/infra/queue/notification-broadcast-publisher` e adicionar o binding:
     ```typescript
     bind(NOTIFICATION_TYPES.Infra.NotificationBroadcastPublisher)
     	.to(NotificationBroadcastPublisher)
     	.inSingletonScope()
     ```
     (Manter os bindings `RedisNotificationPublisher`/`RedisNotificationSubscriber` intactos por enquanto — serão removidos na Task 8.)
  6. Rodar `pnpm --filter backend tsc:check`.
  7. Commit: `git add apps/backend/src/notification/infra/queue/notification-broadcast-publisher.ts apps/backend/src/notification/infra/queue/notification-broadcast-publisher.test.ts apps/backend/src/shared/infra/ioc/module/notification/notification-module.ts && git commit -m "feat(notification): adiciona NotificationBroadcastPublisher"`.
- **Critérios de sucesso:** teste novo passa; binding Inversify presente; `tsc:check` limpo.

### Task 5 — Atualizar `NotificationQueueWorker` para publicar via `NotificationBroadcastPublisher` [FR-001, FR-006]

- **Tier:** standard
- **Depends on:** task-04
- **Arquivos:** Modify: `apps/backend/src/notification/infra/worker/notification-queue-worker.ts`. Modify/criar: `apps/backend/src/notification/infra/worker/notification-queue-worker.test.ts` (não existe hoje — criar).
- **Skills:** `refactoring` (troca de dependência preservando o fluxo), `test-antipatterns`, `no-workarounds`
- **Passos (TDD):**
  1. Antes de editar, ler o arquivo atual (`apps/backend/src/notification/infra/worker/notification-queue-worker.ts`) para confirmar a assinatura exata do construtor e o nome/shape do payload usado em `queue.consume(QUEUES.NOTIFICATION_CREATED, callback)` — a pesquisa desta feature confirmou o comportamento (injeta `SHARED_TYPES.Queue` + `NOTIFICATION_TYPES.Infra.RedisNotificationPublisher`, chama `redisNotificationPublisher.publish(\`notifications:${payload.userId}\`, JSON.stringify(payload))` dentro do callback de `consume`), mas não capturou o texto-fonte 100% verbatim (imports exatos, tipo do payload). Use essa leitura para escrever o teste e a implementação com os tipos reais do arquivo.
  2. Escrever teste falho em `notification-queue-worker.test.ts` cobrindo o novo comportamento:
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
     (Ajustar o construtor `new NotificationQueueWorker(queue, broadcastPublisher)` para a ordem/nome real de parâmetros confirmada na leitura do Passo 1 — se o arquivo real usa injeção via `@inject` decorators com Inversify resolvendo automaticamente, o teste deve instanciar manualmente passando os mocks na mesma ordem dos parâmetros do construtor.)
  3. Rodar: `pnpm --filter backend test:run -- -t "NotificationQueueWorker"` — Esperado: FAIL (ainda usa `RedisNotificationPublisher`).
  4. Implementar — trocar a dependência injetada de `NOTIFICATION_TYPES.Infra.RedisNotificationPublisher` para `NOTIFICATION_TYPES.Infra.NotificationBroadcastPublisher`, e o corpo do callback de `init()` para:
     ```typescript
     public async init(): Promise<void> {
     	await this.queue.consume(QUEUES.NOTIFICATION_CREATED, async (payload: NotificationCreatedPayload) => {
     		await this.notificationBroadcastPublisher.publish(payload)
     	})
     }
     ```
     (Manter o tipo `NotificationCreatedPayload` real do arquivo — não inventar um novo tipo; usar o já existente. Remover o `JSON.stringify` e a construção do channel `notifications:${payload.userId}`, pois `NotificationBroadcastPublisher.publish` já lida com a serialização via `RabbitMQAdapter.publish`.)
  5. Rodar: `pnpm --filter backend test:run -- -t "NotificationQueueWorker"` — Esperado: PASS.
  6. Rodar `pnpm --filter backend tsc:check`.
  7. Commit: `git add apps/backend/src/notification/infra/worker/notification-queue-worker.ts apps/backend/src/notification/infra/worker/notification-queue-worker.test.ts && git commit -m "refactor(notification): worker publica broadcast via RabbitMQ em vez de Redis"`.
- **Critérios de sucesso:** teste novo passa confirmando que o worker não referencia mais `RedisNotificationPublisher`; `tsc:check` limpo. `ack` da fila durável continua automático via `RabbitMQAdapter.consume` (nenhuma mudança nesse mecanismo) — só ocorre se o callback (agora chamando `NotificationBroadcastPublisher.publish`) resolver sem lançar, preservando FR-006.

### Task 6 — Criar `NotificationBroadcastSubscriber` com `amqp-connection-manager` [FR-002, FR-003, FR-004]

- **Tier:** capable
- **Depends on:** task-01, task-03
- **Arquivos:** Create: `apps/backend/src/notification/infra/queue/notification-broadcast-subscriber.ts`. Test: `apps/backend/src/notification/infra/queue/notification-broadcast-subscriber.test.ts`.
- **Skills:** `context7` (consultar a API real do pacote `amqp-connection-manager` publicado, para confirmar assinaturas antes de codar), `typescript-advanced`, `test-antipatterns`, `no-workarounds`
- **Passos (TDD):**
  1. Escrever teste falho mockando o módulo `amqp-connection-manager`:
     ```typescript
     import { describe, expect, it, vi } from "vitest"
     import type { SseManager } from "@/notification/infra/sse/sse-manager"

     const mockChannelWrapper = {
     	waitForConnect: vi.fn().mockResolvedValue(undefined),
     }
     const mockConnection = {
     	createChannel: vi.fn().mockReturnValue(mockChannelWrapper),
     }
     vi.mock("amqp-connection-manager", () => ({
     	default: {
     		connect: vi.fn().mockReturnValue(mockConnection),
     	},
     }))

     import { NotificationBroadcastSubscriber } from "./notification-broadcast-subscriber"

     describe("NotificationBroadcastSubscriber", () => {
     	describe("start", () => {
     		it("should declare the fanout exchange and an exclusive auto-delete queue via setup", async () => {
     			const sseManager = { send: vi.fn() } as unknown as SseManager
     			const subscriber = new NotificationBroadcastSubscriber(sseManager)

     			await subscriber.start()

     			expect(mockConnection.createChannel).toHaveBeenCalledWith(
     				expect.objectContaining({ setup: expect.any(Function) }),
     			)
     		})

     		it("should forward a consumed message to SseManager.send", async () => {
     			const sseManager = { send: vi.fn() } as unknown as SseManager
     			const subscriber = new NotificationBroadcastSubscriber(sseManager)
     			await subscriber.start()

     			const setupFn = mockConnection.createChannel.mock.calls[0][0].setup
     			const fakeChannel = {
     				assertExchange: vi.fn().mockResolvedValue(undefined),
     				assertQueue: vi.fn().mockResolvedValue({ queue: "amq.gen-xyz" }),
     				bindQueue: vi.fn().mockResolvedValue(undefined),
     				consume: vi.fn((_queue, onMessage) => {
     					onMessage({
     						content: Buffer.from(JSON.stringify({ userId: "u1", notificationId: "n1" })),
     					})
     					return Promise.resolve()
     				}),
     				ack: vi.fn(),
     			}
     			await setupFn(fakeChannel)

     			expect(fakeChannel.assertExchange).toHaveBeenCalledWith("notificationBroadcast", "fanout", { durable: false })
     			expect(fakeChannel.assertQueue).toHaveBeenCalledWith("", { exclusive: true, autoDelete: true })
     			expect(fakeChannel.bindQueue).toHaveBeenCalledWith("amq.gen-xyz", "notificationBroadcast", "")
     			expect(sseManager.send).toHaveBeenCalledWith("u1", { type: "notification", payload: { userId: "u1", notificationId: "n1" } })
     			expect(fakeChannel.ack).toHaveBeenCalled()
     		})
     	})
     })
     ```
  2. Rodar: `pnpm --filter backend test:run -- -t "NotificationBroadcastSubscriber"` — Esperado: FAIL (módulo não existe).
  3. Implementar:
     ```typescript
     import amqp, { type ChannelWrapper } from "amqp-connection-manager"
     import type { Channel, ConsumeMessage } from "amqplib"
     import { inject, injectable } from "inversify"
     import { EXCHANGES } from "@/shared/infra/queue/exchanges"
     import { env } from "@/shared/infra/env"
     import { NOTIFICATION_TYPES } from "@/shared/infra/ioc/types"
     import { SseManager } from "./sse-manager"

     @injectable()
     export class NotificationBroadcastSubscriber {
     	private channelWrapper?: ChannelWrapper

     	constructor(
     		@inject(NOTIFICATION_TYPES.Infra.SseManager) private readonly sseManager: SseManager,
     	) {}

     	public async start(): Promise<void> {
     		const connection = amqp.connect([env.AMQP_URL])
     		this.channelWrapper = connection.createChannel({
     			setup: async (channel: Channel) => {
     				await channel.assertExchange(EXCHANGES.NOTIFICATION_BROADCAST, "fanout", { durable: false })
     				const { queue } = await channel.assertQueue("", { exclusive: true, autoDelete: true })
     				await channel.bindQueue(queue, EXCHANGES.NOTIFICATION_BROADCAST, "")
     				await channel.consume(queue, (msg: ConsumeMessage | null) => {
     					if (!msg) return
     					const payload = JSON.parse(msg.content.toString())
     					this.sseManager.send(payload.userId, { type: "notification", payload })
     					channel.ack(msg)
     				})
     			},
     		})
     		await this.channelWrapper.waitForConnect()
     	}

     	public async stop(): Promise<void> {
     		await this.channelWrapper?.close()
     	}
     }
     ```
     Nota: `SseManager` já é `@injectable()` e importado como classe concreta (não há interface separada) — importar de `./sse-manager` (mesmo diretório `infra/sse`, path relativo `../sse/sse-manager` a partir de `infra/queue/`).
  4. Rodar: `pnpm --filter backend test:run -- -t "NotificationBroadcastSubscriber"` — Esperado: PASS (ambos os testes).
  5. Registrar no container — em `notification-module.ts`, importar `NotificationBroadcastSubscriber` de `@/notification/infra/queue/notification-broadcast-subscriber` e adicionar:
     ```typescript
     bind(NOTIFICATION_TYPES.Infra.NotificationBroadcastSubscriber)
     	.to(NotificationBroadcastSubscriber)
     	.inSingletonScope()
     ```
  6. Rodar `pnpm --filter backend tsc:check`.
  7. Commit: `git add apps/backend/src/notification/infra/queue/notification-broadcast-subscriber.ts apps/backend/src/notification/infra/queue/notification-broadcast-subscriber.test.ts apps/backend/src/shared/infra/ioc/module/notification/notification-module.ts && git commit -m "feat(notification): adiciona NotificationBroadcastSubscriber com amqp-connection-manager"`.
- **Critérios de sucesso:** os 2 testes novos passam; binding Inversify presente; `tsc:check` limpo. Confirmar via `context7` (Passo 0, antes do TDD) o nome exato do tipo exportado `ChannelWrapper` e a assinatura de `connection.createChannel({ setup })` na versão `5.0.0` publicada, ajustando imports/tipos se o `context7` reportar uma API ligeiramente diferente da assumida acima.

### Task 7 — Atualizar IoC e bootstrap para os novos componentes [FR-010, FR-011]

- **Tier:** standard
- **Depends on:** task-04, task-05, task-06
- **Arquivos:** Modify: `apps/backend/src/bootstrap/setup-notification-module.ts`
- **Skills:** `refactoring`, `no-workarounds`
- **Passos:**
  1. Ler o arquivo atual `setup-notification-module.ts` (conteúdo já confirmado na pesquisa — ver digest acima) para confirmar que nenhuma outra parte do bootstrap além do bloco descrito referencia `RedisNotificationSubscriber`.
  2. Substituir:
     ```typescript
     const redisNotificationSubscriber = resolve<RedisNotificationSubscriber>(
     	NOTIFICATION_TYPES.Infra.RedisNotificationSubscriber,
     )
     await redisNotificationSubscriber.subscribe()
     ```
     por:
     ```typescript
     const notificationBroadcastSubscriber = resolve<NotificationBroadcastSubscriber>(
     	NOTIFICATION_TYPES.Infra.NotificationBroadcastSubscriber,
     )
     await notificationBroadcastSubscriber.start()
     ```
     E trocar o import `import type { RedisNotificationSubscriber } from "@/notification/infra/redis/redis-notification-subscriber"` por
     `import type { NotificationBroadcastSubscriber } from "@/notification/infra/queue/notification-broadcast-subscriber"`.
  3. Rodar `pnpm --filter backend tsc:check` — Esperado: PASS (não há teste automatizado dedicado a este arquivo de bootstrap; a verificação é por tipo + pelos testes de negócio/fluxo existentes).
  4. Rodar `pnpm --filter backend test:business-flow -- -t "notification-stream"` (ou o nome exato do arquivo `notification-stream.controller.business-flow-test.ts`) para confirmar que o endpoint SSE continua respondendo corretamente após a troca de bootstrap — Esperado: PASS (nenhuma mudança de contrato HTTP).
  5. Commit: `git add apps/backend/src/bootstrap/setup-notification-module.ts && git commit -m "refactor(bootstrap): usa NotificationBroadcastSubscriber em vez de RedisNotificationSubscriber"`.
- **Critérios de sucesso:** `tsc:check` limpo; suíte de business-flow do módulo notification continua verde; bootstrap não referencia mais `RedisNotificationSubscriber`.

### Task 8 — Remover componentes Redis Pub/Sub obsoletos [FR-010, FR-011]

- **Tier:** cheap
- **Depends on:** task-07
- **Arquivos:** Delete: `apps/backend/src/notification/infra/redis/redis-notification-publisher.ts`, `apps/backend/src/notification/infra/redis/redis-notification-subscriber.ts`. Modify: `apps/backend/src/shared/infra/ioc/module/notification/notification-module.ts`, `apps/backend/src/shared/infra/ioc/module/service-identifier/notification-types.ts`.
- **Skills:** `no-workarounds` (garantir remoção limpa, sem deixar import morto/comentado), `refactoring`
- **Passos:**
  1. Rodar `grep -rn "RedisNotificationPublisher\|RedisNotificationSubscriber" apps/backend/src/` para confirmar que, após as Tasks 4-7, as únicas referências restantes são o binding em `notification-module.ts` e os dois arquivos-fonte a remover (nenhum outro consumidor).
  2. Remover do `notification-module.ts` os imports e os dois blocos `bind(...)`:
     ```typescript
     bind(NOTIFICATION_TYPES.Infra.RedisNotificationPublisher).to(RedisNotificationPublisher).inSingletonScope()
     bind(NOTIFICATION_TYPES.Infra.RedisNotificationSubscriber).to(RedisNotificationSubscriber).inSingletonScope()
     ```
     e os imports `import { RedisNotificationPublisher } from "@/notification/infra/redis/redis-notification-publisher"` / `import { RedisNotificationSubscriber } from "@/notification/infra/redis/redis-notification-subscriber"`.
  3. Remover do bloco `Infra` em `notification-types.ts` os dois symbols:
     ```typescript
     RedisNotificationPublisher: Symbol.for("RedisNotificationPublisher"),
     RedisNotificationSubscriber: Symbol.for("RedisNotificationSubscriber"),
     ```
  4. Deletar os arquivos: `git rm apps/backend/src/notification/infra/redis/redis-notification-publisher.ts apps/backend/src/notification/infra/redis/redis-notification-subscriber.ts`. Se a pasta `apps/backend/src/notification/infra/redis/` ficar vazia, removê-la também.
  5. Rodar `pnpm --filter backend tsc:check` — Esperado: PASS (nenhuma referência pendente).
  6. Rodar `pnpm --filter backend test:run` (suíte completa de unit tests do backend) — Esperado: PASS.
  7. Confirmar que nenhum outro uso de Redis no projeto foi afetado: `grep -rn "REDIS_HOST\|redis-adapter\|RedisAdapter" apps/backend/src/shared/` deve continuar retornando `shared/infra/database/redis/redis-adapter.ts`, `shared/infra/server/plugins/rate-limit-plugin.ts` e `shared/infra/queue/bullmq-adapter.ts` intactos (nenhum desses arquivos deve aparecer no diff desta task).
  8. Commit: `git add -A apps/backend/src/notification/infra/redis apps/backend/src/shared/infra/ioc/module/notification/notification-module.ts apps/backend/src/shared/infra/ioc/module/service-identifier/notification-types.ts && git commit -m "chore(notification): remove RedisNotificationPublisher/Subscriber obsoletos"`.
- **Critérios de sucesso:** `grep` não retorna nenhuma referência a `RedisNotificationPublisher`/`RedisNotificationSubscriber`; `tsc:check` e suíte de unit tests do backend passam; nenhum arquivo de rate-limit/BullMQ/redis-adapter compartilhado foi tocado.

### Task 9 — Teste de integração multi-instância (fanout real via RabbitMQ) [FR-002, FR-003, FR-004, FR-007]

- **Tier:** capable
- **Depends on:** task-07
- **Arquivos:** Create: `apps/backend/src/notification/infra/queue/notification-broadcast.e2e-test.ts` (ou o padrão de nome usado pela suíte `test:e2e:prisma`/RabbitMQ do projeto — confirmar convenção real de nome de arquivo de teste de integração com RabbitMQ antes de criar; se não houver precedente de teste de integração com RabbitMQ real no repo, seguir o padrão `*.business-flow-test.ts` adaptado para infraestrutura, rodando contra o RabbitMQ local subido via `pnpm --filter backend docker:up`).
- **Skills:** `test-antipatterns` (teste de integração real, não mockado — este é o único teste desta feature que deliberadamente NÃO mocka o broker, propositalmente, pois o que se quer provar é o comportamento real de fanout entre múltiplas filas), `no-workarounds`
- **Passos:**
  1. Pré-requisito: RabbitMQ local rodando (`pnpm --filter backend docker:up`), usando `env.AMQP_URL` apontando para ele (mesma URL usada pelos outros testes de integração do backend, se houver — usar a mesma convenção de setup/teardown de conexão AMQP real já usada em algum teste `test:e2e` do projeto, se existir; caso não exista precedente, abrir e fechar a conexão manualmente no `beforeAll`/`afterAll` do próprio arquivo de teste).
  2. Escrever o teste (falho até a Task 6 e 4 já estarem implementadas — nesta task elas já estão, então o teste deve nascer passando ou falhar apenas se algo estiver incorreto na integração real):
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
  3. Rodar o teste contra o RabbitMQ real do docker-compose do projeto (comando exato conforme a suíte de integração do backend — usar `pnpm --filter backend test:e2e:prisma` como referência de comando se este teste for colocado nessa suíte, ou o script equivalente configurado no `package.json` do backend para testes que dependem de infraestrutura real; confirmar o nome exato do script antes de rodar, lendo `apps/backend/package.json`).
  4. Esperado: PASS — cada instância simulada (subscriber A e B) recebe a mesma mensagem via sua própria fila exclusiva, confirmando fan-out real (FR-002), coexistência de múltiplas filas exclusivas simultâneas sem colisão (FR-003 implícito) e ausência de perda de mensagem entre publish e consumo (FR-004/FR-007 no caminho feliz).
  5. Commit: `git add apps/backend/src/notification/infra/queue/notification-broadcast.e2e-test.ts && git commit -m "test(notification): integração real de fanout multi-instância via RabbitMQ"`.
- **Critérios de sucesso:** teste passa contra RabbitMQ real, comprovando que duas filas exclusivas independentes recebem o mesmo payload publicado uma única vez na exchange fanout.
