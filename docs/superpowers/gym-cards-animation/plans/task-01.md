# Task 01: Instalar motion/react, configurar MotionConfig e mock Vitest [FR-003, FR-005, FR-015]

**Status:** PENDING
**PRD:** `../prd/prd-gym-cards-animation.md`
**Spec:** `../specs/gym-cards-animation-design.md`
**Depends on:** N/A

## Visão Geral

Instala o pacote `motion` (subpath `motion/react`), adiciona `MotionConfig reducedMotion="user"` na página de academias para respeitar `prefers-reduced-motion` automaticamente, e cria um mock Vitest para `motion/react` de forma que todos os testes de componentes que importam a lib funcionem sem polyfills de animação no happy-dom.

## Arquivos

- Modify: `apps/frontend/package.json` (via `pnpm add`)
- Modify: `apps/frontend/vitest.config.ts` (adicionar alias `motion/react`)
- Create: `apps/frontend/src/test/mocks/motion-react.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/academias/page.tsx` (adicionar `MotionConfig`)

### Conformidade com as Skills Padrão

- no-workarounds: o mock deve redirecionar props Motion para props HTML reais, não suprimir erros
- code-style: arquivo `.tsx` com tabs, aspas duplas, sem ponto-e-vírgula desnecessário

## Passos

### Step 1: Instalar a lib motion

No diretório raiz do monorepo:

```bash
pnpm --filter frontend add motion
```

Resultado esperado: `motion` aparece em `apps/frontend/package.json` em `dependencies`.

Confirmar instalação:

```bash
grep '"motion"' apps/frontend/package.json
```

Resultado esperado: `"motion": "^11.x.x"` (versão atual).

### Step 2: Criar o mock de motion/react para Vitest

Criar o arquivo `apps/frontend/src/test/mocks/motion-react.tsx` com o seguinte conteúdo:

```tsx
import type { ReactNode } from "react"

function stripMotionProps(props: Record<string, unknown>) {
	const {
		whileHover: _wh,
		whileTap: _wt,
		initial: _i,
		animate: _a,
		exit: _e,
		transition: _t,
		variants: _v,
		layout: _l,
		onLoad,
		children,
		...rest
	} = props
	return { rest, onLoad, children }
}

export const motion = {
	div: (props: Record<string, unknown>) => {
		const { rest, children } = stripMotionProps(props)
		return <div {...rest}>{children as ReactNode}</div>
	},
	ul: (props: Record<string, unknown>) => {
		const { rest, children } = stripMotionProps(props)
		return <ul {...rest}>{children as ReactNode}</ul>
	},
	li: (props: Record<string, unknown>) => {
		const { rest, children } = stripMotionProps(props)
		return <li {...rest}>{children as ReactNode}</li>
	},
	img: (props: Record<string, unknown>) => {
		const { rest, onLoad } = stripMotionProps(props)
		return <img onLoad={onLoad as React.ReactEventHandler<HTMLImageElement>} {...rest} />
	},
}

export function AnimatePresence({ children }: { children: ReactNode }) {
	return <>{children}</>
}

export function MotionConfig({ children }: { children: ReactNode }) {
	return <>{children}</>
}
```

### Step 3: Adicionar alias motion/react no vitest.config.ts

Abrir `apps/frontend/vitest.config.ts` e adicionar o alias dentro do bloco `resolve.alias`:

```ts
/// <reference types="vitest" />
import path from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"motion/react": path.resolve(
				__dirname,
				"./src/test/mocks/motion-react.tsx",
			),
			"next/dynamic": path.resolve(
				__dirname,
				"./src/test/mocks/next-dynamic.tsx",
			),
			"next/font/google": path.resolve(
				__dirname,
				"./src/test/mocks/next-font-google.ts",
			),
			"next/navigation": path.resolve(
				__dirname,
				"./src/test/mocks/next-navigation.ts",
			),
		},
	},
	test: {
		environment: "happy-dom",
		globals: true,
		setupFiles: ["./src/test/setup.ts"],
		css: false,
		testTimeout: 15_000,
		include: ["src/**/*.{test,spec}.{ts,tsx}"],
		exclude: [
			"node_modules",
			"e2e",
			".next",
			"playwright-report",
			"test-results",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "html", "lcov"],
			reportsDirectory: "./coverage",
			include: ["src/**/*.{ts,tsx}"],
			exclude: [
				"src/**/*.{test,spec}.{ts,tsx}",
				"src/test/**",
				"src/**/*.d.ts",
				"src/app/**/layout.tsx",
				"src/app/**/page.tsx",
			],
		},
	},
})
```

### Step 4: Adicionar MotionConfig na página de academias

Abrir `apps/frontend/src/app/(authenticated)/academias/page.tsx`.

Adicionar o import:

```ts
import { MotionConfig } from "motion/react"
```

Envolver o retorno de `AcademiasContent` com `<MotionConfig reducedMotion="user">`:

```tsx
// Antes (linha 46-116):
return (
	<PageContainer ...>
		...
	</PageContainer>
)

// Depois:
return (
	<MotionConfig reducedMotion="user">
		<PageContainer ...>
			...
		</PageContainer>
	</MotionConfig>
)
```

O arquivo completo de `AcademiasContent` depois da mudança:

```tsx
function AcademiasContent({ initialSearch }: AcademiasContentProps) {
	const user = useAuthStore((state) => state.user)
	const isAdmin = user?.role === "ADMIN"
	const inputId = useId()
	const [draftQuery, setDraftQuery] = useState(initialSearch)
	const [submittedQuery, setSubmittedQuery] = useState(initialSearch)
	const [page, setPage] = useState(1)

	const trimmed = submittedQuery.trim()
	const isBrowseMode = trimmed.length === 0

	const allGymsQuery = useAllGyms({ page, enabled: isBrowseMode })
	const searchQuery = useGymsByName({ name: trimmed, page })
	const activeQuery = isBrowseMode ? allGymsQuery : searchQuery
	const items = activeQuery.data ?? []
	const showPagination =
		!activeQuery.isLoading && !activeQuery.isError && items.length > 0

	function onSearch(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setSubmittedQuery(draftQuery)
		setPage(1)
	}

	return (
		<MotionConfig reducedMotion="user">
			<PageContainer
				as="section"
				width="wide"
				aria-labelledby="academias-title"
				className="gap-0"
			>
				<PageHeader
					eyebrow="Rede"
					title="Academias"
					subtitle="Busque por nome ou navegue pelas academias disponíveis."
					action={
						isAdmin ? (
							<Button asChild variant="primary" size="sm">
								<Link href="/admin/academias/nova" data-testid="gym-create-link">
									<Plus aria-hidden className="h-4 w-4" />
									Cadastrar
								</Link>
							</Button>
						) : undefined
					}
				/>

				<form
					onSubmit={onSearch}
					className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center"
					aria-label="Buscar academias"
				>
					<label htmlFor={inputId} className="sr-only">
						Buscar academias por nome
					</label>
					<SearchBar
						id={inputId}
						data-testid="gym-search-input"
						placeholder="Buscar academia por nome"
						value={draftQuery}
						onChange={(event) => setDraftQuery(event.target.value)}
						className="w-full sm:max-w-md"
					/>
					<Button type="submit" data-testid="gym-search-submit">
						<Search aria-hidden className="h-4 w-4" />
						Buscar
					</Button>
				</form>

				<div data-testid="gym-results" className="flex flex-col gap-4">
					<GymResults
						query={trimmed}
						isBrowseMode={isBrowseMode}
						isLoading={activeQuery.isLoading}
						isError={activeQuery.isError}
						errorMessage={activeQuery.error?.userMessage}
						onRetry={() => activeQuery.refetch()}
						items={items}
						isAdmin={isAdmin}
					/>
				</div>

				{showPagination ? (
					<div className="mt-8">
						<GymPagination
							page={page}
							hasPrevious={page > 1}
							hasNext={items.length >= RESULTS_PER_PAGE}
							onPrevious={() => setPage((current) => Math.max(1, current - 1))}
							onNext={() => setPage((current) => current + 1)}
						/>
					</div>
				) : null}
			</PageContainer>
		</MotionConfig>
	)
}
```

### Step 5: Rodar lint e testes para confirmar que o setup não quebrou nada

```bash
pnpm --filter frontend biome:fix
pnpm --filter frontend tsc:check
pnpm --filter frontend test:run
```

Resultado esperado: 0 erros Biome, 0 erros TypeScript, todos os testes passam (a lib `motion/react` é agora mockada no Vitest).

### Step 6: Commit

```bash
git add apps/frontend/package.json apps/frontend/pnpm-lock.yaml \
        apps/frontend/vitest.config.ts \
        apps/frontend/src/test/mocks/motion-react.tsx \
        apps/frontend/src/app/\(authenticated\)/academias/page.tsx
git commit -m "feat(frontend): instalar motion/react e configurar MotionConfig + mock Vitest

- Adiciona pacote motion como dependência do frontend
- Cria mock motion-react.tsx para Vitest (happy-dom)
- Adiciona alias motion/react em vitest.config.ts
- Envolve AcademiasContent com MotionConfig reducedMotion='user'

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- `pnpm --filter frontend test:run` passa sem erros após a instalação do mock
- `pnpm --filter frontend tsc:check` passa sem erros
- `pnpm --filter frontend biome:fix` reporta zero problemas
- `motion` aparece em `apps/frontend/package.json` dependencies
- `apps/frontend/src/test/mocks/motion-react.tsx` exporta `motion`, `AnimatePresence`, `MotionConfig`
- `vitest.config.ts` contém o alias `"motion/react"` → `./src/test/mocks/motion-react.tsx`
- `academias/page.tsx` importa e usa `MotionConfig` com `reducedMotion="user"` [FR-015]
