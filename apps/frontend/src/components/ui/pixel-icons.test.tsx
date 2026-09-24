import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { render } from "@testing-library/react"
import type { ComponentType, ElementType, SVGProps } from "react"
import { describe, expect, test } from "vitest"
import type { PixelIcon } from "./pixel-icons"
import * as pixelIcons from "./pixel-icons"

const EXPECTED_EXPORTS = [
	"Activity",
	"AlertCircle",
	"AlertTriangle",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
	"ArrowUp",
	"BadgeCheck",
	"BarChart3",
	"Bell",
	"BellOff",
	"Building2",
	"CalendarCheck",
	"CalendarDays",
	"Check",
	"CheckCircle",
	"CheckCircle2",
	"CheckIcon",
	"ChevronDown",
	"ChevronLeft",
	"ChevronRight",
	"CircleCheck",
	"CircleSlash",
	"Clock",
	"CreditCard",
	"Filter",
	"Flame",
	"KeyRound",
	"LayoutDashboard",
	"LayoutGrid",
	"List",
	"Loader2",
	"LogOut",
	"Mail",
	"MapPin",
	"Megaphone",
	"Moon",
	"MoreHorizontal",
	"PanelLeftClose",
	"PanelLeftOpen",
	"Pencil",
	"Phone",
	"Plus",
	"Power",
	"RefreshCcw",
	"RotateCcw",
	"Search",
	"Shield",
	"ShieldAlert",
	"ShieldCheck",
	"Sun",
	"Tag",
	"Trash2",
	"TriangleAlert",
	"User",
	"UserCircle",
	"UserRound",
	"Users",
	"Wallet",
	"X",
	"XCircle",
	"XIcon",
]

const SAME_GLYPH_GROUPS: ReadonlyArray<ReadonlyArray<string>> = [
	["CheckCircle", "CheckCircle2", "CircleCheck"],
	["CalendarDays", "CalendarCheck"],
	["User", "UserCircle", "UserRound"],
	["X", "XIcon", "XCircle"],
	["Check", "CheckIcon"],
	["TriangleAlert", "AlertTriangle"],
	["Shield", "ShieldAlert", "ShieldCheck"],
	["RefreshCcw", "RotateCcw"],
]

const DISTINCT_GLYPHS = [
	"Megaphone",
	"CheckCircle",
	"XCircle",
	"ShieldAlert",
	"Tag",
]

const ICONS = new Map<string, PixelIcon>(Object.entries(pixelIcons))

function getIcon(name: string): PixelIcon {
	const icon = ICONS.get(name)
	if (!icon) throw new Error(`ícone não exportado: ${name}`)
	return icon
}

function renderSvg(
	Icon: PixelIcon,
	props: SVGProps<SVGSVGElement> = {},
): SVGSVGElement {
	const { container } = render(<Icon {...props} />)
	const svg = container.querySelector("svg")
	if (!svg) throw new Error("o ícone não renderizou um <svg>")
	return svg
}

function pathData(name: string): string {
	const path = renderSvg(getIcon(name)).querySelector("path")
	return path?.getAttribute("d") ?? ""
}

describe("pixel-icons: contrato do módulo", () => {
	test("exporta exatamente os ícones esperados", () => {
		expect([...ICONS.keys()].sort()).toEqual([...EXPECTED_EXPORTS].sort())
	})

	test.each(
		EXPECTED_EXPORTS,
	)("%s renderiza um svg decorativo, nítido e em currentColor", (name) => {
		const svg = renderSvg(getIcon(name))
		expect(svg).toHaveAttribute("aria-hidden", "true")
		expect(svg).toHaveAttribute("focusable", "false")
		expect(svg).toHaveAttribute("shape-rendering", "crispEdges")
		expect(svg).toHaveAttribute("viewBox", "0 0 24 24")
		expect(svg).toHaveAttribute("fill", "currentColor")
	})

	test.each(EXPECTED_EXPORTS)("%s repassa className ao svg", (name) => {
		const svg = renderSvg(getIcon(name), { className: "h-6 w-6 text-accent" })
		expect(svg).toHaveClass("h-6", "w-6", "text-accent")
	})

	test.each(
		EXPECTED_EXPORTS,
	)("%s tem path com coordenadas inteiras", (name) => {
		const d = pathData(name)
		expect(d).not.toBe("")
		expect(d).toMatch(/^[a-zA-Z0-9\s,-]+$/)
	})

	test("props do chamador sobrescrevem os padrões", () => {
		const svg = renderSvg(getIcon("Search"), {
			width: 16,
			height: 16,
			"aria-label": "Buscar",
			"aria-hidden": false,
		})
		expect(svg).toHaveAttribute("width", "16")
		expect(svg).toHaveAttribute("height", "16")
		expect(svg).toHaveAttribute("aria-label", "Buscar")
		expect(svg).toHaveAttribute("aria-hidden", "false")
	})

	test("é atribuível a ElementType e a ComponentType<{ className?: string }>", () => {
		const asElementType: ElementType = pixelIcons.Users
		const asClassNameOnly: ComponentType<{ className?: string }> =
			pixelIcons.Users
		const Dynamic = asElementType
		const Narrow = asClassNameOnly
		const first = render(<Dynamic className="a" />).container.querySelector(
			"svg",
		)
		const second = render(<Narrow className="b" />).container.querySelector(
			"svg",
		)
		expect(first).toHaveClass("a")
		expect(second).toHaveClass("b")
	})

	test.each(
		SAME_GLYPH_GROUPS.map((names) => ({ names })),
	)("$names compartilham o mesmo glifo", ({ names }) => {
		const paths = names.map(pathData)
		expect(new Set(paths).size).toBe(1)
	})

	test("exports usados para diferenciar significado têm glifos distintos entre si", () => {
		const paths = DISTINCT_GLYPHS.map(pathData)
		expect(new Set(paths).size).toBe(DISTINCT_GLYPHS.length)
	})

	test("o arquivo gerado tem cabeçalho MIT do pixelarticons 2.4.1 e não cita o pacote antigo", () => {
		const content = readFileSync(
			resolve(process.cwd(), "src/components/ui/pixel-icons.tsx"),
			"utf8",
		)
		expect(content).toContain("pixelarticons 2.4.1")
		expect(content).toContain("MIT")
		expect(content).toContain("Gerrit Halfmann")
		expect(content).not.toContain("lucide-react")
	})
})

describe("pixel-icons: ícone sem classe de tamanho", () => {
	test.each([
		"ArrowRight",
		"X",
	])("%s sem className renderiza com width e height 24 (não colapsa)", (name) => {
		const svg = renderSvg(getIcon(name))
		expect(svg.getAttribute("class")).toBeNull()
		expect(svg).toHaveAttribute("width", "24")
		expect(svg).toHaveAttribute("height", "24")
	})
})
