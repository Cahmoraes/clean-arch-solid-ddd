import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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
				onDelete={vi.fn()}
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
				onDelete={vi.fn()}
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
				onDelete={vi.fn()}
			/>,
		)
		const status = screen.getByRole("status")
		expect(status).toHaveTextContent("Carregando mais...")
		expect(status).toHaveAttribute("aria-live", "polite")
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
				onDelete={vi.fn()}
			/>,
		)
		expect(screen.queryByRole("status")).not.toBeInTheDocument()
	})

	test("não exibe o spinner quando o lote termina de carregar e hasNextPage continua true [FR-009]", () => {
		render(
			<NotificationDropdown
				notifications={[makeNotification("1")]}
				isLoading={false}
				hasNextPage={true}
				isFetchingNextPage={false}
				fetchNextPage={vi.fn()}
				onMarkAsRead={vi.fn()}
				onMarkAllAsRead={vi.fn()}
				onDelete={vi.fn()}
			/>,
		)
		expect(screen.queryByRole("status")).not.toBeInTheDocument()
	})

	test("sentinela de scroll é aria-hidden [AC-11]", () => {
		render(
			<NotificationDropdown
				notifications={[makeNotification("1")]}
				isLoading={false}
				hasNextPage={true}
				isFetchingNextPage={false}
				fetchNextPage={vi.fn()}
				onMarkAsRead={vi.fn()}
				onMarkAllAsRead={vi.fn()}
				onDelete={vi.fn()}
			/>,
		)
		const observer = observerInstances[0]
		const sentinel = observer?.observe.mock.calls[0]?.[0] as Element
		expect(sentinel).toHaveAttribute("aria-hidden", "true")
	})

	test("desconecta o IntersectionObserver ao desmontar [AC-10]", () => {
		const { unmount } = render(
			<NotificationDropdown
				notifications={[makeNotification("1")]}
				isLoading={false}
				hasNextPage={true}
				isFetchingNextPage={false}
				fetchNextPage={vi.fn()}
				onMarkAsRead={vi.fn()}
				onMarkAllAsRead={vi.fn()}
				onDelete={vi.fn()}
			/>,
		)
		unmount()
		expect(observerInstances[0]?.disconnect).toHaveBeenCalled()
	})
})

describe("NotificationDropdown: exclusão", () => {
	test("clicar em excluir chama onDelete com o id da notificação, sem marcar como lida [FR-001]", async () => {
		const onDelete = vi.fn()
		const onMarkAsRead = vi.fn()
		render(
			<NotificationDropdown
				notifications={[makeNotification("1")]}
				isLoading={false}
				hasNextPage={false}
				isFetchingNextPage={false}
				fetchNextPage={vi.fn()}
				onMarkAsRead={onMarkAsRead}
				onMarkAllAsRead={vi.fn()}
				onDelete={onDelete}
			/>,
		)

		await userEvent.click(
			screen.getByRole("button", { name: "Excluir notificação" }),
		)

		expect(onDelete).toHaveBeenCalledTimes(1)
		expect(onDelete).toHaveBeenCalledWith("1")
		expect(onMarkAsRead).not.toHaveBeenCalled()
	})

	test("Review Focus: excluir a última notificação carregada com hasNextPage ativo volta a buscar mais e, sem mais páginas, mostra o estado vazio [FR-011]", () => {
		const fetchNextPage = vi.fn()
		const baseProps = {
			isLoading: false,
			isFetchingNextPage: false,
			fetchNextPage,
			onMarkAsRead: vi.fn(),
			onMarkAllAsRead: vi.fn(),
			onDelete: vi.fn(),
		}
		const { rerender } = render(
			<NotificationDropdown
				{...baseProps}
				notifications={[makeNotification("1")]}
				hasNextPage={true}
			/>,
		)
		const observer = observerInstances[0]
		const sentinel = observer?.observe.mock.calls[0]?.[0]

		rerender(
			<NotificationDropdown
				{...baseProps}
				notifications={[]}
				hasNextPage={true}
			/>,
		)

		expect(screen.queryByText("Nenhuma notificação")).not.toBeInTheDocument()
		expect(sentinel).toBeInTheDocument()
		observer?.trigger(true, sentinel)
		expect(fetchNextPage).toHaveBeenCalledTimes(1)

		rerender(
			<NotificationDropdown
				{...baseProps}
				notifications={[]}
				hasNextPage={false}
			/>,
		)

		expect(screen.getByText("Nenhuma notificação")).toBeInTheDocument()
	})
})
