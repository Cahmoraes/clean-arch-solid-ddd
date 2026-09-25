import { execFileSync } from "node:child_process"
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
	const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map(
		(match) => match[1],
	)
	if (paths.length === 0) throw new Error(`SVG sem path: ${pixelName}`)
	return paths.join("")
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

function formatWithBiome() {
	execFileSync("pnpm", ["exec", "biome", "format", "--write", OUTPUT_PATH], {
		cwd: resolve(dirname(fileURLToPath(import.meta.url)), ".."),
		stdio: "inherit",
	})
}

async function main() {
	const [licenseText, pathsByName] = await Promise.all([
		fetchText(`${BASE_URL}/LICENSE`),
		loadAllPaths(),
	])
	const source = renderModule(formatLicense(licenseText), pathsByName)
	await writeFile(OUTPUT_PATH, source)
	formatWithBiome()
	const total = Object.keys(ICON_MAP).length
	console.log(`pixel-icons.tsx gerado com ${total} ícones`)
}

main().catch((error) => {
	console.error(error.message)
	process.exitCode = 1
})
