# Task 5: Controller aceita audience opcional com padrão ALL e recusa valor inválido [FR-015, FR-016]

**Status:** PENDING
**PRD:** `../prd/prd-notice-audience.md`
**Spec:** `../specs/notice-audience-design.md`
**Tier:** standard
**Depends on:** task-04

## Visão Geral

O body do `POST /api/v1/notifications/broadcast` ganha `audience: z.enum(["ALL", "MEMBERS", "ADMINS"]).default("ALL").meta({ description, example })`. Ausente vira `ALL` (FR-015, compatibilidade com o cliente atual); qualquer outro valor responde 400 sem criar nenhuma notificação (FR-016). O schema é declarado uma vez em `broadcast-notice.controller.ts` e alimenta tanto o `parseRequest` quanto o OpenAPI (`OpenApiSchemaBuilder.build({ body: broadcastNoticeBodySchema })`), então o contrato documentado muda junto. `parsedBody.value` já é entregue ao use case, que recebe `audience` desde a task-04. Pontos a fixar por teste: o `default` do Zod só age em `undefined`, então `null`, string vazia e minúsculas (`"all"`) precisam voltar 400.

## Arquivos

- Modify: `apps/backend/src/notification/infra/controller/broadcast-notice.controller.ts`
- Test: `apps/backend/src/notification/infra/controller/broadcast-notice.controller.business-flow-test.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: a recusa de valor inválido vem do schema Zod do body, sem `try/catch` no handler nem checagem manual duplicada de `audience`; `null` e `""` são rejeitados pelo enum, não por um remendo à parte.
- `test-antipatterns`: business-flow real (Fastify + container com repositórios in-memory), asserções sobre status HTTP e sobre `notificationRepository.notifications.size`, sem mock do controller ou do use case.

## Passos

- **Step 1: Write the failing test**

Review Focus: `audience` em minúsculas, string vazia ou `null` no body responde 400 e nenhuma notificação é criada

Em `apps/backend/src/notification/infra/controller/broadcast-notice.controller.business-flow-test.ts`, adicionar ao final do `describe("POST /api/v1/notifications/broadcast", ...)` (antes do `})` de fechamento):

```ts
	test("FR-015: sem audience o envio equivale a ALL e alcanca todos os usuarios ativos", async () => {
		const response = await broadcast({
			title: "Aviso",
			message: "Mensagem",
		})

		expect(response.status).toBe(HTTP_STATUS.CREATED)
		expect(response.body).toEqual({ recipients: 2 })
		expect(notificationRepository.notifications.size).toBe(2)
	})

	test.each(["ALL", "MEMBERS", "ADMINS"])(
		"aceita audience %s e responde 201",
		async (audience) => {
			const response = await broadcast({
				title: "Aviso",
				message: "Mensagem",
				audience,
			})

			expect(response.status).toBe(HTTP_STATUS.CREATED)
		},
	)

	test("FR-016: audience desconhecido retorna 400 e nao cria notificacao", async () => {
		const response = await broadcast({
			title: "Aviso",
			message: "Mensagem",
			audience: "todos",
		})

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
		expect(notificationRepository.notifications.size).toBe(0)
	})

	test.each([
		["em minusculas", "all"],
		["string vazia", ""],
		["null", null],
		["numero", 1],
		["papel do dominio user", "ADMIN"],
	])("Review Focus: audience %s retorna 400 e nenhuma notificacao e criada", async (_, audience) => {
		const response = await broadcast({
			title: "Aviso",
			message: "Mensagem",
			audience,
		})

		expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
		expect(notificationRepository.notifications.size).toBe(0)
	})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/notification/infra/controller/broadcast-notice.controller.business-flow-test.ts`
Expected: FAIL. O schema atual usa `z.object` sem o campo `audience`, que é descartado em silêncio: o envio é aceito, então `audience desconhecido` e os 5 casos do `Review Focus` falham com `expected 201 to be 400`. Passam: `FR-015`, os 3 casos de `aceita audience %s` (o campo é ignorado) e os 14 testes anteriores.

- **Step 3: Write minimal implementation**

Em `apps/backend/src/notification/infra/controller/broadcast-notice.controller.ts`, acrescentar o campo ao `broadcastNoticeBodySchema` (os demais campos e o resto do arquivo permanecem):

```ts
const broadcastNoticeBodySchema = z.object({
	title: z.string().min(1).max(NOTICE_TITLE_MAX).meta({
		description: "Notice title (1 to 100 characters)",
		example: "Manutenção programada",
	}),
	message: z.string().min(1).max(NOTICE_MESSAGE_MAX).meta({
		description: "Notice message (1 to 500 characters)",
		example: "O sistema ficará fora do ar hoje às 22h.",
	}),
	audience: z.enum(["ALL", "MEMBERS", "ADMINS"]).default("ALL").meta({
		description:
			"Who receives the notice: ALL (active members and admins), MEMBERS (active members only) or ADMINS (active admins only). Defaults to ALL",
		example: "MEMBERS",
	}),
})
```

- **Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/notification/infra/controller/broadcast-notice.controller.business-flow-test.ts`
Expected: PASS (14 testes existentes + 1 + 3 + 1 + 5 = 24 testes).

- **Step 5: Commit** *(execução sequencial apenas; em onda paralela o orquestrador commita na barreira de integração. Se o seu prompt diz que você é um de vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/backend/src/notification/infra/controller/broadcast-notice.controller.ts apps/backend/src/notification/infra/controller/broadcast-notice.controller.business-flow-test.ts
git commit -m "feat(notice-audience): controller aceita audience com padrao ALL"
```

## Critérios de Sucesso

- Body sem `audience` produz o mesmo resultado de hoje: 201 e `{ recipients: 2 }` no cenário do teste (FR-015).
- `audience` `ALL`, `MEMBERS` e `ADMINS` são aceitos com 201.
- `audience` desconhecido, em minúsculas, `""`, `null` ou de tipo errado responde 400 e nenhuma notificação é criada (FR-016).
- O schema OpenAPI do endpoint passa a documentar `audience` (o `.meta` alimenta `OpenApiSchemaBuilder`); a regeneração dos tipos é a task-07.
