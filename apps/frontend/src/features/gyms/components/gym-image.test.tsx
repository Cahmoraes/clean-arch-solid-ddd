import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import { API_BASE_URL } from "@/lib/api"
import { renderWithProviders } from "@/test/render"
import { GymImage } from "./gym-image"

describe("GymImage", () => {
	test("renderiza a imagem com src e alt quando há imageKey", () => {
		renderWithProviders(
			<GymImage imageKey="gyms/foto.webp" alt="Academia Volt" />,
		)
		const img = screen.getByTestId("gym-image") as HTMLImageElement
		expect(img).toHaveAttribute("src", `${API_BASE_URL}/uploads/gyms/foto.webp`)
		expect(img).toHaveAttribute("alt", "Academia Volt")
	})

	test("renderiza o placeholder quando não há imageKey", () => {
		renderWithProviders(<GymImage imageKey={null} alt="Academia Volt" />)
		expect(screen.getByTestId("gym-image-placeholder")).toBeInTheDocument()
		expect(screen.queryByTestId("gym-image")).not.toBeInTheDocument()
	})
})
