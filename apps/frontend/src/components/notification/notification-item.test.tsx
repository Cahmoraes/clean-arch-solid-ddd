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

		renderItem(
			makeNotification({ id: "check-in-1", type: "CHECK_IN_APPROVED" }),
		)
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
