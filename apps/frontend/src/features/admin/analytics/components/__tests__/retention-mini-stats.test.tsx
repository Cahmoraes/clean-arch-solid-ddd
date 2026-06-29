import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { RetentionMiniStats } from "../retention-mini-stats"

describe("RetentionMiniStats", () => {
	test("exibe activeCount, inactiveCount e churnRate", () => {
		render(
			<RetentionMiniStats
				activeCount={312}
				inactiveCount={44}
				churnRate={4.2}
				isLoading={false}
			/>,
		)
		expect(screen.getByText("312")).toBeInTheDocument()
		expect(screen.getByText("44")).toBeInTheDocument()
		expect(screen.getByText("4,2%")).toBeInTheDocument()
	})

	test("exibe inactiveCount em cor destrutiva", () => {
		render(
			<RetentionMiniStats
				activeCount={312}
				inactiveCount={44}
				churnRate={4.2}
				isLoading={false}
			/>,
		)
		const value = screen.getByText("44")
		expect(value.className).toContain("text-destructive")
	})

	test("exibe churnRate em cor destrutiva", () => {
		render(
			<RetentionMiniStats
				activeCount={312}
				inactiveCount={44}
				churnRate={4.2}
				isLoading={false}
			/>,
		)
		const value = screen.getByText("4,2%")
		expect(value.className).toContain("text-destructive")
	})

	test("activeCount NÃO está em cor destrutiva", () => {
		render(
			<RetentionMiniStats
				activeCount={312}
				inactiveCount={44}
				churnRate={4.2}
				isLoading={false}
			/>,
		)
		const value = screen.getByText("312")
		expect(value.className).not.toContain("text-destructive")
	})

	test("formata churnRate com uma casa decimal e símbolo %", () => {
		render(
			<RetentionMiniStats
				activeCount={100}
				inactiveCount={10}
				churnRate={5.555}
				isLoading={false}
			/>,
		)
		expect(screen.getByText("5,6%")).toBeInTheDocument()
	})

	test("exibe 3 Skeletons quando isLoading é true", () => {
		const { container } = render(
			<RetentionMiniStats
				activeCount={0}
				inactiveCount={0}
				churnRate={0}
				isLoading
			/>,
		)
		const skeletons = container.querySelectorAll('[data-testid="skeleton"]')
		expect(skeletons).toHaveLength(3)
	})
})
