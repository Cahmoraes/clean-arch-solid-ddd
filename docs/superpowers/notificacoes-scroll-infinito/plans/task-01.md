# Task 1: Backend — suportar offset/limit em GET /api/v1/notifications, preservando page [FR-012, FR-013]

**Status:** PENDING
**PRD:** ../prd/prd-notificacoes-scroll-infinito.md
**Spec:** ../specs/notificacoes-scroll-infinito-design.md
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Estender `GET /api/v1/notifications` para aceitar `offset`/`limit` opcionais, retrocompatíveis com o parâmetro `page` já existente. Quando ambos `offset` e `limit` forem informados, a paginação passa a ser calculada a partir deles (`skip = offset`, `take = limit`), permitindo que o frontend faça a carga inicial com 10 itens e os lotes seguintes com 5. Quando ausentes, o comportamento atual baseado em `page`/`ITEMS_PER_PAGE` permanece exatamente igual (regressão coberta por teste). A mudança percorre schema de query (Zod), controller, use case, interface de repositório e as duas implementações de repositório (`Prisma` e `InMemory`). Ao final, `pnpm generate:types` (raiz do monorepo) regenera `@repo/api-types` com os novos parâmetros de query opcionais.

## Arquivos

- Modify: `apps/backend/src/notification/infra/controller/get-notifications.controller.ts`
- Modify: `apps/backend/src/notification/application/use-case/get-notifications.usecase.ts`
- Modify: `apps/backend/src/notification/application/repository/notification.repository.ts`
- Modify: `apps/backend/src/notification/infra/repository/prisma/prisma-notification.repository.ts`
- Modify: `apps/backend/src/notification/infra/repository/in-memory/in-memory-notification.repository.ts`
- Test: `apps/backend/src/notification/application/use-case/get-notifications.usecase.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: os novos campos `offset`/`limit` são opcionais e precisam ser propagados corretamente por `GetNotificationsInput`, `FindManyNotificationsInput` e pelo schema Zod sem perder inferência de tipos entre as camadas.
- `test-antipatterns`: os dois testes novos (comportamento com offset/limit vs. regressão de page) devem validar comportamento observável via `InMemoryNotificationRepository`, sem mockar internamente a lógica de paginação que está sendo testada.

## Passos

- **Step 1: Write the failing test**

Adicionar dois testes ao arquivo existente `apps/backend/src/notification/application/use-case/get-notifications.usecase.test.ts` (mantendo os testes já existentes no arquivo):

```ts
test("should use offset/limit when both are provided, overriding page", async () => {
	for (let i = 0; i < 15; i++) {
		await repository.save(makeNotification("user-1"))
	}

	const result = await sut.execute({
		userId: "user-1",
		page: 1,
		offset: 10,
		limit: 5,
	})

	expect(result.isSuccess()).toBe(true)
	expect(result.value.items).toHaveLength(5)
	expect(result.value.total).toBe(15)
})

test("should preserve page-based pagination when offset/limit are absent", async () => {
	for (let i = 0; i < 25; i++) {
		await repository.save(makeNotification("user-1"))
	}

	const result = await sut.execute({ userId: "user-1", page: 2 })

	expect(result.isSuccess()).toBe(true)
	expect(result.value.items).toHaveLength(5)
	expect(result.value.total).toBe(25)
})
```

O segundo teste depende de `ITEMS_PER_PAGE=20` (valor configurado em `apps/backend/.env.test`): página 2 de 25 itens retorna os 5 itens restantes (índices 20–24).

- **Step 2: Run test to verify it fails**

Run: `(cd apps/backend && npx vitest run --config ./test/vite.config.app-domain.ts src/notification/application/use-case/get-notifications.usecase.test.ts)`
Expected: FAIL — `GetNotificationsInput`/`FindManyNotificationsInput` ainda não aceitam `offset`/`limit` (erro de tipo) e o primeiro teste novo falha porque `InMemoryNotificationRepository.findManyByUserId` ignora esses campos, retornando a paginação por `page` (15 itens paginados por `page:1` devolveria os 15 itens, não 5).

- **Step 3: Write minimal implementation**

`apps/backend/src/notification/application/repository/notification.repository.ts` — adicionar os campos opcionais à interface de input:

```ts
export interface FindManyNotificationsInput {
	userId: string
	page: number
	onlyUnread?: boolean
	offset?: number
	limit?: number
}
```

`apps/backend/src/notification/application/use-case/get-notifications.usecase.ts` — propagar os novos campos:

```ts
export interface GetNotificationsInput {
	userId: string
	page: number
	onlyUnread?: boolean
	offset?: number
	limit?: number
}

// dentro de execute():
const result = await this.notificationRepository.findManyByUserId({
	userId: input.userId,
	page: input.page,
	onlyUnread: input.onlyUnread,
	offset: input.offset,
	limit: input.limit,
})
```

`apps/backend/src/notification/infra/repository/in-memory/in-memory-notification.repository.ts` — branching de skip/take:

```ts
public async findManyByUserId(
	input: FindManyNotificationsInput,
): Promise<FindManyNotificationsOutput> {
	let filtered = this.notifications
		.toArray()
		.filter((n) => n.userId === input.userId && !n.isDeleted)

	if (input.onlyUnread) {
		filtered = filtered.filter((n) => !n.isRead)
	}

	const total = filtered.length
	const { skip, take } = this.resolvePagination(input)
	const items = filtered.slice(skip, skip + take)
	return { items, total }
}

private resolvePagination(
	input: FindManyNotificationsInput,
): { skip: number; take: number } {
	if (input.offset !== undefined && input.limit !== undefined) {
		return { skip: input.offset, take: input.limit }
	}
	return {
		skip: (input.page - 1) * env.ITEMS_PER_PAGE,
		take: env.ITEMS_PER_PAGE,
	}
}
```

`apps/backend/src/notification/infra/repository/prisma/prisma-notification.repository.ts` — mesmo branching aplicado ao `findMany` do Prisma:

```ts
public async findManyByUserId(
	input: FindManyNotificationsInput,
): Promise<FindManyNotificationsOutput> {
	const where = this.buildWhere(input)
	const { skip, take } = this.resolvePagination(input)

	const [rows, total] = await Promise.all([
		this.prismaClient.notification.findMany({
			where,
			include: {
				userNotifications: {
					where: { userId: input.userId },
					take: 1,
				},
			},
			skip,
			take,
			orderBy: { createdAt: "desc" },
		}),
		this.prismaClient.notification.count({ where }),
	])

	return {
		items: rows.map((row) => this.toDomain(row)),
		total,
	}
}

private resolvePagination(
	input: FindManyNotificationsInput,
): { skip: number; take: number } {
	if (input.offset !== undefined && input.limit !== undefined) {
		return { skip: input.offset, take: input.limit }
	}
	return {
		skip: (input.page - 1) * env.ITEMS_PER_PAGE,
		take: env.ITEMS_PER_PAGE,
	}
}
```

`apps/backend/src/notification/infra/controller/get-notifications.controller.ts` — adicionar `offset`/`limit` ao schema Zod e repassar ao use case:

```ts
const getNotificationsQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1).meta({
		description: "Page number",
		example: 1,
	}),
	unreadOnly: z.union([z.boolean(), z.stringbool()]).default(false).meta({
		description: "Filter only unread notifications",
		example: false,
	}),
	offset: z.coerce.number().int().min(0).optional().meta({
		description:
			"Number of items to skip. When combined with limit, overrides page-based pagination",
		example: 0,
	}),
	limit: z.coerce.number().int().min(1).max(50).optional().meta({
		description:
			"Number of items to return (max 50). When combined with offset, overrides ITEMS_PER_PAGE",
		example: 10,
	}),
})

// dentro de callback():
const result = await this.getNotifications.execute({
	userId: req.user.sub.id,
	page: parsedQuery.value.page,
	onlyUnread: parsedQuery.value.unreadOnly,
	offset: parsedQuery.value.offset,
	limit: parsedQuery.value.limit,
})
```

- **Step 4: Run test to verify it passes**

Run: `(cd apps/backend && npx vitest run --config ./test/vite.config.app-domain.ts src/notification/application/use-case/get-notifications.usecase.test.ts)`
Expected: PASS — os 5 testes do arquivo (3 pré-existentes + 2 novos) passam.

- **Step 5: Regenerate `@repo/api-types`**

Run: `pnpm generate:types`

Executado a partir da raiz do monorepo (após os testes do backend passarem), exporta o OpenAPI spec do backend — agora incluindo `offset`/`limit` opcionais em `querystring` de `GET /api/v1/notifications` via `makeGetNotificationsSwaggerSchema()` — e regenera `packages/api-types/index.d.ts`. Não editar `index.d.ts` manualmente.

- **Step 6: Commit** *(sequential execution only — em wave paralela, o orquestrador comita na barreira de integração; se seu prompt indicar que você é um dos vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos)*

```bash
git add apps/backend/src/notification/infra/controller/get-notifications.controller.ts \
  apps/backend/src/notification/application/use-case/get-notifications.usecase.ts \
  apps/backend/src/notification/application/repository/notification.repository.ts \
  apps/backend/src/notification/infra/repository/prisma/prisma-notification.repository.ts \
  apps/backend/src/notification/infra/repository/in-memory/in-memory-notification.repository.ts \
  apps/backend/src/notification/application/use-case/get-notifications.usecase.test.ts \
  packages/api-types/index.d.ts
git commit -m "feat(notification): suportar offset/limit em GET /api/v1/notifications"
```

## Critérios de Sucesso

- `GET /api/v1/notifications?offset=10&limit=5` retorna `skip=10, take=5`, ignorando `page` quando ambos os parâmetros estão presentes (FR-012).
- `GET /api/v1/notifications?page=2` (sem `offset`/`limit`) continua retornando exatamente o mesmo resultado de antes da mudança — `skip=(page-1)*ITEMS_PER_PAGE, take=ITEMS_PER_PAGE` (FR-013).
- `@repo/api-types` regenerado expõe `offset`/`limit` como parâmetros de query opcionais em `paths["/api/v1/notifications"]["get"]`.
- `GET /api/v1/notifications?offset=0&limit=51` retorna 400 (validação Zod) — `limit` tem teto de 50.
