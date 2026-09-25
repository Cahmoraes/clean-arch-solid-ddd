import { fireEvent, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { setMotionPaused } from "@/lib/motion-preference"
import { PixelTrail } from "./pixel-trail"

// `mockMatchMedia` de src/test/browser-mocks.ts é um único valor global e não
// distingue a query — usá-lo aqui misturaria "(pointer: fine)" com
// "(prefers-reduced-motion: reduce)" (lida por useSceneMotion). Por isso este
// arquivo estuba matchMedia localmente, por query.
function stubMatchMedia(pointerFine: boolean, reducedMotion = false): void {
	vi.stubGlobal(
		"matchMedia",
		(query: string) =>
			({
				matches: query.includes("pointer") ? pointerFine : reducedMotion,
				media: query,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			}) as unknown as MediaQueryList,
	)
}

function makeFakeContext() {
	return {
		clearRect: vi.fn(),
		fillRect: vi.fn(),
		setTransform: vi.fn(),
		fillStyle: "",
		globalAlpha: 1,
	} as unknown as CanvasRenderingContext2D
}

function renderTrail() {
	return render(
		<div style={{ position: "relative" }}>
			<PixelTrail />
		</div>,
	)
}

describe("PixelTrail", () => {
	let rafCallbacks: FrameRequestCallback[]
	let fakeContext: CanvasRenderingContext2D

	beforeEach(() => {
		rafCallbacks = []
		fakeContext = makeFakeContext()
		stubMatchMedia(true)
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
			fakeContext,
		)
		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
			rafCallbacks.push(cb)
			return rafCallbacks.length
		})
		vi.stubGlobal("cancelAnimationFrame", vi.fn())
	})

	afterEach(() => {
		vi.restoreAllMocks()
		vi.unstubAllGlobals()
		setMotionPaused(false)
	})

	test("sem pointermove, nenhum rAF é agendado", () => {
		renderTrail()
		expect(rafCallbacks).toHaveLength(0)
	})

	test("após pointermove, agenda rAF e desenha com fillRect", () => {
		const { container } = renderTrail()
		const wrapper = container.firstElementChild as HTMLElement
		fireEvent.pointerMove(wrapper, { clientX: 20, clientY: 20 })
		expect(rafCallbacks.length).toBeGreaterThan(0)
		rafCallbacks[0]?.(0)
		expect(fakeContext.fillRect).toHaveBeenCalled()
	})

	test("com pointer: coarse, não registra o listener de pointermove", () => {
		stubMatchMedia(false)
		const { container } = renderTrail()
		const wrapper = container.firstElementChild as HTMLElement
		fireEvent.pointerMove(wrapper, { clientX: 20, clientY: 20 })
		expect(rafCallbacks).toHaveLength(0)
	})

	test("com getContext retornando nulo, não lança erro e não desenha", () => {
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null)
		expect(() => renderTrail()).not.toThrow()
	})

	test("depois que as células decaem nenhum rAF fica pendente, e com a pausa ativa o rastro não desenha", () => {
		// parte 1: o decaimento esgota o loop de rAF
		const first = renderTrail()
		const wrapper1 = first.container.firstElementChild as HTMLElement
		fireEvent.pointerMove(wrapper1, { clientX: 20, clientY: 20 })
		const framesToDecay = Math.ceil(0.9 / 0.04) + 1
		for (let i = 0; i < framesToDecay; i += 1) {
			const callback = rafCallbacks.at(-1)
			rafCallbacks = []
			callback?.(0)
		}
		expect(rafCallbacks).toHaveLength(0)
		first.unmount()

		// parte 2: com a preferência de pausa ativa, nenhum pointermove desenha
		setMotionPaused(true)
		fakeContext = makeFakeContext()
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
			fakeContext,
		)
		const second = renderTrail()
		const wrapper2 = second.container.firstElementChild as HTMLElement
		fireEvent.pointerMove(wrapper2, { clientX: 20, clientY: 20 })
		expect(fakeContext.fillRect).not.toHaveBeenCalled()
	})
})
