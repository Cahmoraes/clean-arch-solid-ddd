# Task 7: Aviso no sino com identificação própria [FR-006, FR-007, FR-008, FR-009]

**Status:** DONE
**Verified:** `pnpm --filter frontend exec vitest run src/components/notification/notification-item.test.tsx` → exit 0
**PRD:** `../prd/prd-admin-notice-broadcast.md`
**Spec:** `../specs/admin-notice-broadcast-design.md`
**Tier:** standard
**Depends on:** task-05

## Visão Geral

Depois que `pnpm generate:types` (task 5) inclui `"NOTICE"` no tipo `NotificationItem`, o mapa `NOTIFICATION_TYPE_STYLE` (`Record` exaustivo) deixa de compilar e o sino não sabe desenhar o aviso. Esta task adiciona a entrada `NOTICE` (ícone `Megaphone`, tom informativo `bg-primary/15 text-primary`; o token `--color-primary` existe em `apps/frontend/src/app/globals.css`), cobre o item com teste (título, mensagem, identificação visual distinta de check-in, marcar como lida) e fixa com teste que um evento SSE `NOTICE` entra na lista e invalida o contador de não lidas, ou seja, segue o comportamento das demais notificações.

## Arquivos

- Modify: `apps/frontend/src/components/notification/notification-item.tsx`
- Create: `apps/frontend/src/components/notification/notification-item.test.tsx`
- Modify: `apps/frontend/src/lib/notifications/use-notifications.test.tsx`

### Conformidade com as Skills Padrão

- `test-antipatterns`: os testes renderizam o `NotificationItem` real e assertam o que o usuário percebe (título, mensagem, marcação como lida, ícone distinto); o teste de SSE usa o hook real com o stream mockado apenas na borda, como os testes vizinhos.
- `no-workarounds`: a entrada nova vem da tipagem gerada (`NOTICE` no union), sem cast nem `as any` para calar o `Record` exaustivo.
- `vercel-react-best-practices`: componente permanece sem estado extra; a escolha de estilo é uma consulta a mapa constante fora do render.
- `shadcn`: reutiliza os tokens semânticos do tema (`bg-primary/15`, `text-primary`) em vez de cores fixas.
- `tailwindcss`: classes utilitárias existentes no tema VOLT, no mesmo formato das demais entradas do mapa.

## Passos

- **Step 1: Localizar outros mapas exaustivos sobre o tipo da notificação**

Run: `grep -rn "PROMOTION" apps/frontend/src --include=*.ts --include=*.tsx`
Expected: além de `notification-item.tsx` e de testes, nenhuma outra tabela `Record<NotificationItem["type"], ...>`. Se houver, ela também precisa da entrada `NOTICE` no passo 3.

- **Step 2: Write the failing test**

```tsx
// apps/frontend/src/components/notification/notification-item.test.tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import type { NotificationItem as NotificationItemData } from "@/lib/notifications/use-notifications"
import { NotificationItem } from "./notification-item"

function makeNotification(
	overrides: Partial<NotificationItemData> = {},
): NotificationItemData {
	return {
		id: "notice-1",
		type: "NOTICE",
		title: "Manutenção programada",
		message: "O sistema ficará fora do ar hoje às 22h.",
		gymName: null,
		reason: null,
		readAt: null,
		createdAt: new Date().toISOString(),
		...overrides,
	}
}

function renderItem(
	notification: NotificationItemData,
	onMarkAsRead: (id: string) => void = vi.fn(),
) {
	return render(
		<ul>
			<NotificationItem
				notification={notification}
				onMarkAsRead={onMarkAsRead}
			/>
		</ul>,
	)
}

describe("NotificationItem com tipo NOTICE", () => {
	test("renderiza o título e a mensagem do aviso", () => {
		renderItem(makeNotification())

		expect(screen.getByText("Manutenção programada")).toBeInTheDocument()
		expect(
			screen.getByText("O sistema ficará fora do ar hoje às 22h."),
		).toBeInTheDocument()
	})

	test("tem identificação visual própria, distinta de check-in", () => {
		const { unmount } = renderItem(makeNotification())
		const noticeIcon = screen.getByRole("button").querySelector("svg")
		const noticeWrapper = noticeIcon?.parentElement
		const noticeMarkup = noticeIcon?.innerHTML
		const noticeClassName = noticeWrapper?.className
		unmount()

		renderItem(makeNotification({ id: "check-in-1", type: "CHECK_IN_APPROVED" }))
		const approvedIcon = screen.getByRole("button").querySelector("svg")

		expect(noticeIcon).not.toBeNull()
		expect(approvedIcon).not.toBeNull()
		expect(noticeMarkup).not.toBe(approvedIcon?.innerHTML)
		expect(noticeClassName).not.toBe(approvedIcon?.parentElement?.className)
	})

	test("clicar em um aviso não lido chama onMarkAsRead com o id", async () => {
		const onMarkAsRead = vi.fn()
		renderItem(makeNotification(), onMarkAsRead)

		await userEvent.click(screen.getByRole("button"))

		expect(onMarkAsRead).toHaveBeenCalledTimes(1)
		expect(onMarkAsRead).toHaveBeenCalledWith("notice-1")
	})

	test("clicar em um aviso já lido não chama onMarkAsRead", async () => {
		const onMarkAsRead = vi.fn()
		renderItem(
			makeNotification({ readAt: "2026-09-20T10:00:00.000Z" }),
			onMarkAsRead,
		)

		await userEvent.click(screen.getByRole("button"))

		expect(onMarkAsRead).not.toHaveBeenCalled()
	})
})
```

- **Step 3: Run test to verify it fails**

Run: `cd apps/frontend && pnpm vitest run src/components/notification/notification-item.test.tsx`
Expected: FAIL - `TypeError: Cannot read properties of undefined (reading 'icon')`, porque `NOTIFICATION_TYPE_STYLE["NOTICE"]` não existe.

- **Step 4: Write minimal implementation**

```tsx
// apps/frontend/src/components/notification/notification-item.tsx
import {
	CheckCircle,
	Megaphone,
	ShieldAlert,
	Tag,
	XCircle,
} from "lucide-react"

// dentro de NOTIFICATION_TYPE_STYLE, depois de PROMOTION
	NOTICE: {
		icon: Megaphone,
		iconClassName: "bg-primary/15 text-primary",
	},
```

O tipo `NotificationIcon = typeof CheckCircle` continua válido (todos os ícones do lucide compartilham a mesma assinatura).

- **Step 5: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run src/components/notification/notification-item.test.tsx`
Expected: PASS (4 testes).

- **Step 6: Write the test (SSE com NOTICE entra na lista e no contador)**

Adicionar em `apps/frontend/src/lib/notifications/use-notifications.test.tsx`, dentro de `describe("reconciliação de notificações via SSE", ...)`, logo após o teste `notificação recebida via SSE é adicionada ao topo sem re-buscar a lista [FR-006, FR-007]`:

```tsx
		test("aviso NOTICE recebido via SSE entra no topo da lista e invalida o contador de não lidas [FR-007, FR-008]", async () => {
			mockNotificationsRequests(25)
			const { wrapper } = createWrapper()
			const { result } = renderHook(() => useNotifications(), { wrapper })
			await waitFor(() => expect(result.current.isLoading).toBe(false))
			const unreadCountCallsBefore = mockGet.mock.calls.filter(
				(call) => call[0] === "/api/v1/notifications/unread-count",
			).length
			const streamOptions = vi.mocked(useNotificationStream).mock.calls[0]?.[0]
			await act(async () => {
				streamOptions?.onMessage({
					type: "notification",
					payload: {
						notificationId: "notice-streamed-1",
						userId: "user-1",
						type: "NOTICE",
						title: "Manutenção programada",
						message: "O sistema ficará fora do ar hoje às 22h.",
					},
				})
			})
			await waitFor(() =>
				expect(result.current.notifications[0]).toMatchObject({
					id: "notice-streamed-1",
					type: "NOTICE",
					title: "Manutenção programada",
					readAt: null,
				}),
			)
			await waitFor(() => {
				const unreadCountCallsAfter = mockGet.mock.calls.filter(
					(call) => call[0] === "/api/v1/notifications/unread-count",
				).length
				expect(unreadCountCallsAfter).toBeGreaterThan(unreadCountCallsBefore)
			})
		})
```

- **Step 7: Run test to verify it passes**

Run: `cd apps/frontend && pnpm vitest run src/lib/notifications/use-notifications.test.tsx -t "aviso NOTICE recebido via SSE"`
Expected: PASS. É um teste de caracterização: `toStreamedNotificationItem` já converte o payload SSE para item da lista e o hook já invalida o contador; o teste fixa que o tipo novo segue o mesmo caminho (FR-007/FR-008). Se falhar, o defeito está na conversão do payload em `use-notifications.ts` e deve ser corrigido lá.

- **Step 8: Commit** *(sequential execution only; em wave paralela o orquestrador comita na barreira e você apenas reporta os arquivos)*

```bash
git add apps/frontend/src/components/notification/notification-item.tsx apps/frontend/src/components/notification/notification-item.test.tsx apps/frontend/src/lib/notifications/use-notifications.test.tsx
git commit -m "feat(notification): exibe aviso NOTICE no sino com identificacao propria"
```

## Critérios de Sucesso

- O sino renderiza título e mensagem de um aviso `NOTICE` com ícone `Megaphone` e cor distintos das notificações de check-in (FR-009).
- Aviso não lido chama `onMarkAsRead` ao clicar; aviso já lido não chama (FR-008).
- Evento SSE `NOTICE` aparece no topo da lista sem recarregar e invalida o contador de não lidas (FR-007, FR-008).
