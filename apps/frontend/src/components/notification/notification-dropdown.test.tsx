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
		vi.fn(function (this: unknown, callback: IntersectionObserverCallback) {
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
