import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, test } from "vitest"
import { AtRiskAlertZone } from "../at-risk-alert-zone"

const fourMembers = [
	{ id: "1", name: "Ana Santos", daysSinceLastCheckIn: 21 },
	{ id: "2", name: "Carlos Lima", daysSinceLastCheckIn: 15 },
	{ id: "3", name: "Maria Silva", daysSinceLastCheckIn: 10 },
	{ id: "4", name: "João Souza", daysSinceLastCheckIn: 8 },
]

describe("AtRiskAlertZone", () => {
	test("exibe zona âmbar quando há membros em risco", () => {
		render(<AtRiskAlertZone members={fourMembers} isLoading={false} />)
		expect(screen.getByText(/membros em risco de churn/i)).toBeInTheDocument()
	})

	test("exibe HealthyZone quando lista de membros está vazia", () => {
		render(<AtRiskAlertZone members={[]} isLoading={false} />)
		expect(screen.getByText("Academia saudável")).toBeInTheDocument()
	})

	test("exibe apenas os 3 primeiros membros por padrão", () => {
		render(<AtRiskAlertZone members={fourMembers} isLoading={false} />)
		expect(screen.getByText("Ana Santos")).toBeInTheDocument()
		expect(screen.getByText("Carlos Lima")).toBeInTheDocument()
		expect(screen.getByText("Maria Silva")).toBeInTheDocument()
		expect(screen.queryByText("João Souza")).not.toBeInTheDocument()
	})

	test("ordena membros por daysSinceLastCheckIn decrescente", () => {
		const unordered = [
			{ id: "a", name: "Primeiro", daysSinceLastCheckIn: 5 },
			{ id: "b", name: "Segundo", daysSinceLastCheckIn: 21 },
			{ id: "c", name: "Terceiro", daysSinceLastCheckIn: 12 },
		]
		render(<AtRiskAlertZone members={unordered} isLoading={false} />)
		const items = screen.getAllByRole("listitem")
		expect(items[0]).toHaveTextContent("Segundo")
	})

	test("'ver todos' revela membros além dos 3 primeiros", async () => {
		const user = userEvent.setup()
		render(<AtRiskAlertZone members={fourMembers} isLoading={false} />)
		await user.click(screen.getByRole("button", { name: /ver todos/i }))
		expect(screen.getByText("João Souza")).toBeInTheDocument()
	})

	test("não exibe botão 'ver todos' quando há 3 ou menos membros", () => {
		render(
			<AtRiskAlertZone members={fourMembers.slice(0, 3)} isLoading={false} />,
		)
		expect(
			screen.queryByRole("button", { name: /ver todos/i }),
		).not.toBeInTheDocument()
	})

	test("exibe badge em cor destrutiva para membro com >= 18 dias sem check-in", () => {
		render(
			<AtRiskAlertZone
				members={[{ id: "1", name: "Ana Santos", daysSinceLastCheckIn: 21 }]}
				isLoading={false}
			/>,
		)
		const badge = screen.getByText("21 dias sem check-in")
		expect(badge.className).toContain("text-destructive")
	})

	test("exibe badge em cor âmbar para membro com < 18 dias sem check-in", () => {
		render(
			<AtRiskAlertZone
				members={[{ id: "2", name: "Carlos Lima", daysSinceLastCheckIn: 15 }]}
				isLoading={false}
			/>,
		)
		const badge = screen.getByText("15 dias sem check-in")
		expect(badge.className).toContain("text-warning")
	})

	test("'ver menos' colapsa lista de volta aos 3 primeiros membros", async () => {
		const user = userEvent.setup()
		render(<AtRiskAlertZone members={fourMembers} isLoading={false} />)
		await user.click(screen.getByRole("button", { name: /ver todos/i }))
		expect(screen.getByText("João Souza")).toBeInTheDocument()
		await user.click(screen.getByRole("button", { name: /ver menos/i }))
		expect(screen.queryByText("João Souza")).not.toBeInTheDocument()
	})

	test("exibe Skeleton quando isLoading é true", () => {
		const { container } = render(<AtRiskAlertZone members={[]} isLoading />)
		expect(
			container.querySelector('[data-testid="skeleton"]'),
		).toBeInTheDocument()
	})
})
