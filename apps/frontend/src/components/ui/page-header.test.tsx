import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { PageHeader } from "./page-header"

describe("PageHeader", () => {
	test("exibe título, eyebrow e subtítulo", () => {
		render(
			<PageHeader
				eyebrow="ADMIN"
				title="Usuários"
				subtitle="Gerencie a base"
			/>,
		)
		expect(
			screen.getByRole("heading", { name: "Usuários" }),
		).toBeInTheDocument()
		expect(screen.getByText("ADMIN")).toBeInTheDocument()
		expect(screen.getByText("Gerencie a base")).toBeInTheDocument()
	})
	test("renderiza a ação à direita quando fornecida", () => {
		render(
			<PageHeader
				title="Usuários"
				action={<button type="button">Convidar</button>}
			/>,
		)
		expect(screen.getByRole("button", { name: "Convidar" })).toBeInTheDocument()
	})
})
