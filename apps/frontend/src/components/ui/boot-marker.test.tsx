import { render } from "@testing-library/react"
import { beforeEach, describe, expect, test } from "vitest"
import { BOOT_PLAYED_KEY } from "@/lib/boot-session"
import { BootMarker } from "./boot-marker"

describe("BootMarker", () => {
	beforeEach(() => {
		sessionStorage.clear()
	})

	test("animationend em um alvo [data-boot] grava a flag de boot tocado", () => {
		render(<BootMarker />)
		const target = document.createElement("div")
		target.setAttribute("data-boot", "stats")
		document.body.appendChild(target)
		target.dispatchEvent(new Event("animationend", { bubbles: true }))
		expect(sessionStorage.getItem(BOOT_PLAYED_KEY)).toBe("true")
		target.remove()
	})

	test("animationend fora de [data-boot] não grava a flag", () => {
		render(<BootMarker />)
		const target = document.createElement("div")
		document.body.appendChild(target)
		target.dispatchEvent(new Event("animationend", { bubbles: true }))
		expect(sessionStorage.getItem(BOOT_PLAYED_KEY)).toBeNull()
		target.remove()
	})
})
