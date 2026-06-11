import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { PageContainer } from "./page-container"

describe("PageContainer", () => {
	test("usa o tier default (max-w-4xl) quando width não é informado [RF-002, RF-008]", () => {
		render(<PageContainer>conteúdo</PageContainer>)
		const el = screen.getByTestId("page-container")
		expect(el).toHaveClass("max-w-4xl")
		expect(el.getAttribute("data-width")).toBe("default")
	})

	test("tier wide não aplica max-w [RF-007]", () => {
		render(<PageContainer width="wide">c</PageContainer>)
		const el = screen.getByTestId("page-container")
		expect(el.className).not.toMatch(/max-w-/)
		expect(el.getAttribute("data-width")).toBe("wide")
	})

	test("tier narrow aplica max-w-2xl [RF-009]", () => {
		render(<PageContainer width="narrow">c</PageContainer>)
		expect(screen.getByTestId("page-container")).toHaveClass("max-w-2xl")
	})

	test("nunca centraliza horizontalmente — sem mx-auto [RF-003]", () => {
		render(<PageContainer width="default">c</PageContainer>)
		expect(screen.getByTestId("page-container").className).not.toMatch(
			/mx-auto/,
		)
	})

	test("não aplica padding horizontal px-* [RF-004]", () => {
		render(<PageContainer width="default">c</PageContainer>)
		expect(screen.getByTestId("page-container").className).not.toMatch(
			/(^|\s)px-/,
		)
	})

	test("aplica ritmo vertical padronizado flex flex-col gap-8 [RF-005]", () => {
		render(<PageContainer>c</PageContainer>)
		const el = screen.getByTestId("page-container")
		expect(el).toHaveClass("flex", "flex-col", "gap-8")
	})

	test("repassa className e sobrescreve o gap padrão [RF-006]", () => {
		render(<PageContainer className="gap-6">c</PageContainer>)
		const el = screen.getByTestId("page-container")
		expect(el).toHaveClass("gap-6")
		expect(el.className).not.toMatch(/gap-8/)
	})

	test("renderiza elemento polimórfico via as e repassa aria-labelledby", () => {
		render(
			<PageContainer as="section" aria-labelledby="t" width="wide">
				c
			</PageContainer>,
		)
		const el = screen.getByTestId("page-container")
		expect(el.tagName).toBe("SECTION")
		expect(el.getAttribute("aria-labelledby")).toBe("t")
	})

	test("permite sobrescrever data-testid", () => {
		render(<PageContainer data-testid="x">c</PageContainer>)
		expect(screen.getByTestId("x")).toBeInTheDocument()
	})
})
