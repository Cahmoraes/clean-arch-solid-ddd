/**
 * HU-11 — Acceptance Test: classes CSS responsivas
 *
 * Verifica a presença das classes de responsividade nos arquivos fonte.
 * happy-dom não avalia media queries, então a prova de conformidade é a
 * existência das classes corretas no markup/código-fonte dos componentes.
 *
 * Nota: Este arquivo é executável como script Node.js puro (sem bundler/vitest),
 * pois a verificação é feita via leitura de source files com fs.readFileSync.
 *
 * Executar:
 *   node /home/cahmoraes/projects/estudo/clean-arch-solid-ddd/docs/superpowers/volt-redesign/qa/evidence/us-011-responsividade/us-011-responsividade-classes.acceptance.test.tsx
 */
import { readFileSync } from "node:fs"
import { strict as assert } from "node:assert"

const ROOT =
	"/home/cahmoraes/projects/estudo/clean-arch-solid-ddd/apps/frontend/src"

function readSource(relPath: string): string {
	return readFileSync(`${ROOT}/${relPath}`, "utf-8")
}

let passed = 0
let failed = 0

function check(description: string, value: boolean): void {
	if (value) {
		console.log(`  PASS  ${description}`)
		passed++
	} else {
		console.error(`  FAIL  ${description}`)
		failed++
	}
}

// ── RF-022: sidebar icon-rail ─────────────────────────────────────────────────
console.log("\nRF-022 — Sidebar colapsa para 76px (icon-rail) abaixo de 860px")
const shell = readSource("components/layout/authenticated-shell.tsx")
check(
	'grid wrapper: max-[860px]:grid-cols-[76px_1fr] presente',
	shell.includes("max-[860px]:grid-cols-[76px_1fr]"),
)
check(
	'labels de nav: max-[860px]:hidden presente (ocultar texto)',
	shell.includes("max-[860px]:hidden"),
)
check(
	'sidebar aside: max-[860px]:px-3 presente (padding reduzido)',
	shell.includes("max-[860px]:px-3"),
)
check(
	'nav items: max-[860px]:justify-center presente (centralizar ícones)',
	shell.includes("max-[860px]:justify-center"),
)

// ── RF-023: login coluna única ────────────────────────────────────────────────
console.log("\nRF-023 — Login coluna única abaixo de 860px")
const loginPage = readSource("app/(public)/login/page.tsx")
check(
	'login grid: grid-cols-[1.05fr_1fr] presente',
	loginPage.includes("grid-cols-[1.05fr_1fr]"),
)
check(
	'login grid: max-[860px]:grid-cols-1 presente (coluna única)',
	loginPage.includes("max-[860px]:grid-cols-1"),
)
check(
	'login aside: max-[860px]:hidden presente (ocultar painel lateral)',
	loginPage.includes("max-[860px]:hidden"),
)

// ── RF-024: grids com reflow fluido ──────────────────────────────────────────
console.log("\nRF-024 — Grids com reflow fluido (4→2→1 colunas)")

// Dashboard KPI grid
const dashboardPage = readSource("features/dashboard/components/dashboard-page.tsx")
check(
	'dashboard KPI: grid-cols-4 presente',
	dashboardPage.includes("grid-cols-4"),
)
check(
	'dashboard KPI: max-[1100px]:grid-cols-2 presente',
	dashboardPage.includes("max-[1100px]:grid-cols-2"),
)
check(
	'dashboard KPI: max-[560px]:grid-cols-1 presente',
	dashboardPage.includes("max-[560px]:grid-cols-1"),
)
check(
	'dashboard charts: max-[1100px]:grid-cols-1 presente',
	dashboardPage.includes("max-[1100px]:grid-cols-1"),
)

// Gyms auto-fill grid
const gymResults = readSource("features/gyms/components/gym-results.tsx")
check(
	'gym results: grid-cols-[repeat(auto-fill,minmax(280px,1fr))] presente',
	gymResults.includes("grid-cols-[repeat(auto-fill,minmax(280px,1fr))]"),
)

// ── RF-025: max-w-[1180px] centralizado ──────────────────────────────────────
console.log("\nRF-025 — Conteúdo limitado a 1180px centralizado")
check(
	'shell main content: max-w-[1180px] presente',
	shell.includes("max-w-[1180px]"),
)
check(
	'shell main content: mx-auto presente (centralização)',
	shell.includes("mx-auto"),
)

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(60)}`)
console.log(`Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`)
if (failed > 0) {
	process.exit(1)
} else {
	console.log("ALL CHECKS PASSED")
}
