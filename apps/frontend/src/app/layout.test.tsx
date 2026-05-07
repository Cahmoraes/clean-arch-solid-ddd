import { render, screen } from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"
import { describe, expect, test, vi } from "vitest"
import AuthenticatedLayout from "./(authenticated)/layout"
import PublicLayout from "./(public)/layout"
import RootLayout from "./layout"

const mockSetTheme = vi.fn()

vi.mock("next-themes", () => ({
	ThemeProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
	useTheme: () => ({
		theme: "light",
		setTheme: mockSetTheme,
	}),
}))

vi.mock("@/components/layout/authenticated-shell", () => ({
	AuthenticatedShell: ({ children }: { children: ReactNode }) => (
		<div data-testid="authenticated-shell">{children}</div>
	),
}))

vi.mock("./providers", () => ({
	Providers: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock("./web-vitals", () => ({
	WebVitalsReporter: () => null,
}))

vi.mock("@/components/ui/toaster", () => ({
	Toaster: () => null,
}))

function renderRootLayoutContent(children: ReactNode) {
	const rootLayout = RootLayout({ children }) as ReactElement<{
		children: ReactElement<{ children: ReactNode }>
		suppressHydrationWarning?: boolean
	}>

	expect(rootLayout.props.suppressHydrationWarning).toBe(true)
	return render(rootLayout.props.children.props.children)
}

describe("RootLayout", () => {
	test("deve exibir o toggle de tema ao renderizar o shell público", async () => {
		renderRootLayoutContent(
			<PublicLayout>
				<div>conteúdo público</div>
			</PublicLayout>,
		)

		expect(screen.getByTestId("public-shell")).toBeInTheDocument()
		const toggle = await screen.findByRole("button", {
			name: "Ativar tema escuro",
		})
		expect(toggle).toBeInTheDocument()
		expect(toggle).toHaveTextContent("🌙")
	})

	test("deve exibir o toggle de tema ao renderizar o shell autenticado", async () => {
		renderRootLayoutContent(
			<AuthenticatedLayout>
				<div>conteúdo autenticado</div>
			</AuthenticatedLayout>,
		)

		expect(screen.getByTestId("authenticated-shell")).toBeInTheDocument()
		const toggle = await screen.findByRole("button", {
			name: "Ativar tema escuro",
		})
		expect(toggle).toBeInTheDocument()
		expect(toggle).toHaveTextContent("🌙")
	})
})
