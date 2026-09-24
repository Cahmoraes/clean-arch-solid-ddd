import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { Tabs, TabsList, TabsTrigger } from "./tabs"

describe("TabsTrigger", () => {
	test("a aba ativa é destacada em ciano por token", () => {
		render(
			<Tabs value="a">
				<TabsList>
					<TabsTrigger value="a">Detalhes</TabsTrigger>
					<TabsTrigger value="b">Permissões</TabsTrigger>
				</TabsList>
			</Tabs>,
		)
		const active = screen.getByRole("tab", { name: "Detalhes" })
		expect(active).toHaveAttribute("data-state", "active")
		expect(active.className).toContain("data-[state=active]:text-accent")
		expect(active.className).not.toContain(
			"data-[state=active]:text-foreground",
		)
	})
})
