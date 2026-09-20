# Task 1: Parametrizar o endpoint de atividade do próprio usuário [FR-002, FR-008, FR-009, FR-010, FR-011]

**Status:** DONE
**PRD:** `../prd/prd-user-activity-pagination-capability.md`
**Spec:** `../specs/user-activity-pagination-capability-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Adicionar `pageSize` ao contrato backend de `GET /users/me/activity`, mantendo `20` como default, aceitando somente `10`, `20` e `50`, rejeitando valores inválidos com `400` e preservando `GET /users/:userId/activity` fixo em `20`. O DAO não deve mudar porque já recebe `pageSize`.

## Arquivos

- Create: N/A
- Modify: `apps/backend/src/user/application/use-case/get-user-activity.usecase.ts`
- Modify: `apps/backend/src/user/infra/controller/get-my-activity.controller.ts`
- Modify: `apps/backend/docs/openapi-spec.json`
- Modify: `packages/api-types/index.d.ts`
- Test: `apps/backend/src/user/application/use-case/get-user-activity.usecase.test.ts`
- Test: `apps/backend/src/user/infra/controller/get-my-activity.business-flow-test.ts`
- Test: `apps/backend/src/user/infra/controller/get-user-activity.business-flow-test.ts`

### Conformidade com as Skills Padrão

- `zod`: validar `pageSize` no schema do controller com lista fechada e erro HTTP explícito.
- `test-antipatterns`: cobrir comportamento real do use case e dos endpoints sem assertar implementação de mocks.
- `typescript-advanced`: manter o input do use case, os literais permitidos e os tipos gerados sincronizados sem casts.
- `no-workarounds`: rejeitar valores inválidos na fronteira HTTP, sem fallback silencioso para sucesso.

## Passos

- **Step 1: Write the failing test**

Em `apps/backend/src/user/application/use-case/get-user-activity.usecase.test.ts`, adicione dentro de `describe("GetUserActivityUseCase", ...)`:

```typescript
test("deve aplicar pageSize informado para a atividade do próprio usuário", async () => {
	const user = (
		await User.create({
			id: "user-1",
			name: "John Doe",
			email: "john@doe.com",
			password: "any_password",
		})
	).forceSuccess().value
	await userRepository.save(user)
	const items = Array.from({ length: 25 }, (_, index) => ({
		id: `activity-${index}`,
		type: "LOGIN" as const,
		description: "Login realizado",
		occurredAt: new Date(
			`2025-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
		),
	}))
	const sut = new GetUserActivityUseCase(
		userRepository,
		new FakeUserActivityDao(items),
	)

	const result = await sut.execute({ userId: "user-1", page: 2, pageSize: 10 })

	expect(result.isSuccess()).toBe(true)
	expect(result.forceSuccess().value.pagination).toEqual({
		page: 2,
		pageSize: 10,
		total: 25,
		totalPages: 3,
	})
	expect(result.forceSuccess().value.events).toHaveLength(10)
	expect(result.forceSuccess().value.events[0].id).toBe("activity-10")
})
```

Em `apps/backend/src/user/infra/controller/get-my-activity.business-flow-test.ts`, adicione dentro de `describe("Buscar Meu Histórico de Atividade", ...)`:

```typescript
test.each(["10", "20", "50"])(
	"deve aceitar pageSize %s no histórico do próprio usuário",
	async (pageSize) => {
		const activities = Array.from({ length: 55 }, (_, index) => ({
			id: `activity-${index + 1}`,
			type: "LOGIN" as const,
			description: `Login ${index + 1}`,
			occurredAt: new Date(
				`2025-02-${String((index % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
			),
		}))
		container
			.rebind(USER_TYPES.DAO.UserActivity)
			.toConstantValue(new InMemoryUserActivityDao(activities))
		const server = await bootServerAndAuthenticateMember()

		const response = await request(server.server)
			.get(`/users/me/activity?page=1&pageSize=${pageSize}`)
			.set("Authorization", `Bearer ${memberToken}`)

		expect(response.status).toBe(HTTP_STATUS.OK)
		expect(response.body.pagination).toEqual({
			page: 1,
			pageSize: Number(pageSize),
			total: 55,
			totalPages: Math.ceil(55 / Number(pageSize)),
		})
		expect(response.body.events).toHaveLength(Number(pageSize))
	},
)

test.each(["5", "100", "abc"])(
	"deve rejeitar pageSize inválido %s",
	async (pageSize) => {
		container
			.rebind(USER_TYPES.DAO.UserActivity)
			.toConstantValue(new InMemoryUserActivityDao([]))
		const server = await bootServerAndAuthenticateMember()

		const response = await request(server.server)
			.get(`/users/me/activity?pageSize=${pageSize}`)
			.set("Authorization", `Bearer ${memberToken}`)

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
		expect(response.body).toEqual({
			message: expect.any(String),
		})
	},
)
```

Em `apps/backend/src/user/infra/controller/get-user-activity.business-flow-test.ts`, adicione dentro de `describe("Buscar Histórico de Atividade do Usuário", ...)`:

```typescript
test("deve ignorar pageSize no endpoint administrativo e manter 20 itens", async () => {
	const targetId = randomUUID()
	const activities = Array.from({ length: 30 }, (_, index) => ({
		id: `activity-${index + 1}`,
		type: "LOGIN" as const,
		description: `Login ${index + 1}`,
		occurredAt: new Date(
			`2025-03-${String((index % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
		),
	}))
	container
		.rebind(USER_TYPES.DAO.UserActivity)
		.toConstantValue(new InMemoryUserActivityDao(activities))
	const server = await bootServerAndAuthenticateAdmin()
	await createAndSaveUser({
		userRepository,
		id: targetId,
		email: "target-admin-page-size@activity.test",
	})

	const response = await request(server.server)
		.get(`/users/${targetId}/activity?page=1&pageSize=50`)
		.set("Authorization", `Bearer ${adminToken}`)

	expect(response.status).toBe(HTTP_STATUS.OK)
	expect(response.body.pagination).toEqual({
		page: 1,
		pageSize: 20,
		total: 30,
		totalPages: 2,
	})
	expect(response.body.events).toHaveLength(20)
})
```

Review Focus: a query direta sem `pageSize` continua coberta pelo teste existente `deve usar página 1 por padrão`; o novo teste administrativo garante que `pageSize` não muda o contrato de admin.

- **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter backend exec vitest run --config ./test/vite.config.app-domain.ts src/user/application/use-case/get-user-activity.usecase.test.ts -t "deve aplicar pageSize informado para a atividade do próprio usuário"
pnpm --filter backend exec vitest run --config ./test/vite.config.business-flow.ts src/user/infra/controller/get-my-activity.business-flow-test.ts -t "pageSize"
pnpm --filter backend exec vitest run --config ./test/vite.config.business-flow.ts src/user/infra/controller/get-user-activity.business-flow-test.ts -t "deve ignorar pageSize no endpoint administrativo e manter 20 itens"
```

Expected: FAIL. O primeiro comando falha porque `GetUserActivityUseCaseInput` ainda não aceita `pageSize`; o segundo falha porque `/users/me/activity?pageSize=10` ainda retorna paginação com `pageSize: 20` ou rejeita o parâmetro; o terceiro deve passar ou continuar passando após a implementação, comprovando admin inalterado.

- **Step 3: Write minimal implementation**

Em `apps/backend/src/user/application/use-case/get-user-activity.usecase.ts`, substitua a constante e o input por:

```typescript
export const USER_ACTIVITY_PAGE_SIZE = 20
export const USER_ACTIVITY_PAGE_SIZE_OPTIONS = [10, 20, 50] as const
export const USER_ACTIVITY_MAX_PAGE_SIZE = 50

export type UserActivityPageSize =
	(typeof USER_ACTIVITY_PAGE_SIZE_OPTIONS)[number]

export function isUserActivityPageSize(
	pageSize: number,
): pageSize is UserActivityPageSize {
	return USER_ACTIVITY_PAGE_SIZE_OPTIONS.some((option) => option === pageSize)
}

export interface GetUserActivityUseCaseInput {
	userId: string
	page?: number
	pageSize?: UserActivityPageSize
}
```

No método `execute`, substitua o cálculo e chamada ao DAO por:

```typescript
const page = input.page ?? 1
const pageSize = input.pageSize ?? USER_ACTIVITY_PAGE_SIZE
const activityPage = await this.userActivityDao.findActivityPage(
	input.userId,
	page,
	pageSize,
)
```

Em `apps/backend/src/user/infra/controller/get-my-activity.controller.ts`, atualize os imports do use case para incluir as novas constantes:

```typescript
import {
	type GetUserActivityUseCase,
	USER_ACTIVITY_MAX_PAGE_SIZE,
	USER_ACTIVITY_PAGE_SIZE,
	isUserActivityPageSize,
} from "@/user/application/use-case/get-user-activity.usecase"
```

Substitua `MAX_ACTIVITY_PAGE` por:

```typescript
const MAX_ACTIVITY_PAGE = Math.floor(
	Number.MAX_SAFE_INTEGER / USER_ACTIVITY_MAX_PAGE_SIZE,
)
```

Substitua `getMyActivityQuerySchema` por:

```typescript
const getMyActivityQuerySchema = z.object({
	page: z.coerce.number().int().min(1).max(MAX_ACTIVITY_PAGE).optional().meta({
		description: "Page number",
		example: 1,
		default: 1,
	}),
	pageSize: z.coerce
		.number()
		.int()
		.refine(
			(pageSize) => isUserActivityPageSize(pageSize),
			"Page size must be one of 10, 20 or 50",
		)
		.optional()
		.meta({
			description: "Events per page",
			example: USER_ACTIVITY_PAGE_SIZE,
			default: USER_ACTIVITY_PAGE_SIZE,
		}),
})
```

Na chamada do use case no controller, inclua `pageSize`:

```typescript
const result = await this.getUserActivity.execute({
	userId: req.user.sub.id,
	page: parsedQuery.value.page ?? 1,
	pageSize: parsedQuery.value.pageSize,
})
```

Depois de alterar os arquivos TypeScript, regenere o contrato para atualizar `apps/backend/docs/openapi-spec.json` e `packages/api-types/index.d.ts`:

```bash
pnpm generate:types
```

- **Step 4: Run test to verify it passes**

Run:

```bash
pnpm --filter backend exec vitest run --config ./test/vite.config.app-domain.ts src/user/application/use-case/get-user-activity.usecase.test.ts -t "deve aplicar pageSize informado para a atividade do próprio usuário"
pnpm --filter backend exec vitest run --config ./test/vite.config.business-flow.ts src/user/infra/controller/get-my-activity.business-flow-test.ts -t "pageSize"
pnpm --filter backend exec vitest run --config ./test/vite.config.business-flow.ts src/user/infra/controller/get-user-activity.business-flow-test.ts -t "deve ignorar pageSize no endpoint administrativo e manter 20 itens"
```

Expected: PASS. `/users/me/activity` aceita `10`, `20` e `50`, rejeita inválidos com `400`, mantém default `20` quando ausente e `/users/:userId/activity?pageSize=50` segue retornando `pagination.pageSize: 20`.

- **Step 5: Commit** *(sequential execution only — in a parallel wave the orchestrator commits at the integration barrier. If your prompt says you are one of several implementers in a shared tree, skip this step and report the files instead.)*

```bash
git add apps/backend/src/user/application/use-case/get-user-activity.usecase.ts apps/backend/src/user/application/use-case/get-user-activity.usecase.test.ts apps/backend/src/user/infra/controller/get-my-activity.controller.ts apps/backend/src/user/infra/controller/get-my-activity.business-flow-test.ts apps/backend/src/user/infra/controller/get-user-activity.business-flow-test.ts apps/backend/docs/openapi-spec.json packages/api-types/index.d.ts
git commit -m "feat: add profile activity page size contract

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- [FR-002] `GET /users/me/activity?page=1&pageSize=10|20|50` aplica o tamanho escolhido ao retorno.
- [FR-008] O backend aceita somente `10`, `20` e `50` para atividade do próprio usuário.
- [FR-009] Valores como `5`, `100` e `abc` retornam `400 Bad Request`.
- [FR-010] Ausência de `pageSize` preserva `pagination.pageSize: 20`.
- [FR-011] `GET /users/:userId/activity` permanece limitado a 20 itens mesmo quando a query traz `pageSize`.
- O OpenAPI exportado e `@repo/api-types` documentam `pageSize` somente em `/users/me/activity`.
