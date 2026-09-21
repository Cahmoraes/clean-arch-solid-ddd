# Task 6: Fluxo de negócio do broadcast por público e acesso restrito [FR-007, FR-008, FR-009, FR-010, FR-012, FR-017]

**Status:** PENDING
**PRD:** `../prd/prd-notice-audience.md`
**Spec:** `../specs/notice-audience-design.md`
**Tier:** standard
**Depends on:** task-05

## Visão Geral

Prova por HTTP, com o container real (Fastify, use case, controller) e repositório e provider in-memory, que cada público entrega só ao papel certo: com um administrador e dois alunos ativos, `MEMBERS` chega só aos alunos (o administrador remetente NÃO recebe, FR-012 novo), `ADMINS` só ao administrador e `ALL` a todos. As restrições de acesso continuam valendo com o campo `audience` (401 sem token, 403 para `MEMBER`, FR-017). O único código de suporte é semear `activeRecipients.adminIds = [adminId]` nos dois `beforeEach`, pois o provider in-memory decide administrador por `adminIds` (task-02). Não há código de produção nesta task.

## Arquivos

- Modify: `apps/backend/src/notification/infra/controller/broadcast-notice.controller.business-flow-test.ts`
- Modify: `apps/backend/src/notification/infra/controller/broadcast-notice.authorization.business-flow-test.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: os testes usam o fluxo completo autenticado (login real via `AuthenticateUseCase`); nenhum bypass de autenticação e nenhum mock do provider ou do use case.
- `test-antipatterns`: os usuários de cada papel são criados explicitamente (risco "seed com poucos admins mascara erro de filtro" do spec); as asserções olham o efeito observável (repositório de notificações e `GET /api/v1/notifications` de cada usuário), não chamadas internas.

## Passos

- **Step 1: Write the failing test (controller business-flow)**

Em `apps/backend/src/notification/infra/controller/broadcast-notice.controller.business-flow-test.ts`, adicionar os helpers logo depois da função `broadcast` existente:

```ts
	async function addSecondMember(): Promise<string> {
		const secondMemberId = randomUUID()
		await createAndSaveUser({
			userRepository,
			id: secondMemberId,
			email: "member2.notice@test.com",
			password: "any_password",
			role: "MEMBER",
		})
		activeRecipients.userIds = [adminId, memberId, secondMemberId]
		return secondMemberId
	}

	function receivers(): string[] {
		return notificationRepository.notifications
			.toArray()
			.map((notification) => notification.userId)
			.sort()
	}

	async function listAs(token: string) {
		return request(fastifyServer.server)
			.get(NotificationRoutes.LIST)
			.set("Authorization", `Bearer ${token}`)
	}
```

Adicionar ao final do `describe(...)` (antes do `})` de fechamento):

```ts
	test("FR-007 e FR-012: MEMBERS entrega so aos alunos e o administrador remetente nao recebe", async () => {
		const secondMemberId = await addSecondMember()

		const response = await broadcast({
			title: "Aviso",
			message: "Mensagem",
			audience: "MEMBERS",
		})

		expect(response.status).toBe(HTTP_STATUS.CREATED)
		expect(response.body).toEqual({ recipients: 2 })
		expect(receivers()).toEqual([memberId, secondMemberId].sort())
		expect((await listAs(adminToken)).body.total).toBe(0)
		expect((await listAs(memberToken)).body.total).toBe(1)
	})

	test("FR-008 e FR-010: ADMINS entrega so ao administrador e os alunos nao recebem", async () => {
		await addSecondMember()

		const response = await broadcast({
			title: "Aviso",
			message: "Mensagem",
			audience: "ADMINS",
		})

		expect(response.status).toBe(HTTP_STATUS.CREATED)
		expect(response.body).toEqual({ recipients: 1 })
		expect(receivers()).toEqual([adminId])
		expect((await listAs(adminToken)).body.total).toBe(1)
		expect((await listAs(memberToken)).body.total).toBe(0)
	})

	test("FR-009: ALL entrega ao administrador e a todos os alunos", async () => {
		const secondMemberId = await addSecondMember()

		const response = await broadcast({
			title: "Aviso",
			message: "Mensagem",
			audience: "ALL",
		})

		expect(response.status).toBe(HTTP_STATUS.CREATED)
		expect(response.body).toEqual({ recipients: 3 })
		expect(receivers()).toEqual([adminId, memberId, secondMemberId].sort())
	})

	test("sem audience o envio alcanca administrador e alunos, como antes", async () => {
		await addSecondMember()

		const response = await broadcast({ title: "Aviso", message: "Mensagem" })

		expect(response.body).toEqual({ recipients: 3 })
	})
```

- **Step 2: Run test to verify it fails**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/notification/infra/controller/broadcast-notice.controller.business-flow-test.ts`
Expected: FAIL. O `beforeEach` ainda não semeia `adminIds`, então o provider in-memory trata todos como alunos: `MEMBERS` responde `recipients: 3` (esperado 2, o administrador conta como aluno) e `ADMINS` responde `recipients: 0` (esperado 1, ninguém é administrador), isto é, `expected { recipients: 0 } to deeply equal { recipients: 1 }`. Passam `ALL`, `sem audience` e os 24 testes anteriores.

- **Step 3: Write minimal implementation**

No `beforeEach` do mesmo arquivo, logo depois de `activeRecipients.userIds = [adminId, memberId]`, acrescentar:

```ts
		activeRecipients.adminIds = [adminId]
```

- **Step 4: Run test to verify it passes**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/notification/infra/controller/broadcast-notice.controller.business-flow-test.ts`
Expected: PASS (24 testes anteriores + 4 novos = 28).

- **Step 5: Write the failing test (autorização)**

Em `apps/backend/src/notification/infra/controller/broadcast-notice.authorization.business-flow-test.ts`, tornar o provider e o id do administrador acessíveis aos testes: declarar junto das demais variáveis do `describe`

```ts
	let activeRecipients: InMemoryActiveRecipientsProvider
```

e, no `beforeEach`, trocar `const activeRecipients = new InMemoryActiveRecipientsProvider()` por

```ts
		activeRecipients = new InMemoryActiveRecipientsProvider()
```

Adicionar ao final do `describe(...)` (antes do `})` de fechamento):

```ts
	test("FR-017: 401 sem token mesmo com audience valido e nenhuma notificacao criada", async () => {
		const response = await request(fastifyServer.server)
			.post(NotificationRoutes.BROADCAST)
			.send({ ...VALID_NOTICE, audience: "MEMBERS" })

		expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
		expect(notificationRepository.notifications.size).toBe(0)
	})

	test("FR-017: 403 para MEMBER mesmo com audience ADMINS e nenhuma notificacao criada", async () => {
		const response = await request(fastifyServer.server)
			.post(NotificationRoutes.BROADCAST)
			.set("Authorization", `Bearer ${memberToken}`)
			.send({ ...VALID_NOTICE, audience: "ADMINS" })

		expect(response.status).toBe(HTTP_STATUS.FORBIDDEN)
		expect(notificationRepository.notifications.size).toBe(0)
	})

	test("201 para ADMIN com audience MEMBERS entrega so ao aluno", async () => {
		const response = await request(fastifyServer.server)
			.post(NotificationRoutes.BROADCAST)
			.set("Authorization", `Bearer ${adminToken}`)
			.send({ ...VALID_NOTICE, audience: "MEMBERS" })

		expect(response.status).toBe(HTTP_STATUS.CREATED)
		expect(response.body).toEqual({ recipients: 1 })
		expect(notificationRepository.notifications.size).toBe(1)
	})
```

- **Step 6: Run test to verify it fails**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/notification/infra/controller/broadcast-notice.authorization.business-flow-test.ts`
Expected: FAIL apenas em `201 para ADMIN com audience MEMBERS entrega so ao aluno` (`expected { recipients: 2 } to deeply equal { recipients: 1 }`, pois `adminIds` ainda não é semeado neste arquivo). Os testes de 401 e 403 e os 4 anteriores passam.

- **Step 7: Write minimal implementation**

No `beforeEach` do arquivo de autorização, logo depois de `activeRecipients.userIds = [adminId, memberId]`, acrescentar:

```ts
		activeRecipients.adminIds = [adminId]
```

- **Step 8: Run test to verify it passes**

Run: `cd apps/backend && npx vitest run --config ./test/vite.config.business-flow.ts src/notification/infra/controller/broadcast-notice.authorization.business-flow-test.ts`
Expected: PASS (4 testes anteriores + 3 novos = 7).

- **Step 9: Commit** *(execução sequencial apenas; em onda paralela o orquestrador commita na barreira de integração. Se o seu prompt diz que você é um de vários implementadores em uma árvore compartilhada, pule este passo e reporte os arquivos.)*

```bash
git add apps/backend/src/notification/infra/controller/broadcast-notice.controller.business-flow-test.ts apps/backend/src/notification/infra/controller/broadcast-notice.authorization.business-flow-test.ts
git commit -m "test(notice-audience): prova entrega por publico e acesso restrito no business-flow"
```

## Critérios de Sucesso

- Com um administrador e dois alunos ativos: `MEMBERS` responde `{ recipients: 2 }` e o administrador remetente não tem a notificação (FR-007, FR-012); `ADMINS` responde `{ recipients: 1 }` e nenhum aluno a recebe (FR-008, FR-010); `ALL` responde `{ recipients: 3 }` (FR-009).
- Sem token o envio responde 401 e, para `MEMBER`, 403, sempre sem criar notificação, também com `audience` no body (FR-017).
