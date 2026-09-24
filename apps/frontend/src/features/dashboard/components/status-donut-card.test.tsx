import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { StatusDonutCard } from "./status-donut-card"

const distribution = { validated: 6, pending: 3, rejected: 1 }

describe("StatusDonutCard", () => {
	test("colore o anel com os tokens de status: verde, âmbar e vermelho", () => {
		const { container } = render(
			<StatusDonutCard distribution={distribution} />,
		)
		expect(
			container.querySelector('circle[stroke="var(--color-success)"]'),
		).toBeInTheDocument()
		expect(
			container.querySelector('circle[stroke="var(--color-warning)"]'),
		).toBeInTheDocument()
		expect(
			container.querySelector('circle[stroke="var(--color-destructive)"]'),
		).toBeInTheDocument()
	})

	test("a legenda mostra Validado, Pendente e Rejeitado com as contagens e as mesmas cores", () => {
		const { container } = render(
			<StatusDonutCard distribution={distribution} />,
		)
		expect(screen.getByText("Validado")).toBeInTheDocument()
		expect(screen.getByText("Pendente")).toBeInTheDocument()
		expect(screen.getByText("Rejeitado")).toBeInTheDocument()
		const dots = Array.from(
			container.querySelectorAll("li > span[aria-hidden='true']"),
		).map((dot) => dot.getAttribute("style") ?? "")
		expect(dots).toHaveLength(3)
		expect(dots[0]).toContain("var(--color-success)")
		expect(dots[1]).toContain("var(--color-warning)")
		expect(dots[2]).toContain("var(--color-destructive)")
	})

	test("a trilha do anel usa o token muted, não uma variável inexistente", () => {
		const { container } = render(
			<StatusDonutCard distribution={distribution} />,
		)
		expect(
			container.querySelector('circle[stroke="var(--color-muted)"]'),
		).toBeInTheDocument()
	})
})
