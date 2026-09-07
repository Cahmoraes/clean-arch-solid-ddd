# Task 5: Frontend — sentinela de scroll + spinner de rodapé no dropdown [FR-001, FR-008, FR-009]

**Status:** DONE
**PRD:** ../prd/prd-notificacoes-scroll-infinito.md
**Spec:** ../specs/notificacoes-scroll-infinito-design.md
**Tier:** standard
**Depends on:** task-02

## Visão Geral

Adicionar ao `NotificationDropdown` (`apps/frontend/src/components/notification/notification-dropdown.tsx`) uma sentinela observada por `IntersectionObserver`, posicionada ao final da lista dentro do contêiner de scroll já existente (`<div className="max-h-[400px] overflow-y-auto">`). Quando a sentinela entra em viewport, dispara `fetchNextPage`, guardado por `hasNextPage && !isFetchingNextPage` (FR-001). Um indicador de carregamento discreto (spinner textual) é exibido no rodapé enquanto `isFetchingNextPage` é `true` (FR-008) e desaparece assim que o lote termina de carregar ou quando não há mais notificações a carregar (`hasNextPage === false`) (FR-009). `NotificationBell` (`apps/frontend/src/components/notification/notification-bell.tsx`) passa a desestruturar `hasNextPage`, `fetchNextPage`, `isFetchingNextPage` de `useNotifications()` (task-02) e repassá-los ao `NotificationDropdown`.

Nenhum mockup curado existe para esta tela (não há `../specs/mockups/` referenciado no PRD/spec para esta feature) — a subseção "Fidelidade Visual" é omitida; a implementação segue o padrão visual já estabelecido em `notification-dropdown.tsx` (Tailwind utilitário, `text-xs text-muted-foreground`, sem biblioteca de spinner).

## Arquivos

- Modify: `apps/frontend/src/components/notification/notification-dropdown.tsx`
- Modify: `apps/frontend/src/components/notification/notification-bell.tsx`
- Test: `apps/frontend/src/components/notification/notification-dropdown.test.tsx` (novo arquivo — não existe teste para este componente hoje; inclui mock de `IntersectionObserver`, ausente em toda a suíte de testes do frontend)

### Conformidade com as Skills Padrão

- `vercel-react-best-practices`: uso de `useRef`/`useEffect` para gerenciar o ciclo de vida do `IntersectionObserver` (criar no mount, `disconnect()` no cleanup), evitando observers vazados entre re-renders.
- `vercel-composition-patterns`: manter `NotificationDropdown` como componente controlado por props (sem chamar `useNotifications()` internamente), preservando a separação já existente entre `NotificationBell` (estado) e `NotificationDropdown` (apresentação).
- `tailwindcss`: estilizar spinner e sentinela reaproveitando os tokens já usados no arquivo (`text-muted-foreground`, `text-xs`), sem introduzir nova paleta.
- `wcag-audit-patterns`: o indicador de carregamento deve ser anunciado por leitores de tela (`role="status"`/`aria-live="polite"`) e a sentinela não pode ser focável nem lida como conteúdo (`aria-hidden="true"`).
- `typescript-advanced`: tipar o hook interno de observação (`RefObject<HTMLDivElement | null>`) e as novas props de `NotificationDropdownProps`/`NotificationBell` sem `any`.
- `test-antipatterns`: os testes devem simular a entrada em viewport via uma classe mock de `IntersectionObserver` controlada explicitamente pelo teste (chamando o callback registrado), não via mocks parciais do DOM real (jsdom/happy-dom não implementam `IntersectionObserver`).

## Passos

- **Step 1: Write the failing test**

Criar `apps/frontend/src/components/notification/notification-dropdown.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import type { NotificationItem } from "@/lib/notifications/use-notifications"
import { NotificationDropdown } from "./notification-dropdown"

class IntersectionObserverMock implements IntersectionObserver {
	readonly root: Element | Document | null = null
	readonly rootMargin: string = ""
	readonly thresholds: ReadonlyArray<number> = []
	private readonly callback: IntersectionObserverCallback

	constructor(callback: IntersectionObserverCallback) {
		this.callback = callback
	}

	observe = vi.fn()
	unobserve = vi.fn()
	disconnect = vi.fn()
	takeRecords = vi.fn((): IntersectionObserverEntry[] => [])

	trigger(isIntersecting: boolean, target: Element): void {
		this.callback(
			[{ isIntersecting, target } as IntersectionObserverEntry],
			this,
		)
	}
}

let observerInstances: IntersectionObserverMock[] = []

beforeEach(() => {
	observerInstances = []
	vi.stubGlobal(
		"IntersectionObserver",
		vi.fn((callback: IntersectionObserverCallback) => {
			const instance = new IntersectionObserverMock(callback)
			observerInstances.push(instance)
			return instance
		}),
	)
})

afterEach(() => {
	vi.unstubAllGlobals()
})

function makeNotification(id: string): NotificationItem {
	return {
		id,
		type: "CHECK_IN_APPROVED",
		title: `Notificação ${id}`,
		message: "Mensagem",
		gymName: null,
		reason: null,
		readAt: null,
		createdAt: "2024-01-01T10:00:00Z",
	}
}

describe("NotificationDropdown — scroll infinito", () => {
	test("chama fetchNextPage quando a sentinela entra em viewport e hasNextPage/isFetchingNextPage permitem [FR-001]", () => {
		const fetchNextPage = vi.fn()
		render(
			<NotificationDropdown
				notifications={[makeNotification("1")]}
				isLoading={false}
				hasNextPage={true}
				isFetchingNextPage={false}
				fetchNextPage={fetchNextPage}
				onMarkAsRead={vi.fn()}
				onMarkAllAsRead={vi.fn()}
			/>,
		)
		const observer = observerInstances[0]
		const sentinelTarget = observer?.observe.mock.calls[0]?.[0] as Element
		observer?.trigger(true, sentinelTarget)
		expect(fetchNextPage).toHaveBeenCalledTimes(1)
	})

	test("não chama fetchNextPage quando já está buscando o próximo lote (guard isFetchingNextPage) [FR-001]", () => {
		const fetchNextPage = vi.fn()
		render(
			<NotificationDropdown
				notifications={[makeNotification("1")]}
				isLoading={false}
				hasNextPage={true}
				isFetchingNextPage={true}
				fetchNextPage={fetchNextPage}
				onMarkAsRead={vi.fn()}
				onMarkAllAsRead={vi.fn()}
			/>,
		)
		const observer = observerInstances[0]
		const sentinelTarget = observer?.observe.mock.calls[0]?.[0] as Element
		observer?.trigger(true, sentinelTarget)
		expect(fetchNextPage).not.toHaveBeenCalled()
	})

	test("exibe o spinner de rodapé enquanto isFetchingNextPage é true [FR-008]", () => {
		render(
			<NotificationDropdown
				notifications={[makeNotification("1")]}
				isLoading={false}
				hasNextPage={true}
				isFetchingNextPage={true}
				fetchNextPage={vi.fn()}
				onMarkAsRead={vi.fn()}
				onMarkAllAsRead={vi.fn()}
			/>,
		)
		expect(screen.getByRole("status")).toHaveTextContent("Carregando mais...")
	})

	test("não exibe o spinner quando hasNextPage é false [FR-009]", () => {
		render(
			<NotificationDropdown
				notifications={[makeNotification("1")]}
				isLoading={false}
				hasNextPage={false}
				isFetchingNextPage={false}
				fetchNextPage={vi.fn()}
				onMarkAsRead={vi.fn()}
				onMarkAllAsRead={vi.fn()}
			/>,
		)
		expect(screen.queryByRole("status")).not.toBeInTheDocument()
	})
})
```

- **Step 2: Run test to verify it fails**

Run: `(cd apps/frontend && npx vitest run src/components/notification/notification-dropdown.test.tsx)`
Expected: FAIL — `NotificationDropdownProps` ainda não aceita `hasNextPage`/`isFetchingNextPage`/`fetchNextPage` (erro de tipo na compilação do teste) e nenhum `IntersectionObserver` é instanciado pelo componente.

- **Step 3: Write minimal implementation**

`apps/frontend/src/components/notification/notification-dropdown.tsx`:

```tsx
"use client"

import { BellOff } from "lucide-react"
import { useEffect, useRef, type RefObject } from "react"
import type { NotificationItem as NotificationItemData } from "@/lib/notifications/use-notifications"
import { NotificationItem } from "./notification-item"

interface NotificationDropdownProps {
	notifications: NotificationItemData[]
	isLoading: boolean
	hasNextPage: boolean
	isFetchingNextPage: boolean
	fetchNextPage: () => void
	onMarkAsRead: (id: string) => void
	onMarkAllAsRead: () => void
}

function useLoadMoreOnIntersect(
	hasNextPage: boolean,
	isFetchingNextPage: boolean,
	fetchNextPage: () => void,
): RefObject<HTMLDivElement | null> {
	const sentinelRef = useRef<HTMLDivElement | null>(null)
	useEffect(() => {
		const sentinel = sentinelRef.current
		if (!sentinel) return
		const observer = new IntersectionObserver((entries) => {
			const entry = entries[0]
			if (!entry?.isIntersecting) return
			if (!hasNextPage || isFetchingNextPage) return
			fetchNextPage()
		})
		observer.observe(sentinel)
		return () => observer.disconnect()
	}, [hasNextPage, isFetchingNextPage, fetchNextPage])
	return sentinelRef
}

function NotificationDropdownContent({
	notifications,
	isLoading,
	hasNextPage,
	isFetchingNextPage,
	fetchNextPage,
	onMarkAsRead,
}: Pick<
	NotificationDropdownProps,
	| "notifications"
	| "isLoading"
	| "hasNextPage"
	| "isFetchingNextPage"
	| "fetchNextPage"
	| "onMarkAsRead"
>) {
	const sentinelRef = useLoadMoreOnIntersect(
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
	)

	if (isLoading) {
		return (
			<p className="px-4 py-8 text-center text-sm text-muted-foreground">
				Carregando...
			</p>
		)
	}

	if (notifications.length === 0) {
		return (
			<div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
				<span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted-foreground">
					<BellOff className="h-5 w-5" aria-hidden="true" />
				</span>
				<p className="text-sm font-medium text-foreground">
					Nenhuma notificação
				</p>
			</div>
		)
	}

	return (
		<>
			<ul>
				{notifications.map((notification) => (
					<NotificationItem
						key={notification.id}
						notification={notification}
						onMarkAsRead={onMarkAsRead}
					/>
				))}
			</ul>
			{isFetchingNextPage ? (
				<p
					role="status"
					aria-live="polite"
					className="px-4 py-3 text-center text-xs text-muted-foreground"
				>
					Carregando mais...
				</p>
			) : null}
			{hasNextPage ? (
				<div ref={sentinelRef} aria-hidden="true" className="h-1" />
			) : null}
		</>
	)
}

export function NotificationDropdown({
	notifications,
	isLoading,
	hasNextPage,
	isFetchingNextPage,
	fetchNextPage,
	onMarkAsRead,
	onMarkAllAsRead,
}: NotificationDropdownProps) {
	const hasUnreadNotifications = notifications.some(
		(notification) => notification.readAt === null,
	)

	return (
		<div
			role="dialog"
			aria-label="Notificações"
			className="absolute right-0 top-full z-50 mt-2 w-[380px] overflow-hidden rounded-xl border border-border bg-card shadow-md"
		>
			<div className="flex items-center justify-between border-b border-border px-4 py-3">
				<p className="text-sm font-semibold text-foreground">Notificações</p>
				{hasUnreadNotifications ? (
					<button
						type="button"
						onClick={onMarkAllAsRead}
						className="text-xs font-semibold text-accent transition-colors hover:text-primary-strong"
					>
						Marcar todas lidas
					</button>
				) : null}
			</div>

			<div className="max-h-[400px] overflow-y-auto">
				<NotificationDropdownContent
					notifications={notifications}
					isLoading={isLoading}
					hasNextPage={hasNextPage}
					isFetchingNextPage={isFetchingNextPage}
					fetchNextPage={fetchNextPage}
					onMarkAsRead={onMarkAsRead}
				/>
			</div>
		</div>
	)
}
```

`apps/frontend/src/components/notification/notification-bell.tsx` — repassar as três novas props:

```tsx
export function NotificationBell() {
	const [isOpen, setIsOpen] = useState<boolean>(false)
	const containerRef = useRef<HTMLDivElement>(null)
	const {
		notifications,
		unreadCount,
		isLoading,
		hasNextPage,
		isFetchingNextPage,
		fetchNextPage,
		markAsRead,
		markAllAsRead,
	} = useNotifications()

	// ... (handleClickOutside/handleKeyDown/ariaLabel inalterados)

	return (
		<div ref={containerRef} className="relative">
			<button /* inalterado */>{/* ... */}</button>

			{isOpen ? (
				<NotificationDropdown
					notifications={notifications}
					isLoading={isLoading}
					hasNextPage={hasNextPage}
					isFetchingNextPage={isFetchingNextPage}
					fetchNextPage={fetchNextPage}
					onMarkAsRead={(notificationId) => {
						void markAsRead(notificationId)
					}}
					onMarkAllAsRead={() => {
						void markAllAsRead()
					}}
				/>
			) : null}
		</div>
	)
}
```

- **Step 4: Run test to verify it passes**

Run: `(cd apps/frontend && npx vitest run src/components/notification/notification-dropdown.test.tsx)`
Expected: PASS — os 4 testes do novo arquivo passam.

- **Step 5: Commit** *(sequential execution only — em wave paralela, pule e reporte os arquivos)*

```bash
git add apps/frontend/src/components/notification/notification-dropdown.tsx \
  apps/frontend/src/components/notification/notification-bell.tsx \
  apps/frontend/src/components/notification/notification-dropdown.test.tsx
git commit -m "feat(notifications): sentinela de scroll infinito e spinner de rodapé no dropdown"
```

## Critérios de Sucesso

- Rolar até o fim da lista carregada dispara automaticamente a busca do próximo lote, respeitando o guard `hasNextPage && !isFetchingNextPage` (FR-001).
- Um indicador de carregamento discreto aparece no rodapé da lista enquanto o próximo lote está sendo buscado (FR-008).
- O indicador desaparece assim que o lote termina de carregar ou quando não há mais notificações a carregar (FR-009).
