# Task 2: Implementação — botão editar em DetailCard, DetailBody e GymDetailPage

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/gym-detail-edit-button-design.md`
**Depends on:** task-01

## Visão Geral

Modificar `apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx` para:

1. `DetailCard` — recebe `adminEditHref?: string`; envolve `GymImage` em wrapper
   `relative`; renderiza `<Link>` de edição `absolute right-3 top-3 z-20` quando
   `adminEditHref` está presente.
2. `DetailBodyProps` / `DetailBody` — adiciona e repassa `adminEditHref?: string`.
3. `GymDetailPage` — importa `useAuthStore`, deriva `adminEditHref` e passa para
   `DetailBody`.

Ao final, os três testes da task-01 devem ficar verdes.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx`

### Conformidade com as Skills Padrão

- `code-style`: indentação tab, linha em branco no fim do arquivo, aspas duplas, sem semicolons desnecessários
- `tailwindcss`: tokens semânticos (`bg-background/80`, `border-border`, `text-primary`) — sem valores hardcoded
- `no-workarounds`: sem `// @ts-ignore`, sem `any`, sem `stopPropagation`

## Passos

### Step 1: Adicionar `Pencil` ao import de `lucide-react`

No topo do arquivo
`apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx`, a linha:

```typescript
import { ArrowLeft, MapPin, Phone } from "lucide-react"
```

Passa a ser:

```typescript
import { ArrowLeft, MapPin, Pencil, Phone } from "lucide-react"
```

(`Link` do `next/link` já está importado na linha 2 — não duplicar.)

### Step 2: Adicionar `useAuthStore` ao import

Logo após os imports existentes (após `import { ApiError } from "@/lib/errors"`),
adicionar:

```typescript
import { useAuthStore } from "@/lib/auth/auth-store"
```

### Step 3: Adicionar interface `DetailCardProps` e refatorar `DetailCard`

Substituir a função `DetailCard` atual:

```typescript
// ANTES
function DetailCard({ gym }: { gym: Gym }) {
	return (
		<article
			data-testid="gym-detail-card"
			className="flex flex-col gap-6 rounded-[12px] border border-border bg-card p-6"
		>
			<GymImage
				imageKey={gym.imageKey}
				alt={gym.title}
				className="h-48 w-full rounded-[8px]"
				loading="eager"
			/>
```

Pela versão com prop e wrapper relativo:

```typescript
interface DetailCardProps {
	gym: Gym
	adminEditHref?: string
}

function DetailCard({ gym, adminEditHref }: DetailCardProps) {
	return (
		<article
			data-testid="gym-detail-card"
			className="flex flex-col gap-6 rounded-[12px] border border-border bg-card p-6"
		>
			<div className="relative h-48 w-full">
				<GymImage
					imageKey={gym.imageKey}
					alt={gym.title}
					className="h-full w-full rounded-[8px]"
					loading="eager"
				/>
				{adminEditHref ? (
					<Link
						href={adminEditHref}
						data-testid="gym-detail-edit"
						aria-label={`Editar academia ${gym.title}`}
						className="absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/80 text-foreground backdrop-blur transition-colors hover:bg-background hover:text-primary"
					>
						<Pencil className="h-4 w-4" aria-hidden="true" />
					</Link>
				) : null}
			</div>
```

O restante de `DetailCard` (a partir de `<header className=...>`) permanece idêntico.

### Step 4: Adicionar `adminEditHref` em `DetailBodyProps` e `DetailBody`

Substituir a interface e função `DetailBody`:

```typescript
// ANTES
interface DetailBodyProps {
	isLoading: boolean
	isError: boolean
	errorMessage?: string
	onRetry: () => void
	gym: Gym | undefined
}

function DetailBody({
	isLoading,
	isError,
	errorMessage,
	onRetry,
	gym,
}: DetailBodyProps) {
	if (isLoading) return <DetailLoading />
	if (isError) return <DetailError message={errorMessage} onRetry={onRetry} />
	if (gym) return <DetailCard gym={gym} />
	return null
}
```

```typescript
// DEPOIS
interface DetailBodyProps {
	isLoading: boolean
	isError: boolean
	errorMessage?: string
	onRetry: () => void
	gym: Gym | undefined
	adminEditHref?: string
}

function DetailBody({
	isLoading,
	isError,
	errorMessage,
	onRetry,
	gym,
	adminEditHref,
}: DetailBodyProps) {
	if (isLoading) return <DetailLoading />
	if (isError) return <DetailError message={errorMessage} onRetry={onRetry} />
	if (gym) return <DetailCard gym={gym} adminEditHref={adminEditHref} />
	return null
}
```

### Step 5: Atualizar `GymDetailPage` para derivar e repassar `adminEditHref`

Substituir a função `GymDetailPage`:

```typescript
// ANTES
export default function GymDetailPage() {
	const params = useParams<{ id: string }>()
	const id = params?.id
	const query = useGymById(id)

	return (
		<PageContainer
			as="section"
			width="default"
			aria-labelledby="gym-detail-title"
		>
			<div>
				<Link
					href="/academias"
					data-testid="gym-back-link"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft aria-hidden className="h-4 w-4" />
					Voltar para a busca
				</Link>
			</div>

			<DetailBody
				isLoading={query.isLoading}
				isError={query.isError}
				errorMessage={query.error?.userMessage}
				onRetry={() => query.refetch()}
				gym={query.data}
			/>
		</PageContainer>
	)
}
```

```typescript
// DEPOIS
export default function GymDetailPage() {
	const params = useParams<{ id: string }>()
	const id = params?.id
	const query = useGymById(id)
	const user = useAuthStore((state) => state.user)
	const adminEditHref =
		user?.role === "ADMIN" ? `/admin/academias/${id}/editar` : undefined

	return (
		<PageContainer
			as="section"
			width="default"
			aria-labelledby="gym-detail-title"
		>
			<div>
				<Link
					href="/academias"
					data-testid="gym-back-link"
					className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeft aria-hidden className="h-4 w-4" />
					Voltar para a busca
				</Link>
			</div>

			<DetailBody
				isLoading={query.isLoading}
				isError={query.isError}
				errorMessage={query.error?.userMessage}
				onRetry={() => query.refetch()}
				gym={query.data}
				adminEditHref={adminEditHref}
			/>
		</PageContainer>
	)
}
```

### Step 6: Lint

```bash
cd apps/frontend
pnpm --filter frontend lint:fix
```

Saída esperada: zero issues Biome.

### Step 7: Type check

```bash
pnpm --filter frontend tsc:check
```

Saída esperada: zero erros TypeScript.

### Step 8: Rodar todos os testes da feature

```bash
cd apps/frontend
pnpm test -- -t "GymDetailPage" --reporter=verbose
```

Saída esperada: todos os testes passam, incluindo os três novos da task-01:
- `exibe link de edição para usuário admin` — PASS
- `rotula o link de edição com o nome da academia` — PASS
- `não exibe link de edição para usuário não-admin` — PASS

### Step 9: Rodar a suíte completa

```bash
pnpm --filter frontend test:run
```

Saída esperada: zero falhas.

### Step 10: Build de verificação

```bash
pnpm --filter frontend build
```

Saída esperada: build concluído sem erros.

### Step 11: Commit da implementação

```bash
cd /home/cahmoraes/projects/estudo/clean-arch-solid-ddd
git add apps/frontend/src/app/\(authenticated\)/academias/\[id\]/page.tsx
git commit -m "feat: botão editar no detalhe da academia para admin

Adiciona Link de edição sobreposto à capa em /academias/[id].
GymDetailPage deriva adminEditHref via useAuthStore; DetailCard
recebe a prop e renderiza botão Pencil absolute right-3 top-3 z-20.
Segue padrão visual e arquitetural do GymCard (gym-edit-entrypoint).

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

## Critérios de Sucesso

- Admin vê o botão `Pencil` no canto superior direito da imagem de capa em `/academias/[id]`.
- Não-admin não vê o botão.
- `href` do botão é `/admin/academias/{id}/editar`.
- `aria-label` é `"Editar academia {título}"`.
- `pnpm lint:fix` retorna zero issues.
- `pnpm tsc:check` retorna zero erros.
- `pnpm test:run` — todos os testes passam.
- `pnpm build` — build sem erros.
