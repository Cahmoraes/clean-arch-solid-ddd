import { fireEvent, screen, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { endpoint } from "@/test/msw/handlers"
import { server } from "@/test/msw/server"
import { renderWithProviders } from "@/test/render"
import { GymImageEditOverlay } from "./gym-image-edit-overlay"

vi.mock("react-easy-crop", () => ({
	default: vi.fn(
		({
			onCropComplete,
		}: {
			onCropComplete: (
				area: unknown,
				pixels: { x: number; y: number; width: number; height: number },
			) => void
		}) => (
			<button
				type="button"
				data-testid="mock-cropper"
				onClick={() =>
					onCropComplete(
						{ x: 0, y: 0, width: 100, height: 100 },
						{ x: 0, y: 0, width: 100, height: 100 },
					)
				}
			>
				Cropper
			</button>
		),
	),
}))

vi.mock("@/features/gyms/lib/crop-image", () => ({
	getCroppedBlob: vi
		.fn()
		.mockResolvedValue(new Blob(["x"], { type: "image/webp" })),
}))

const createObjectURLMock = vi.fn(() => "blob:mock-url")
const revokeObjectURLMock = vi.fn()

describe("GymImageEditOverlay", () => {
	beforeEach(() => {
		global.URL.createObjectURL = createObjectURLMock
		global.URL.revokeObjectURL = revokeObjectURLMock
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	test("renderiza ícone de edição com data-testid correto", () => {
		renderWithProviders(
			<GymImageEditOverlay gymId="gym-1" imageKey={null} gymTitle="Test Gym" />,
		)
		expect(screen.getByTestId("gym-image-edit-overlay-btn")).toBeInTheDocument()
	})

	test("clique no ícone aciona o input file oculto", () => {
		const { container } = renderWithProviders(
			<GymImageEditOverlay gymId="gym-1" imageKey={null} gymTitle="Test Gym" />,
		)
		const input = container.querySelector(
			'input[type="file"]',
		) as HTMLInputElement
		const clickSpy = vi.spyOn(input, "click")
		fireEvent.click(screen.getByTestId("gym-image-edit-overlay-btn"))
		expect(clickSpy).toHaveBeenCalledOnce()
	})

	test("selecionar arquivo abre o dialog com o Cropper", async () => {
		const { container } = renderWithProviders(
			<GymImageEditOverlay gymId="gym-1" imageKey={null} gymTitle="Test Gym" />,
		)
		const input = container.querySelector(
			'input[type="file"]',
		) as HTMLInputElement
		const file = new File(["content"], "photo.jpg", { type: "image/jpeg" })
		fireEvent.change(input, { target: { files: [file] } })
		expect(await screen.findByTestId("mock-cropper")).toBeInTheDocument()
	})

	test("confirmar recorte chama useSetGymImage e fecha o dialog", async () => {
		const { container } = renderWithProviders(
			<GymImageEditOverlay gymId="gym-1" imageKey={null} gymTitle="Test Gym" />,
		)
		const input = container.querySelector(
			'input[type="file"]',
		) as HTMLInputElement
		const file = new File(["content"], "photo.jpg", { type: "image/jpeg" })
		fireEvent.change(input, { target: { files: [file] } })
		await screen.findByTestId("mock-cropper")
		// dispara onCropComplete via mock
		fireEvent.click(screen.getByTestId("mock-cropper"))
		fireEvent.click(screen.getByText("Confirmar recorte"))
		await waitFor(() => {
			expect(screen.queryByTestId("mock-cropper")).not.toBeInTheDocument()
		})
		expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock-url")
	})

	test("cancelar fecha o dialog sem chamar upload e revoga object URL", async () => {
		const { container } = renderWithProviders(
			<GymImageEditOverlay gymId="gym-1" imageKey={null} gymTitle="Test Gym" />,
		)
		const input = container.querySelector(
			'input[type="file"]',
		) as HTMLInputElement
		const file = new File(["content"], "photo.jpg", { type: "image/jpeg" })
		fireEvent.change(input, { target: { files: [file] } })
		await screen.findByTestId("mock-cropper")
		fireEvent.click(screen.getByText("Cancelar"))
		await waitFor(() => {
			expect(screen.queryByTestId("mock-cropper")).not.toBeInTheDocument()
		})
		expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:mock-url")
	})

	test("falha no upload exibe toast de erro e mantém o dialog aberto (FR-015)", async () => {
		server.use(
			http.post(endpoint("/gyms/:id/image"), () =>
				HttpResponse.json(
					{ message: "Internal Server Error" },
					{ status: 500 },
				),
			),
		)
		const { container } = renderWithProviders(
			<GymImageEditOverlay gymId="gym-1" imageKey={null} gymTitle="Test Gym" />,
		)
		const input = container.querySelector(
			'input[type="file"]',
		) as HTMLInputElement
		const file = new File(["content"], "photo.jpg", { type: "image/jpeg" })
		fireEvent.change(input, { target: { files: [file] } })
		await screen.findByTestId("mock-cropper")
		fireEvent.click(screen.getByTestId("mock-cropper"))
		fireEvent.click(screen.getByText("Confirmar recorte"))
		await waitFor(() => {
			expect(screen.getByTestId("mock-cropper")).toBeInTheDocument()
		})
		expect(revokeObjectURLMock).not.toHaveBeenCalled()
	})
})
