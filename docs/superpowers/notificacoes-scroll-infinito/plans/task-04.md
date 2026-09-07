# Task 4: Frontend — reconciliar notificações recebidas via SSE no cache paginado [FR-006, FR-007]

**Status:** DONE
**PRD:** ../prd/prd-notificacoes-scroll-infinito.md
**Spec:** ../specs/notificacoes-scroll-infinito-design.md
**Tier:** standard
**Depends on:** task-03

## Visão Geral

Nota de escopo: o índice de tarefas (`tasks-notificacoes-scroll-infinito.md`) associa esta task ao arquivo `use-notification-stream.ts`, mas o código real que reage a mensagens SSE de notificação é `handleNotificationStreamMessage`, dentro de `apps/frontend/src/lib/notifications/use-notifications.ts` — é essa função que hoje chama `queryClient.invalidateQueries` ao receber `{ type: "notification" }` (ver `useNotificationStream({ enabled, onMessage: handleNotificationStreamMessage })` na task-02). `use-notification-stream.ts` (o hook `useNotificationStream`) apenas conecta ao SSE e repassa mensagens já parseadas via `onMessage`; ele não precisa mudar. Esta task altera `use-notifications.ts`, mantendo o `SseMessage`/`NotificationStreamPayload` de `use-notification-stream.ts` como estão. Por editar o mesmo arquivo que a task-03 (retry), a dependência foi ajustada de task-02 para task-03 — evita conflito de escrita em execução paralela; ver `## Ondas de Execução` no índice.

Hoje, ao receber uma mensagem `{ type: "notification" }`, `handleNotificationStreamMessage` invalida (`invalidateQueries`) tanto a lista quanto o contador de não lidas — o que, com `useInfiniteQuery` (task-02), re-buscaria a partir da primeira página e descartaria os lotes já carregados via scroll, violando FR-007. Esta task substitui essa invalidação por uma reconciliação local: a notificação do payload SSE é inserida no início de `data.pages[0].notifications` via `queryClient.setQueryData` (guardada por checagem de id duplicado), preservando as demais páginas intactas; o contador de não lidas continua sendo invalidado (não afetado pelo FR-007, que fala apenas dos lotes de notificações).

Importante: a inserção NÃO incrementa `firstPage.total` nem afeta `fetchedCount` de nenhuma página. `getNextPageParam` (task-02) soma `fetchedCount` — não `notifications.length` — para calcular o próximo `offset`; se o item inserido via SSE fosse contado nesse cálculo, o próximo `fetchNextPage` pularia ou repetiria um item real do backend. `fetchedCount` reflete apenas o que já foi buscado da API, e o próximo fetch naturalmente inclui o total atualizado assim que o backend responder de novo.

## Arquivos

- Modify: `apps/frontend/src/lib/notifications/use-notifications.ts`
- Test: `apps/frontend/src/lib/notifications/use-notifications.test.tsx`

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: atualização imutável de `InfiniteData<NotificationsPage>` via `setQueryData` com updater funcional, preservando páginas não afetadas — sem `invalidateQueries` na lista paginada.
- `typescript-advanced`: converter `NotificationStreamPayload` (de `use-notification-stream.ts`, com `type: string`) para o formato de `NotificationItem` (com `type` restrito ao union `NotificationsResponse["notifications"][number]["type"]`) sem perder segurança de tipos.
- `test-antipatterns`: os testes devem observar `result.current.notifications`/contagem de chamadas a `mockGet`, nunca inspecionar o cache interno do `QueryClient` diretamente.

## Passos

- **Step 1: Write the failing test**

Adicionar ao arquivo `apps/frontend/src/lib/notifications/use-notifications.test.tsx` (usa o mesmo `streamOptions` já capturado no teste pré-existente "invalida as queries ao receber evento notification via SSE" — esse teste pré-existente deve ser atualizado/substituído pelos dois abaixo, já que a invalidação da lista deixa de ocorrer):

```tsx
describe("reconciliação de notificações via SSE", () => {
	test("notificação recebida via SSE é adicionada ao topo sem re-buscar a lista [FR-006, FR-007]", async () => {
		mockNotificationsRequests(25)
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		const listCallsBefore = mockGet.mock.calls.filter(
			(call) => call[0] === "/api/v1/notifications",
		).length
		const streamOptions = vi.mocked(useNotificationStream).mock.calls[0]?.[0]
		await act(async () => {
			streamOptions?.onMessage({
				type: "notification",
				payload: {
					notificationId: "notification-streamed-1",
					userId: "user-1",
					type: "PROMOTION",
					title: "Nova promoção",
					message: "Você recebeu uma nova promoção.",
				},
			})
		})
		expect(result.current.notifications[0]?.id).toBe("notification-streamed-1")
		const listCallsAfter = mockGet.mock.calls.filter(
			(call) => call[0] === "/api/v1/notifications",
		).length
		expect(listCallsAfter).toBe(listCallsBefore)
	})

	test("chegada de notificação via SSE não descarta lotes já carregados via scroll [FR-007]", async () => {
		mockNotificationsRequests(25)
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		await act(async () => {
			result.current.fetchNextPage()
		})
		await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false))
		expect(result.current.notifications).toHaveLength(15)
		const secondPageIds = result.current.notifications.slice(10).map((n) => n.id)
		const streamOptions = vi.mocked(useNotificationStream).mock.calls[0]?.[0]
		await act(async () => {
			streamOptions?.onMessage({
				type: "notification",
				payload: {
					notificationId: "notification-streamed-2",
					userId: "user-1",
					type: "SECURITY_ALERT",
					title: "Alerta",
					message: "Novo alerta de segurança.",
				},
			})
		})
		expect(result.current.notifications).toHaveLength(16)
		expect(result.current.notifications.slice(11)).toEqual(
			secondPageIds.map((id) =>
				expect.objectContaining({ id }),
			),
		)
	})

	test("notificação SSE chegando com fetchNextPage em andamento não duplica nem corrompe a próxima página", async () => {
		mockNotificationsRequests(25)
		const { wrapper } = createWrapper()
		const { result } = renderHook(() => useNotifications(), { wrapper })
		await waitFor(() => expect(result.current.isLoading).toBe(false))
		const streamOptions = vi.mocked(useNotificationStream).mock.calls[0]?.[0]
		await act(async () => {
			result.current.fetchNextPage()
			streamOptions?.onMessage({
				type: "notification",
				payload: {
					notificationId: "notification-streamed-race",
					userId: "user-1",
					type: "PROMOTION",
					title: "Nova promoção",
					message: "Você recebeu uma nova promoção.",
				},
			})
		})
		await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false))
		expect(result.current.notifications[0]?.id).toBe("notification-streamed-race")
		// 10 (carga inicial) + 1 (SSE) + 5 (próxima página) = 16, sem duplicar nem pular
		// nenhum item real do backend — fetchNextPage usou offset=10, não offset=11.
		expect(result.current.notifications).toHaveLength(16)
		expect(mockGet).toHaveBeenCalledWith("/api/v1/notifications", {
			params: {
				query: {
					page: 1,
					unreadOnly: false,
					offset: 10,
					limit: 5,
				},
			},
		})
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `(cd apps/frontend && npx vitest run src/lib/notifications/use-notifications.test.tsx)`
Expected: FAIL — `handleNotificationStreamMessage` ainda chama `invalidateNotifications()`, que re-busca a partir de `offset:0, limit:10` e descarta a segunda página; `result.current.notifications[0]?.id` não é `"notification-streamed-1"` (a notificação streamada não existe na resposta mockada), a contagem de chamadas à lista aumenta, e o teste de corrida falha porque a notificação streamada nunca aparece no topo.

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/lib/notifications/use-notifications.ts`, adicionar a função de reconciliação e trocar o corpo de `handleNotificationStreamMessage`:

```ts
function reconcileStreamedNotification(
	queryClient: QueryClient,
	payload: NotificationStreamPayload,
): void {
	queryClient.setQueryData<InfiniteData<NotificationsPage>>(
		notificationsInfiniteListQueryKey,
		(previous) => {
			if (!previous) return previous
			const alreadyExists = previous.pages.some((page) =>
				page.notifications.some(
					(notification) => notification.id === payload.notificationId,
				),
			)
			if (alreadyExists) return previous
			const [firstPage, ...restPages] = previous.pages
			if (!firstPage) return previous
			const newNotification: NotificationItem = {
				id: payload.notificationId,
				type: payload.type as NotificationItem["type"],
				title: payload.title,
				message: payload.message,
				gymName: null,
				reason: null,
				readAt: null,
				createdAt: new Date().toISOString(),
			}
			return {
				...previous,
				pages: [
					{
						...firstPage,
						notifications: [newNotification, ...firstPage.notifications],
					},
					...restPages,
				],
			}
		},
	)
}

function handleNotificationStreamMessage(message: SseMessage): void {
	if (message.type !== "notification" || !message.payload) return
	reconcileStreamedNotification(queryClient, message.payload)
	void queryClient.invalidateQueries({
		queryKey: notificationsUnreadCountQueryKey,
	})
}
```

`handleNotificationStreamMessage` é declarada dentro de `useNotifications()` (mesmo escopo de `queryClient`), como já ocorre hoje — apenas o corpo muda. Adicionar `import type { NotificationStreamPayload } from "./use-notification-stream"` ao topo do arquivo (já importa `SseMessage`/`useNotificationStream` do mesmo módulo).

- **Step 4: Run test to verify it passes**

Run: `(cd apps/frontend && npx vitest run src/lib/notifications/use-notifications.test.tsx)`
Expected: PASS — todos os testes do arquivo, incluindo os 3 novos, passam.

- **Step 5: Commit** *(sequential execution only — em wave paralela, pule e reporte os arquivos)*

```bash
git add apps/frontend/src/lib/notifications/use-notifications.ts \
  apps/frontend/src/lib/notifications/use-notifications.test.tsx
git commit -m "feat(notifications): reconciliar notificações SSE no cache paginado"
```

## Critérios de Sucesso

- Uma notificação recebida via SSE enquanto o dropdown está aberto aparece imediatamente no topo da lista, sem exigir reabertura do dropdown (FR-006).
- A chegada de uma notificação via SSE não re-busca nem descarta os lotes de notificações já carregados pelo scroll (FR-007).
- Uma notificação SSE chegando enquanto um `fetchNextPage` está em andamento não duplica nem faz o próximo lote pular um item real do backend (o cálculo de `offset` usa `fetchedCount`, não `notifications.length`).
