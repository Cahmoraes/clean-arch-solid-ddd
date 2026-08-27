import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test, vi } from "vitest"
import { ActivityTab, type UserActivityEvent } from "./activity-tab"

function buildEvent(
	overrides: Partial<UserActivityEvent> = {},
): UserActivityEvent {
	return {
		id: "e1",
		type: "LOGIN",
		description: "Login realizado",
		occurredAt: new Date().toISOString(),
		...overrides,
	}
}

function buildPagination(
	overrides: Partial<{
		page: number
		pageSize: number
		total: number
		totalPages: number
	}> = {},
) {
	return {
		page: 1,
		pageSize: 20,
		total: 47,
		totalPages: 3,
		...overrides,
	}
}

describe("ActivityTab", () => {
	test("exibe estado vazio quando não há eventos", () => {
		render(<ActivityTab events={[]} />)
		expect(
			screen.getByText("Sem dados de atividade disponíveis"),
		).toBeInTheDocument()
	})

	test("exibe estado vazio por padrão quando events é omitido", () => {
		render(<ActivityTab />)
		expect(
			screen.getByText("Sem dados de atividade disponíveis"),
		).toBeInTheDocument()
	})

	test("renderiza a lista de eventos quando fornecida", () => {
		const events: UserActivityEvent[] = [
			buildEvent({ id: "e1", description: "Conta criada" }),
			buildEvent({ id: "e2", description: "Login realizado" }),
		]
		render(<ActivityTab events={events} />)
		expect(screen.getByText("Conta criada")).toBeInTheDocument()
		expect(screen.getByText("Login realizado")).toBeInTheDocument()
	})

	test("agrupa eventos de datas diferentes sob cabeçalhos de grupo distintos", () => {
		const today = new Date()
		const longAgo = new Date("2024-01-05T10:00:00.000Z")
		const events: UserActivityEvent[] = [
			buildEvent({ id: "e1", occurredAt: today.toISOString() }),
			buildEvent({ id: "e2", occurredAt: longAgo.toISOString() }),
		]
		render(<ActivityTab events={events} />)

		expect(screen.getByText("Hoje")).toBeInTheDocument()
		expect(
			screen.getByText(
				new Intl.DateTimeFormat("pt-BR", {
					day: "2-digit",
					month: "long",
					year: "numeric",
				}).format(longAgo),
			),
		).toBeInTheDocument()
	})

	test("rotula eventos de ontem sob o cabeçalho Ontem", () => {
		const yesterday = new Date()
		yesterday.setDate(yesterday.getDate() - 1)
		const events: UserActivityEvent[] = [
			buildEvent({ id: "e1", occurredAt: yesterday.toISOString() }),
		]
		render(<ActivityTab events={events} />)

		expect(screen.getByText("Ontem")).toBeInTheDocument()
	})

	test("exibe ícone com cor de destaque para eventos do tipo CHECK_IN", () => {
		const events: UserActivityEvent[] = [
			buildEvent({
				id: "e1",
				type: "CHECK_IN",
				description: "Check-in — Academia Central",
			}),
		]
		const { container } = render(<ActivityTab events={events} />)

		const badge = screen.getByRole("img", { name: "Check-in" })
		expect(badge).toHaveClass("bg-accent/16")
		expect(badge.querySelector("svg")).toHaveClass("text-accent")
		expect(container.querySelector("svg")).not.toBeNull()
	})

	test("exibe ícone com cor de segurança para eventos de senha e bloqueio", () => {
		const events: UserActivityEvent[] = [
			buildEvent({
				id: "e1",
				type: "PASSWORD_CHANGED",
				description: "Senha alterada",
			}),
			buildEvent({
				id: "e2",
				type: "ACCOUNT_LOCKED",
				description: "Conta bloqueada por segurança",
			}),
		]
		const { container } = render(<ActivityTab events={events} />)

		const securityBadges = screen.getAllByRole("img", { name: "Segurança" })
		expect(securityBadges).toHaveLength(2)
		expect(
			securityBadges.every((badge) =>
				badge.classList.contains("bg-warning-soft"),
			),
		).toBe(true)

		const svgClasses = Array.from(container.querySelectorAll("svg")).map(
			(svg) => svg.getAttribute("class") ?? "",
		)
		expect(svgClasses).toHaveLength(2)
		expect(svgClasses.every((cls) => cls.includes("text-warning"))).toBe(true)
	})

	test("exibe ícone com cor de conta/perfil/administrativo para eventos de conta, perfil, role e status", () => {
		const events: UserActivityEvent[] = [
			buildEvent({
				id: "e1",
				type: "GOOGLE_LINKED",
				description: "Conta Google vinculada",
			}),
			buildEvent({
				id: "e2",
				type: "PROFILE_UPDATED",
				description: "Perfil atualizado",
			}),
			buildEvent({
				id: "e3",
				type: "ROLE_CHANGED",
				description: "Role alterada",
			}),
			buildEvent({
				id: "e4",
				type: "STATUS_CHANGED",
				description: "Status alterado",
			}),
			buildEvent({
				id: "e5",
				type: "LOGIN",
				description: "Login realizado",
			}),
		]
		const { container } = render(<ActivityTab events={events} />)

		const badges = screen.getAllByRole("img", {
			name: /Conta|Perfil|Administrativo/,
		})
		expect(badges).toHaveLength(5)
		expect(
			badges.every((badge) => badge.classList.contains("bg-surface-3")),
		).toBe(true)

		const svgClasses = Array.from(container.querySelectorAll("svg")).map(
			(svg) => svg.getAttribute("class") ?? "",
		)
		expect(svgClasses).toHaveLength(5)
		expect(
			svgClasses.every((cls) => cls.includes("text-muted-foreground")),
		).toBe(true)
	})

	test("exibe o horário formatado do evento, não o ISO cru", () => {
		const occurredAt = "2024-01-05T10:30:00.000Z"
		const events: UserActivityEvent[] = [
			buildEvent({ id: "e1", occurredAt, description: "Login realizado" }),
		]
		render(<ActivityTab events={events} />)

		expect(screen.queryByText(occurredAt)).not.toBeInTheDocument()
		expect(
			screen.getByText(
				new Intl.DateTimeFormat("pt-BR", {
					hour: "2-digit",
					minute: "2-digit",
				}).format(new Date(occurredAt)),
			),
		).toBeInTheDocument()
	})

	test("exibe skeleton de carregamento distinto do estado vazio quando isLoading", () => {
		render(<ActivityTab events={[]} isLoading />)
		expect(screen.getByTestId("activity-tab-skeleton")).toBeInTheDocument()
		expect(
			screen.queryByText("Sem dados de atividade disponíveis"),
		).not.toBeInTheDocument()
	})

	test("exibe mensagem de erro distinta do estado vazio quando isError", () => {
		render(<ActivityTab events={[]} isError />)
		expect(
			screen.getByText("Não foi possível carregar o histórico de atividade."),
		).toBeInTheDocument()
		expect(
			screen.queryByText("Sem dados de atividade disponíveis"),
		).not.toBeInTheDocument()
	})

	test("exibe resumo paginado e destaca página atual", () => {
		render(
			<ActivityTab
				events={[buildEvent()]}
				pagination={buildPagination({ page: 2 })}
				onPageChange={vi.fn()}
			/>,
		)

		expect(screen.getByTestId("activity-summary")).toHaveTextContent(
			"Exibindo 21–40 de 47 atividades",
		)
		expect(screen.getByTestId("activity-page-2")).toHaveAttribute(
			"aria-current",
			"page",
		)
		expect(screen.getByTestId("activity-pagination")).toBeInTheDocument()
	})

	test("anuncia resumo e bloqueia pager durante transição", async () => {
		const onPageChange = vi.fn()
		const user = userEvent.setup()
		render(
			<ActivityTab
				events={[buildEvent()]}
				pagination={buildPagination()}
				onPageChange={onPageChange}
				isFetching
			/>,
		)

		expect(screen.getByTestId("activity-summary")).toHaveAttribute(
			"aria-live",
			"polite",
		)
		expect(screen.getByTestId("activity-tab")).toHaveAttribute(
			"aria-busy",
			"true",
		)
		expect(screen.getByTestId("activity-page-2")).toHaveAttribute(
			"aria-disabled",
			"true",
		)

		await user.click(screen.getByTestId("activity-page-2"))
		expect(onPageChange).not.toHaveBeenCalled()
	})

	test("atualiza página ao clicar no pager", async () => {
		const onPageChange = vi.fn()
		const user = userEvent.setup()
		render(
			<ActivityTab
				events={[buildEvent()]}
				pagination={buildPagination()}
				onPageChange={onPageChange}
			/>,
		)

		await user.click(screen.getByTestId("activity-page-3"))

		expect(onPageChange).toHaveBeenCalledWith(3)
	})

	test("ajusta resumo para última página", () => {
		render(
			<ActivityTab
				events={[buildEvent()]}
				pagination={buildPagination({ page: 3 })}
				onPageChange={vi.fn()}
			/>,
		)

		expect(screen.getByTestId("activity-summary")).toHaveTextContent(
			"Exibindo 41–47 de 47 atividades",
		)
	})

	test("não exibe pager quando há apenas uma página", () => {
		render(
			<ActivityTab
				events={[buildEvent()]}
				pagination={buildPagination({ total: 20, totalPages: 1 })}
				onPageChange={vi.fn()}
			/>,
		)

		expect(screen.getByTestId("activity-summary")).toHaveTextContent(
			"Exibindo 1–20 de 20 atividades",
		)
		expect(screen.queryByTestId("activity-pagination")).not.toBeInTheDocument()
	})

	test("mantém resumo e pager quando página sem eventos tem total maior que zero", async () => {
		const onPageChange = vi.fn()
		const user = userEvent.setup()
		render(
			<ActivityTab
				events={[]}
				pagination={buildPagination({
					page: 999,
					total: 47,
					totalPages: 3,
				})}
				onPageChange={onPageChange}
			/>,
		)

		expect(
			screen.getByText("Sem dados de atividade disponíveis"),
		).toBeInTheDocument()
		expect(screen.getByTestId("activity-summary")).toHaveTextContent(
			"Exibindo 41–47 de 47 atividades",
		)
		expect(screen.getByTestId("activity-pagination")).toBeInTheDocument()
		expect(screen.getByTestId("activity-page-3")).toHaveAttribute(
			"aria-current",
			"page",
		)

		await user.click(screen.getByTestId("activity-page-3"))
		expect(onPageChange).toHaveBeenCalledWith(3)
	})

	test("mantém estado vazio legítimo sem footer quando total é zero", () => {
		render(
			<ActivityTab
				events={[]}
				pagination={buildPagination({ total: 0, totalPages: 0 })}
				onPageChange={vi.fn()}
			/>,
		)

		expect(
			screen.getByText("Sem dados de atividade disponíveis"),
		).toBeInTheDocument()
		expect(screen.queryByTestId("activity-summary")).not.toBeInTheDocument()
		expect(screen.queryByTestId("activity-pagination")).not.toBeInTheDocument()
	})
})
