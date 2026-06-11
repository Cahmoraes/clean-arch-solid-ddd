import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { ActivityTab, type UserActivityEvent } from "./activity-tab"

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
			{ id: "e1", description: "Conta criada", occurredAt: "12 Jan 2025" },
			{ id: "e2", description: "Login realizado", occurredAt: "Hoje" },
		]
		render(<ActivityTab events={events} />)
		expect(screen.getByText("Conta criada")).toBeInTheDocument()
		expect(screen.getByText("Login realizado")).toBeInTheDocument()
	})
})
