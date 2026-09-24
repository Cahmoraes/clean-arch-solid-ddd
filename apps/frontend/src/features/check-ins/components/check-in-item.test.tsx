import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { CheckIn } from "@/features/check-ins/api"
import { CheckInItem } from "./check-in-item.js"

const checkIn: CheckIn = {
	id: "c1",
	gymId: "gym-1",
	gymTitle: "VOLT Centro",
	validatedAt: null,
	rejectedAt: null,
	status: "pending",
	createdAt: "2026-05-29T10:00:00Z",
}

describe("CheckInItem VOLT", () => {
	test("exibe a academia do check-in", () => {
		render(<CheckInItem checkIn={checkIn} />)
		expect(screen.getByText(/VOLT Centro/)).toBeInTheDocument()
	})

	test("aplica o chip de status pendente", () => {
		const { container } = render(<CheckInItem checkIn={checkIn} />)
		expect(
			container.querySelector('[data-status="pending"]'),
		).toBeInTheDocument()
	})

	test("aplica o chip de status validado", () => {
		const { container } = render(
			<CheckInItem checkIn={{ ...checkIn, status: "validated" }} />,
		)
		expect(
			container.querySelector('[data-status="validated"]'),
		).toBeInTheDocument()
	})

	test("aplica o chip de status rejeitado", () => {
		const { container } = render(
			<CheckInItem checkIn={{ ...checkIn, status: "rejected" }} />,
		)
		expect(
			container.querySelector('[data-status="rejected"]'),
		).toBeInTheDocument()
	})

	test("renderiza a area de acoes recebida", () => {
		render(
			<CheckInItem
				checkIn={checkIn}
				action={<button type="button">X</button>}
			/>,
		)
		expect(screen.getByRole("button", { name: "X" })).toBeInTheDocument()
	})

	test("preserva o testid do item", () => {
		render(<CheckInItem checkIn={checkIn} />)
		expect(screen.getByTestId("checkin-item-c1")).toBeInTheDocument()
	})
})

describe("CheckInItem — direção Noite neon", () => {
	test("o chip de status usa fundo suave semântico: verde, âmbar e vermelho", () => {
		const { container, rerender } = render(<CheckInItem checkIn={checkIn} />)
		expect(container.querySelector('[data-status="pending"]')).toHaveClass(
			"bg-warning-soft",
			"text-warning",
		)
		rerender(<CheckInItem checkIn={{ ...checkIn, status: "validated" }} />)
		expect(container.querySelector('[data-status="validated"]')).toHaveClass(
			"bg-success-soft",
			"text-success",
		)
		rerender(<CheckInItem checkIn={{ ...checkIn, status: "rejected" }} />)
		expect(container.querySelector('[data-status="rejected"]')).toHaveClass(
			"bg-destructive-soft",
			"text-destructive",
		)
	})

	test("o horário aparece em mono à direita, só com hora e minuto, ligado ao instante do check-in", () => {
		const { container } = render(<CheckInItem checkIn={checkIn} />)
		const time = container.querySelector("time")
		expect(time).toHaveClass("font-mono")
		expect(time).toHaveAttribute("dateTime", checkIn.createdAt)
		expect(time?.textContent).toMatch(/^\d{2}:\d{2}$/)
	})

	test("mantém o texto Realizado em com data e hora", () => {
		render(<CheckInItem checkIn={checkIn} />)
		expect(screen.getByText(/Realizado em .+\d{2}:\d{2}/)).toBeInTheDocument()
	})
})
