import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { describe, expect, test, vi } from "vitest"

const cookieGet = vi.fn()

vi.mock("next/headers", () => ({
	cookies: () => Promise.resolve({ get: cookieGet }),
}))

vi.mock("@/components/layout/authenticated-shell", () => ({
	AuthenticatedShell: ({
		defaultCollapsed,
		children,
	}: {
		defaultCollapsed?: boolean
		children: ReactNode
	}) => (
		<div data-testid="shell" data-collapsed={String(defaultCollapsed)}>
			{children}
		</div>
	),
}))

import AuthenticatedLayout from "./layout"

describe("AuthenticatedLayout — cookie de recolhimento", () => {
	test("passa defaultCollapsed=true quando o cookie vale '1'", async () => {
		cookieGet.mockReturnValue({ value: "1" })
		const ui = await AuthenticatedLayout({ children: <p>x</p> })
		render(ui)
		expect(screen.getByTestId("shell")).toHaveAttribute(
			"data-collapsed",
			"true",
		)
	})

	test("passa defaultCollapsed=false quando o cookie está ausente", async () => {
		cookieGet.mockReturnValue(undefined)
		const ui = await AuthenticatedLayout({ children: <p>x</p> })
		render(ui)
		expect(screen.getByTestId("shell")).toHaveAttribute(
			"data-collapsed",
			"false",
		)
	})
})
