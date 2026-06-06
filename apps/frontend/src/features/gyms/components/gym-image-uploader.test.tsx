import { fireEvent, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { renderWithProviders } from "@/test/render"

vi.mock("react-easy-crop", () => ({
	default: ({
		onCropComplete,
	}: {
		onCropComplete: (a: unknown, b: unknown) => void
	}) => (
		<button
			type="button"
			data-testid="mock-cropper"
			onClick={() =>
				onCropComplete(
					{ x: 0, y: 0, width: 0, height: 0 },
					{ x: 0, y: 0, width: 160, height: 90 },
				)
			}
		>
			cropper
		</button>
	),
}))

vi.mock("@/features/gyms/lib/crop-image", () => ({
	getCroppedBlob: vi.fn(async () => new Blob(["webp"], { type: "image/webp" })),
}))

import { getCroppedBlob } from "@/features/gyms/lib/crop-image"
import { GymImageUploader } from "./gym-image-uploader"

describe("GymImageUploader", () => {
	beforeEach(() => {
		URL.createObjectURL = vi.fn(() => "blob:fake")
		URL.revokeObjectURL = vi.fn()
	})

	test("ao selecionar arquivo, mostra o cropper e o botão de confirmar", () => {
		renderWithProviders(<GymImageUploader onCropped={vi.fn()} />)
		fireEvent.change(screen.getByTestId("gym-image-input"), {
			target: { files: [new File(["x"], "f.png", { type: "image/png" })] },
		})
		expect(screen.getByTestId("crop-confirm")).toBeInTheDocument()
	})

	test("confirma o recorte e chama onCropped com o Blob", async () => {
		const onCropped = vi.fn()
		renderWithProviders(<GymImageUploader onCropped={onCropped} />)
		fireEvent.change(screen.getByTestId("gym-image-input"), {
			target: { files: [new File(["x"], "f.png", { type: "image/png" })] },
		})
		fireEvent.click(screen.getByTestId("mock-cropper"))
		fireEvent.click(screen.getByTestId("crop-confirm"))
		await waitFor(() => expect(onCropped).toHaveBeenCalledTimes(1))
		expect(onCropped.mock.calls[0]?.[0]).toBeInstanceOf(Blob)
	})

	test("exibe mensagem de erro quando o recorte falha", async () => {
		vi.mocked(getCroppedBlob).mockRejectedValueOnce(new Error("boom"))
		const onCropped = vi.fn()
		renderWithProviders(<GymImageUploader onCropped={onCropped} />)
		fireEvent.change(screen.getByTestId("gym-image-input"), {
			target: { files: [new File(["x"], "f.png", { type: "image/png" })] },
		})
		fireEvent.click(screen.getByTestId("mock-cropper"))
		fireEvent.click(screen.getByTestId("crop-confirm"))
		await waitFor(() =>
			expect(screen.getByTestId("gym-image-error")).toBeInTheDocument(),
		)
		expect(onCropped).not.toHaveBeenCalled()
	})
})
