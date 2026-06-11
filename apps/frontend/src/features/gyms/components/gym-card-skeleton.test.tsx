import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { renderWithProviders } from "@/test/render"
import { GymCardSkeleton } from "./gym-card-skeleton"

describe("GymCardSkeleton", () => {
	test("renderiza skeleton com data-testid correto", () => {
		renderWithProviders(<GymCardSkeleton />)
		expect(screen.getByTestId("gym-card-skeleton")).toBeInTheDocument()
	})

	test("contém bloco de imagem placeholder com 140px de altura", () => {
		renderWithProviders(<GymCardSkeleton />)
		const imageBlock = screen
			.getByTestId("gym-card-skeleton")
			.querySelector("[data-testid='gym-card-skeleton-image']")
		expect(imageBlock).toBeInTheDocument()
		expect(imageBlock?.className).toContain("h-[140px]")
	})

	test("contém bloco de título placeholder no corpo", () => {
		renderWithProviders(<GymCardSkeleton />)
		expect(screen.getByTestId("gym-card-skeleton-title")).toBeInTheDocument()
	})

	test("todos blocos shimmer possuem classe shimmer", () => {
		renderWithProviders(<GymCardSkeleton />)
		const skeleton = screen.getByTestId("gym-card-skeleton")
		const shimmerBlocks = skeleton.querySelectorAll(".shimmer")
		expect(shimmerBlocks.length).toBeGreaterThanOrEqual(3)
	})
})
