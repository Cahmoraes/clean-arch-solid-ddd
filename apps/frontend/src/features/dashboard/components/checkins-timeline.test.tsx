import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import type { CheckIn } from "@/features/check-ins/api"
import { CheckinsTimeline } from "./checkins-timeline"

function build(status: CheckIn["status"], id: string): CheckIn {
	return {
		id,
		gymId: "g1",
		gymTitle: `Academia ${id}`,
		validatedAt: null,
		rejectedAt: null,
		status,
		createdAt: "2026-05-29T10:00:00Z",
	}
}

describe("CheckinsTimeline", () => {
	test("Validado usa verde semântico, Pendente âmbar e Rejeitado vermelho", () => {
		render(
			<CheckinsTimeline
				checkIns={[
					build("validated", "a"),
					build("pending", "b"),
					build("rejected", "c"),
				]}
			/>,
		)
		expect(screen.getByText("Validado")).toHaveClass(
			"bg-success-soft",
			"text-success",
		)
		expect(screen.getByText("Pendente")).toHaveClass(
			"bg-warning-soft",
			"text-warning",
		)
		expect(screen.getByText("Rejeitado")).toHaveClass("text-destructive")
		expect(screen.getByText("Validado")).not.toHaveClass("bg-accent")
	})

	test("mostra a mensagem de lista vazia sem check-ins", () => {
		render(<CheckinsTimeline checkIns={[]} />)
		expect(
			screen.getByText("Nenhum check-in registrado ainda."),
		).toBeInTheDocument()
	})
})
