import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { UserRow } from "./user-row"

function row(role: string) {
	return {
		id: "u1",
		name: "Ana",
		email: "ana@example.com",
		role,
	}
}

describe("UserRow", () => {
	it("renderiza nome, e-mail e label legível para role MEMBER", () => {
		render(
			<ul>
				<UserRow user={row("MEMBER")} />
			</ul>,
		)
		expect(screen.getByText("Ana")).toBeInTheDocument()
		expect(screen.getByText("ana@example.com")).toBeInTheDocument()
		expect(screen.getByTestId("user-row-u1-role")).toHaveTextContent("Membro")
	})

	it("renderiza label legível para role ADMIN", () => {
		render(
			<ul>
				<UserRow user={row("ADMIN")} />
			</ul>,
		)
		expect(screen.getByTestId("user-row-u1-role")).toHaveTextContent(
			"Administrador",
		)
	})

	it("mantém o valor original para roles desconhecidas", () => {
		render(
			<ul>
				<UserRow user={row("OWNER")} />
			</ul>,
		)
		expect(screen.getByTestId("user-row-u1-role")).toHaveTextContent("OWNER")
	})
})
