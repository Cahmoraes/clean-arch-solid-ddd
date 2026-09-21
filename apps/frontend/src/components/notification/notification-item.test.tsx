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
	onDelete: (id: string) => void = vi.fn(),
) {
	return render(
		<ul>
			<NotificationItem
				notification={notification}
				onMarkAsRead={onMarkAsRead}
				onDelete={onDelete}
			/>
		</ul>,
	)
}

function getMainButton(): HTMLElement {
	return screen.getByRole("button", { name: /Manutenção programada/ })
}

function getDeleteButton(): HTMLElement {
	return screen.getByRole("button", { name: "Excluir notificação" })
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
		const noticeIcon = getMainButton().querySelector("svg")
		const noticeWrapper = noticeIcon?.parentElement
		const noticeMarkup = noticeIcon?.innerHTML
		const noticeClassName = noticeWrapper?.className
		unmount()

		renderItem(
			makeNotification({ id: "check-in-1", type: "CHECK_IN_APPROVED" }),
		)
		const approvedIcon = getMainButton().querySelector("svg")

		expect(noticeIcon).not.toBeNull()
		expect(approvedIcon).not.toBeNull()
		expect(noticeMarkup).not.toBe(approvedIcon?.innerHTML)
		expect(noticeClassName).not.toBe(approvedIcon?.parentElement?.className)
	})

	test("clicar em um aviso não lido chama onMarkAsRead com o id", async () => {
		const onMarkAsRead = vi.fn()
		renderItem(makeNotification(), onMarkAsRead)

		await userEvent.click(getMainButton())

		expect(onMarkAsRead).toHaveBeenCalledTimes(1)
		expect(onMarkAsRead).toHaveBeenCalledWith("notice-1")
	})

	test("clicar em um aviso já lido não chama onMarkAsRead", async () => {
		const onMarkAsRead = vi.fn()
		renderItem(
			makeNotification({ readAt: "2026-09-20T10:00:00.000Z" }),
			onMarkAsRead,
		)

		await userEvent.click(getMainButton())

		expect(onMarkAsRead).not.toHaveBeenCalled()
	})

	test("Review Focus: HTML e script na mensagem aparecem como texto no sino, sem executar", () => {
		const scriptMessage =
			'<script>window.__xss = true</script><img src="x" onerror="window.__xss = true">'
		const boldTitle = "<b>Título em negrito</b>"

		const { container } = renderItem(
			makeNotification({ title: boldTitle, message: scriptMessage }),
		)

		expect(screen.getByText(boldTitle)).toBeInTheDocument()
		expect(screen.getByText(scriptMessage)).toBeInTheDocument()
		expect(container.querySelector("script")).toBeNull()
		expect(container.querySelector("img")).toBeNull()
		expect(container.querySelector("b")).toBeNull()
		expect(Reflect.get(window, "__xss")).toBeUndefined()
	})
})

describe("NotificationItem: botão de excluir", () => {
	test("expõe o botão de excluir com nome acessível e type button [FR-001, FR-013]", () => {
		renderItem(makeNotification())

		const deleteButton = getDeleteButton()

		expect(deleteButton).toHaveAttribute("type", "button")
		expect(deleteButton.querySelector("svg")).not.toBeNull()
	})

	test("clicar em excluir chama onDelete com o id e não marca como lida [FR-001, FR-013]", async () => {
		const onMarkAsRead = vi.fn()
		const onDelete = vi.fn()
		renderItem(makeNotification(), onMarkAsRead, onDelete)

		await userEvent.click(getDeleteButton())

		expect(onDelete).toHaveBeenCalledTimes(1)
		expect(onDelete).toHaveBeenCalledWith("notice-1")
		expect(onMarkAsRead).not.toHaveBeenCalled()
	})

	test("o botão principal e o de excluir são irmãos, sem button dentro de button [FR-013]", () => {
		renderItem(makeNotification())
		const mainButton = getMainButton()
		const deleteButton = getDeleteButton()

		expect(mainButton.contains(deleteButton)).toBe(false)
		expect(deleteButton.closest("button")).toBe(deleteButton)
		expect(deleteButton.parentElement).toBe(mainButton.parentElement)
		expect(deleteButton.parentElement?.tagName).toBe("LI")
		expect(deleteButton.parentElement).toHaveClass("group", "relative")
		expect(mainButton.querySelector("button")).toBeNull()
	})

	test("em item lido a atenuação atinge só o botão principal, não o de excluir [FR-001]", () => {
		renderItem(makeNotification({ readAt: "2026-09-20T10:00:00.000Z" }))

		expect(getMainButton()).toHaveClass("opacity-60")
		expect(getDeleteButton()).not.toHaveClass("opacity-60")
		expect(getDeleteButton().closest("li")).not.toHaveClass("opacity-60")
	})

	test("o botão de excluir é revelado por hover ou foco da linha e a hora sai do lugar [FR-012]", () => {
		renderItem(makeNotification())
		const deleteButton = getDeleteButton()

		expect(deleteButton).toHaveClass(
			"opacity-0",
			"group-hover:opacity-100",
			"group-focus-within:opacity-100",
			"focus-visible:opacity-100",
		)
		expect(screen.getByText("agora")).toHaveClass(
			"group-hover:invisible",
			"group-focus-within:invisible",
		)
	})

	test("o botão de excluir tem 32px, rounded-md, ícone Trash2 de 16px e hover destrutivo [FR-012, FR-013]", () => {
		renderItem(makeNotification())
		const deleteButton = getDeleteButton()
		const icon = deleteButton.querySelector("svg")

		expect(deleteButton).toHaveClass(
			"h-8",
			"w-8",
			"rounded-md",
			"hover:bg-destructive-soft",
			"hover:text-destructive",
		)
		expect(icon).toHaveClass("h-4", "w-4")
		expect(icon).toHaveAttribute("aria-hidden", "true")
	})

	test("Review Focus: em dispositivo touch (@media (hover: none)) o botão de excluir fica visível sem hover [FR-012]", () => {
		renderItem(makeNotification())

		expect(getDeleteButton()).toHaveClass("[@media(hover:none)]:opacity-100")
		expect(screen.getByText("agora")).toHaveClass(
			"[@media(hover:none)]:invisible",
		)
	})
})
