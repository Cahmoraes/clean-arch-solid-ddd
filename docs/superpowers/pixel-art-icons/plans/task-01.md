# Task 1: Módulo pixel-icons, gerador e testes

**Status:** DONE

**PRD:** N/A

**Spec:** `../specs/pixel-art-icons-design.md`

**Tier:** capable

**Depends on:** N/A

## Visão Geral

Cria o módulo `apps/frontend/src/components/ui/pixel-icons.tsx`, que exporta um componente SVG pixel-art por ícone (com o mesmo nome que o `lucide-react` usava, para que os call sites só troquem o import) e o tipo `PixelIcon`. O módulo é gerado por `scripts/generate-pixel-icons.mjs` a partir dos SVGs de `pixelarticons` 2.4.1 (MIT) e commitado com o cabeçalho de licença. As tasks 2 a 7 migram os call sites para este módulo.

## Arquivos

- Create: `apps/frontend/scripts/generate-pixel-icons.mjs`
- Create: `apps/frontend/src/components/ui/pixel-icons.tsx` (gerado pelo script, nunca editado à mão)
- Test: `apps/frontend/src/components/ui/pixel-icons.test.tsx`

## Interfaces

- **Consome:** N/A
- **Produz:** `import { <Nome> } from "@/components/ui/pixel-icons"` e `import type { PixelIcon } from "@/components/ui/pixel-icons"`, com `type PixelIcon = ComponentType<SVGProps<SVGSVGElement>>`. Exports (todos `PixelIcon`): Activity, AlertCircle, AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BadgeCheck, BarChart3, Bell, BellOff, Building2, CalendarCheck, CalendarDays, Check, CheckCircle, CheckCircle2, CheckIcon, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, CircleSlash, Clock, CreditCard, Filter, Flame, KeyRound, LayoutDashboard, LayoutGrid, List, Loader2, LogOut, Mail, MapPin, Megaphone, Moon, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Pencil, Phone, Plus, Power, RefreshCcw, RotateCcw, Search, Shield, ShieldAlert, ShieldCheck, Sun, Tag, Trash2, TriangleAlert, User, UserCircle, UserRound, Users, Wallet, X, XCircle, XIcon. Cada um renderiza `<svg xmlns viewBox="0 0 24 24" width="24" height="24" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true" focusable="false" {...props}>`; `className` e demais props sobrescrevem os padrões. São atribuíveis a `React.ElementType` e a `ComponentType<{ className?: string }>`.

### Skills a invocar

- `typescript-advanced`: tipar `PixelIcon` e garantir atribuibilidade a `ElementType` e `ComponentType<{ className?: string }>`.
- `test-antipatterns`: os testes asserem o que o componente renderiza (atributos do `<svg>`), sem mockar o módulo testado.
- `no-workarounds`: o arquivo gerado nasce do script; nada de editar o `.tsx` gerado à mão nem suprimir lint.
- `wcag-audit-patterns`: ícones decorativos ficam com `aria-hidden="true"` e `focusable="false"`; o nome acessível é do botão ou link.

## Passos

- **Step 1: Confirmar rede e URLs do pacote pinado**

O gerador baixa arquivos de `cdn.jsdelivr.net`. Confirme que o `LICENSE` e um SVG do pacote pinado estão acessíveis antes de escrever o script.

Run: `curl -sI https://cdn.jsdelivr.net/npm/pixelarticons@2.4.1/LICENSE | head -1 && curl -sI https://cdn.jsdelivr.net/npm/pixelarticons@2.4.1/svg/layout.svg | head -1`
Expected: duas linhas iniciando em `HTTP/2 200`. Se o `LICENSE` não responder 200, pare e reporte (o gerador o copia para o cabeçalho).

- **Step 2: Write the failing test (contrato do módulo)**

Crie `apps/frontend/src/components/ui/pixel-icons.test.tsx`:

```tsx
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { render } from "@testing-library/react"
import type { ComponentType, ElementType, SVGProps } from "react"
import { describe, expect, test } from "vitest"
import * as pixelIcons from "./pixel-icons"
import type { PixelIcon } from "./pixel-icons"

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

	test.each(EXPECTED_EXPORTS)(
		"%s renderiza um svg decorativo, nítido e em currentColor",
		(name) => {
			const svg = renderSvg(getIcon(name))
			expect(svg).toHaveAttribute("aria-hidden", "true")
			expect(svg).toHaveAttribute("focusable", "false")
			expect(svg).toHaveAttribute("shape-rendering", "crispEdges")
			expect(svg).toHaveAttribute("viewBox", "0 0 24 24")
			expect(svg).toHaveAttribute("fill", "currentColor")
		},
	)

	test.each(EXPECTED_EXPORTS)("%s repassa className ao svg", (name) => {
		const svg = renderSvg(getIcon(name), { className: "h-6 w-6 text-accent" })
		expect(svg).toHaveClass("h-6", "w-6", "text-accent")
	})

	test.each(EXPECTED_EXPORTS)(
		"%s tem path com coordenadas inteiras",
		(name) => {
			const d = pathData(name)
			expect(d).not.toBe("")
			expect(d).toMatch(/^[a-zA-Z0-9\s,-]+$/)
		},
	)

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

	test.each(SAME_GLYPH_GROUPS.map((names) => ({ names })))(
		"$names compartilham o mesmo glifo",
		({ names }) => {
			const paths = names.map(pathData)
			expect(new Set(paths).size).toBe(1)
		},
	)

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
```

- **Step 3: Review Focus: Ícone renderizado sem classe de tamanho (`ArrowRight` em `EditProfileModal`, `X` em `bulk-action-bar`) → continua 24px como no lucide, nunca 0 nem colapsado — Write the failing test**

Acrescente ao final do mesmo arquivo `pixel-icons.test.tsx` (mesmo `describe` de nível superior, novo bloco):

```tsx
describe("pixel-icons: ícone sem classe de tamanho", () => {
	test.each(["ArrowRight", "X"])(
		"%s sem className renderiza com width e height 24 (não colapsa)",
		(name) => {
			const svg = renderSvg(getIcon(name))
			expect(svg.getAttribute("class")).toBeNull()
			expect(svg).toHaveAttribute("width", "24")
			expect(svg).toHaveAttribute("height", "24")
		},
	)
})
```

- **Step 4: Run test to verify it fails**

Run: `cd apps/frontend && pnpm exec vitest run src/components/ui/pixel-icons.test.tsx`
Expected: FAIL with `Failed to resolve import "./pixel-icons"` (o módulo ainda não existe), 1 arquivo de teste com falha.

- **Step 5: Write minimal implementation (gerador)**

Crie `apps/frontend/scripts/generate-pixel-icons.mjs`:

```js
import { writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const PIXELARTICONS_VERSION = "2.4.1"
const BASE_URL = `https://cdn.jsdelivr.net/npm/pixelarticons@${PIXELARTICONS_VERSION}`
const OUTPUT_PATH = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../src/components/ui/pixel-icons.tsx",
)

const ICON_MAP = {
	Activity: "chart-line",
	AlertCircle: "circle-info",
	AlertTriangle: "warning-diamond",
	ArrowDown: "arrow-down",
	ArrowLeft: "arrow-left",
	ArrowRight: "arrow-right",
	ArrowUp: "arrow-up",
	BadgeCheck: "check-double",
	BarChart3: "chart-bar-big",
	Bell: "bell",
	BellOff: "bell-off",
	Building2: "building",
	CalendarCheck: "calendar",
	CalendarDays: "calendar",
	Check: "check",
	CheckCircle: "checkbox-on",
	CheckCircle2: "checkbox-on",
	CheckIcon: "check",
	ChevronDown: "chevron-down",
	ChevronLeft: "chevron-left",
	ChevronRight: "chevron-right",
	CircleCheck: "checkbox-on",
	CircleSlash: "cancel",
	Clock: "clock",
	CreditCard: "credit-card",
	Filter: "filter",
	Flame: "fire",
	KeyRound: "key",
	LayoutDashboard: "layout",
	LayoutGrid: "grid-2x2-2",
	List: "bulletlist",
	Loader2: "loader",
	LogOut: "logout",
	Mail: "mail",
	MapPin: "map-pin",
	Megaphone: "megaphone",
	Moon: "moon",
	MoreHorizontal: "more-horizontal",
	PanelLeftClose: "arrow-bar-left",
	PanelLeftOpen: "arrow-bar-right",
	Pencil: "pencil",
	Phone: "phone",
	Plus: "plus",
	Power: "power",
	RefreshCcw: "reload",
	RotateCcw: "reload",
	Search: "search",
	Shield: "shield",
	ShieldAlert: "shield",
	ShieldCheck: "shield",
	Sun: "sun",
	Tag: "label",
	Trash2: "trash",
	TriangleAlert: "warning-diamond",
	User: "user",
	UserCircle: "user",
	UserRound: "user",
	Users: "users",
	Wallet: "wallet",
	X: "close",
	XCircle: "close",
	XIcon: "close",
}

const MODULE_PREAMBLE = `import type { ComponentType, SVGProps } from "react"

export type PixelIcon = ComponentType<SVGProps<SVGSVGElement>>

interface PixelSvgProps extends SVGProps<SVGSVGElement> {
	d: string
}

function PixelSvg({ d, ...props }: PixelSvgProps) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			width="24"
			height="24"
			fill="currentColor"
			shapeRendering="crispEdges"
			aria-hidden="true"
			focusable="false"
			{...props}
		>
			<path d={d} />
		</svg>
	)
}
`

async function fetchText(url) {
	const response = await fetch(url)
	if (!response.ok) {
		throw new Error(`Falha ao baixar ${url}: HTTP ${response.status}`)
	}
	return response.text()
}

function extractPathData(svg, pixelName) {
	const match = /<path[^>]*\sd="([^"]+)"/.exec(svg)
	if (!match) throw new Error(`SVG sem path: ${pixelName}`)
	return match[1]
}

async function loadPathData(pixelName) {
	const svg = await fetchText(`${BASE_URL}/svg/${pixelName}.svg`)
	return [pixelName, extractPathData(svg, pixelName)]
}

async function loadAllPaths() {
	const pixelNames = [...new Set(Object.values(ICON_MAP))]
	return new Map(await Promise.all(pixelNames.map(loadPathData)))
}

function commentLine(line) {
	const text = line.trimEnd()
	return text === "" ? " *" : ` * ${text}`
}

function formatLicense(licenseText) {
	return [
		"/**",
		` * Paths vendorizados de pixelarticons ${PIXELARTICONS_VERSION} (licença MIT).`,
		" * Arquivo gerado por scripts/generate-pixel-icons.mjs; não editar à mão.",
		" *",
		...licenseText.trim().split("\n").map(commentLine),
		" */",
	].join("\n")
}

function renderIcon(exportName, pathData) {
	return [
		`export const ${exportName}: PixelIcon = (props) => (`,
		`\t<PixelSvg d="${pathData}" {...props} />`,
		")",
	].join("\n")
}

function renderModule(license, pathsByName) {
	const icons = Object.entries(ICON_MAP).map(([exportName, pixelName]) =>
		renderIcon(exportName, pathsByName.get(pixelName)),
	)
	return `${license}\n\n${MODULE_PREAMBLE}\n${icons.join("\n\n")}\n`
}

async function main() {
	const [licenseText, pathsByName] = await Promise.all([
		fetchText(`${BASE_URL}/LICENSE`),
		loadAllPaths(),
	])
	const source = renderModule(formatLicense(licenseText), pathsByName)
	await writeFile(OUTPUT_PATH, source)
	const total = Object.keys(ICON_MAP).length
	console.log(`pixel-icons.tsx gerado com ${total} ícones`)
}

main().catch((error) => {
	console.error(error.message)
	process.exitCode = 1
})
```

Todas as funções são pequenas (complexidade cognitiva <= 5). Como `Promise.all` rejeita na primeira falha, nenhum arquivo é escrito se qualquer nome não existir ou o download falhar.

- **Step 6: Gerar o módulo (uma vez, com rede)**

Run: `cd apps/frontend && node scripts/generate-pixel-icons.mjs`
Expected: código de saída 0 e a linha `pixel-icons.tsx gerado com 62 ícones`; o arquivo `apps/frontend/src/components/ui/pixel-icons.tsx` passa a existir, começa com o bloco `/** ... */` contendo `Gerrit Halfmann`. Se algum SVG não existir, o script imprime `Falha ao baixar ...` e sai com código 1 sem escrever o arquivo: reporte o nome.

- **Step 7: Run test to verify it passes**

Run: `cd apps/frontend && pnpm exec vitest run src/components/ui/pixel-icons.test.tsx`
Expected: PASS (todos os testes do arquivo, incluindo o de `ArrowRight` e `X` com width/height 24).

- **Step 8: Commit** *(somente quando `workflow.auto_commit` for true; caso contrário, pule e reporte os arquivos)*

```bash
git add apps/frontend/scripts/generate-pixel-icons.mjs apps/frontend/src/components/ui/pixel-icons.tsx apps/frontend/src/components/ui/pixel-icons.test.tsx
git commit -m "feat(frontend): adiciona módulo pixel-icons e gerador a partir de pixelarticons 2.4.1

Claude-Session: https://claude.ai/code/session_01BSogrXaB7yr5wt3g9TGxXS"
```

## Critérios de Sucesso

- `pixel-icons.tsx` exporta os 62 componentes listados em `## Interfaces` mais o tipo `PixelIcon`, e nada além disso.
- Todo ícone renderiza `<svg>` com `aria-hidden="true"`, `focusable="false"`, `shape-rendering="crispEdges"`, `viewBox="0 0 24 24"`, `fill="currentColor"`, e `className` repassado.
- Sem `className`, `width` e `height` são `24` (o ícone não colapsa).
- O arquivo gerado tem cabeçalho MIT de `pixelarticons` 2.4.1 e não contém a string do pacote antigo.
- Rodar o gerador novamente reproduz o mesmo arquivo (mesma versão pinada).
