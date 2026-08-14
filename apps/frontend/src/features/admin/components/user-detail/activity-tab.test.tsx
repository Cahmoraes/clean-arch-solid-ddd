import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
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

	test("exibe ícone com cor de destaque para eventos do tipo CHECK_IN", () => {
		const events: UserActivityEvent[] = [
			buildEvent({
				id: "e1",
				type: "CHECK_IN",
				description: "Check-in — Academia Central",
			}),
		]
		render(<ActivityTab events={events} />)

		expect(screen.getByRole("img", { name: "Check-in" })).toBeInTheDocument()
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
})
