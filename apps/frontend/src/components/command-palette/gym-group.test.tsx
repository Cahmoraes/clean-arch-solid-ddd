import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Command } from "cmdk"
import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import { GymGroup } from "./gym-group"

const mockPush = vi.fn()

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush, replace: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
	usePathname: () => "/",
}))

function renderGymGroup(query: string, isActive = query.trim().length >= 2) {
	return renderWithProviders(
		<Command shouldFilter={false}>
			<Command.List>
				<GymGroup query={query} isActive={isActive} onSelect={vi.fn()} />
			</Command.List>
		</Command>,
	)
}

describe("GymGroup", () => {
	beforeEach(() => {
		mockPush.mockClear()
	})

	test("não exibe nada quando isActive=false", () => {
		renderGymGroup("a", false)
		expect(screen.queryByText("Academias")).not.toBeInTheDocument()
	})

	test("não dispara fetch quando isActive=false", async () => {
		const fetchSpy = vi.fn()
		server.use(
			http.get("*/gyms/search/:name", () => {
				fetchSpy()
				return HttpResponse.json([])
			}),
		)
		renderGymGroup("academia", false)
		await new Promise((r) => setTimeout(r, 50))
		expect(fetchSpy).not.toHaveBeenCalled()
	})

	test("exibe skeleton enquanto carrega", async () => {
		server.use(
			http.get("*/gyms/search/:name", async () => {
				await new Promise((r) => setTimeout(r, 100))
				return HttpResponse.json([])
			}),
		)
		renderGymGroup("academia")
		expect(screen.getByTestId("gym-group-loading")).toBeInTheDocument()
	})

	test("exibe academias retornadas pela API", async () => {
		server.use(
			http.get("*/gyms/search/:name", () =>
				HttpResponse.json([
					{
						id: "1",
						title: "Academia Fit",
						description: "",
						phone: "",
						latitude: 0,
						longitude: 0,
					},
					{
						id: "2",
						title: "Gym Power",
						description: "",
						phone: "",
						latitude: 0,
						longitude: 0,
					},
				]),
			),
		)
		renderGymGroup("academia")
		await waitFor(() =>
			expect(screen.getByText("Academia Fit")).toBeInTheDocument(),
		)
		expect(screen.getByText("Gym Power")).toBeInTheDocument()
	})

	test("exibe estado vazio quando API retorna lista vazia", async () => {
		server.use(http.get("*/gyms/search/:name", () => HttpResponse.json([])))
		renderGymGroup("xxxx")
		await waitFor(() =>
			expect(
				screen.getByText("Nenhuma academia encontrada."),
			).toBeInTheDocument(),
		)
	})

	test("navega para /academias com query ao selecionar", async () => {
		const onSelect = vi.fn()
		server.use(
			http.get("*/gyms/search/:name", () =>
				HttpResponse.json([
					{
						id: "1",
						title: "Academia Fit",
						description: "",
						phone: "",
						latitude: 0,
						longitude: 0,
					},
				]),
			),
		)
		renderWithProviders(
			<Command shouldFilter={false}>
				<Command.List>
					<GymGroup query="academia" isActive={true} onSelect={onSelect} />
				</Command.List>
			</Command>,
		)
		await waitFor(() => screen.getByText("Academia Fit"))
		await userEvent.click(screen.getByText("Academia Fit"))
		expect(mockPush).toHaveBeenCalledWith("/academias?search=Academia+Fit")
		expect(onSelect).toHaveBeenCalledTimes(1)
	})
})
