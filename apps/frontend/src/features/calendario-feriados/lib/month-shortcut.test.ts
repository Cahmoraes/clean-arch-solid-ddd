import { afterEach, describe, expect, test } from "vitest"
import { isMonthShortcutBlocked } from "./month-shortcut"

function disparar(
	alvo: HTMLElement,
	opcoes: { prevenir?: boolean } = {},
): KeyboardEvent {
	document.body.append(alvo)
	let capturado!: KeyboardEvent
	alvo.addEventListener(
		"keydown",
		(e) => {
			capturado = e
			if (opcoes.prevenir) e.preventDefault()
		},
		{ once: true },
	)
	alvo.dispatchEvent(
		new KeyboardEvent("keydown", {
			key: "ArrowLeft",
			bubbles: true,
			cancelable: true,
		}),
	)
	return capturado
}

afterEach(() => {
	document.body.replaceChildren()
})

describe("isMonthShortcutBlocked", () => {
	test("não bloqueia com o alvo comum e sem overlay", () => {
		expect(
			isMonthShortcutBlocked(disparar(document.createElement("button")), false),
		).toBe(false)
	})

	test("bloqueia quando há gaveta ou diálogo aberto", () => {
		expect(
			isMonthShortcutBlocked(disparar(document.createElement("button")), true),
		).toBe(true)
	})

	test.each([
		"input",
		"textarea",
		"select",
	])("bloqueia quando o alvo é %s", (tag) => {
		expect(
			isMonthShortcutBlocked(disparar(document.createElement(tag)), false),
		).toBe(true)
	})

	test("bloqueia quando o alvo é contenteditable", () => {
		const div = document.createElement("div")
		div.setAttribute("contenteditable", "true")
		expect(isMonthShortcutBlocked(disparar(div), false)).toBe(true)
	})

	test("não bloqueia quando o alvo tem contenteditable desligado", () => {
		const div = document.createElement("div")
		div.setAttribute("contenteditable", "false")
		expect(isMonthShortcutBlocked(disparar(div), false)).toBe(false)
	})

	test("bloqueia quando o evento já teve o padrão impedido", () => {
		expect(
			isMonthShortcutBlocked(
				disparar(document.createElement("button"), { prevenir: true }),
				false,
			),
		).toBe(true)
	})
})
