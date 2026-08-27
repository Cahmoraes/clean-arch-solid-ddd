# Task 2: Publicar e gerar o contrato HTTP paginado [FR-001, FR-003, FR-007]

**Status:** PENDING
**PRD:** `../prd/prd-paginacao-historico-atividade-perfil.md`
**Spec:** `../specs/paginacao-historico-atividade-perfil-design.md`
**Tier:** standard
**Depends on:** task-01

## Visão Geral

Atualizar somente o endpoint autenticado `/users/me/activity` para receber `page`, publicar a resposta paginada no OpenAPI e regenerar os tipos compartilhados. O endpoint administrativo `/users/:userId/activity` não deve ter alteração funcional.

## Arquivos

- Modify: `apps/backend/src/user/infra/controller/get-my-activity.controller.ts`
- Test: `apps/backend/src/user/infra/controller/get-my-activity.business-flow-test.ts`
- Modify: `apps/backend/docs/openapi-spec.json` (gerado por comando, não editar manualmente)
- Regenerate: `packages/api-types/index.d.ts` (artefato ignorado, não editar manualmente)

### Conformidade com as Skills Padrão

- `zod`: declarar `page` coercível, inteiro, mínimo 1 e default 1, além do schema de resposta paginada usado pelo OpenAPI.
- `typescript-advanced`: manter o controller alinhado às assinaturas do caso de uso e garantir que a resposta gerada seja consumível via `paths`.
- `test-antipatterns`: validar o contrato HTTP real com o servidor e MSW/fixtures existentes, sem testar apenas o schema isoladamente.

## Passos

- **Step 1: Write the failing test**

Adaptar o business-flow do endpoint próprio para solicitar uma página e verificar os metadados:

```ts
const response = await app.inject({
	method: "GET",
	url: "/users/me/activity?page=2",
	headers: authenticatedHeaders,
})

expect(response.statusCode).toBe(200)
expect(response.json()).toMatchObject({
	events: expect.any(Array),
	pagination: {
		page: 2,
		pageSize: 20,
		total: expect.any(Number),
		totalPages: expect.any(Number),
	},
})
```

Adicionar casos para ausência de `page` (default 1), `page=0`/valor não inteiro (erro de validação) e garantir que a autenticação continua obrigatória.

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter backend exec vitest run --config test/vite.config.business-flow.ts src/user/infra/controller/get-my-activity.business-flow-test.ts`

Expected: FAIL because the route ignores `page` and the response contains only `events`.

- **Step 3: Write minimal implementation**

No controller `apps/backend/src/user/infra/controller/get-my-activity.controller.ts`, declarar os schemas com a API Zod existente:

```ts
const getMyActivityRequestSchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
})

const paginationSchema = z.object({
	page: z.number().int(),
	pageSize: z.number().int(),
	total: z.number().int(),
	totalPages: z.number().int(),
})

const getMyActivityResponseSchema = z.object({
	events: z.array(activityEventResponseSchema),
	pagination: paginationSchema,
})
```

Passar `querystring: getMyActivityRequestSchema` e o response 200 ao `OpenApiSchemaBuilder`, validar `req.query` com o helper de parsing já usado pelo bounded context e chamar `execute({ userId: req.user.sub.id, page: parsed.page })`. Confirmar no `user-module.ts` que o binding existente continua apontando para `GetMyActivityController`, sem criar registro novo. Não alterar funcionalmente `get-user-activity.controller.ts`. Depois executar `pnpm generate:types`; confirmar no OpenAPI exportado que `/users/me/activity` possui `page` e `pagination`, e que `packages/api-types/index.d.ts` passou a expor esses campos. Nunca editar o arquivo gerado manualmente.

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter backend exec vitest run --config test/vite.config.business-flow.ts src/user/infra/controller/get-my-activity.business-flow-test.ts`

Expected: PASS for default page, valid page, invalid page, authentication and paginated response scenarios.

- **Step 5: Commit** *(sequential execution only)*

```bash
git add apps/backend/src/user/infra/controller/get-my-activity.controller.ts apps/backend/src/user/infra/controller/get-my-activity.business-flow-test.ts apps/backend/docs/openapi-spec.json
git commit -m "Publicar contrato paginado do historico"
```

## Critérios de Sucesso

- FR-001, FR-003 e FR-007 estão cobertos pelo business-flow do endpoint autenticado.
- O OpenAPI exportado descreve `page` com default 1 e a resposta com `events`/`pagination`.
- `pnpm generate:types` gera tipos para query e metadados sem edição manual de `index.d.ts`.
- O endpoint administrativo continua sem alteração funcional.
