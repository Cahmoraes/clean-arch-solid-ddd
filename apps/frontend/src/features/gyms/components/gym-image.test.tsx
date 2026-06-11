import { fireEvent, screen, waitFor } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
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

	test("imagem não possui classes Tailwind de hover/transição legadas", () => {
		renderWithProviders(
			<GymImage imageKey="gyms/foto.webp" alt="Academia Volt" />,
		)
		const img = screen.getByTestId("gym-image")
		expect(img.className).not.toContain("group-hover:scale-[1.05]")
		expect(img.className).not.toContain("group-hover:brightness-105")
		expect(img.className).not.toContain("duration-500")
		expect(img.className).not.toContain("ease-in-out")
	})

	test("imagem atualiza estado loaded após acionar o evento onLoad", () => {
		renderWithProviders(
			<GymImage imageKey="gyms/foto.webp" alt="Academia Volt" />,
		)
		const img = screen.getByTestId("gym-image")
		expect(img).toHaveAttribute("data-loaded", "false")
		fireEvent.load(img)
		expect(screen.getByTestId("gym-image")).toHaveAttribute(
			"data-loaded",
			"true",
		)
	})

	test("imagem já carregada em cache sincroniza estado loaded após montagem", async () => {
		const completeGetter = vi
			.spyOn(HTMLImageElement.prototype, "complete", "get")
			.mockReturnValue(true)

		renderWithProviders(
			<GymImage imageKey="gyms/foto.webp" alt="Academia Volt" />,
		)

		await waitFor(() => {
			expect(screen.getByTestId("gym-image")).toHaveAttribute(
				"data-loaded",
				"true",
			)
		})

		completeGetter.mockRestore()
	})

	test("imagem sai do estado oculto quando ocorre erro de carregamento", () => {
		renderWithProviders(
			<GymImage imageKey="gyms/foto.webp" alt="Academia Volt" />,
		)
		const img = screen.getByTestId("gym-image")
		expect(img).toHaveAttribute("data-loaded", "false")
		fireEvent.error(img)
		expect(screen.getByTestId("gym-image")).toHaveAttribute(
			"data-loaded",
			"true",
		)
	})
})
