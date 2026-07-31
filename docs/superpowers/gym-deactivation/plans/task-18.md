# Task 18: Botão de alternância de status em `/academias/[id]` [FR-003, FR-004]

**Status:** PENDING
**PRD:** `../prd/prd-gym-deactivation.md`
**Spec:** `../specs/gym-deactivation-design.md`
**Tier:** cheap
**Depends on:** task-16, task-17

## Visão Geral

Adiciona um botão flutuante de alternância de status na página de detalhe da academia
(`apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx`), visível apenas para admin
(mesmo sinal `adminEditHref` já usado pelo botão "Editar" existente), lado a lado com ele sobre
a imagem de capa. O botão troca de ícone/cor conforme `gym.status`: vermelho com ícone de
"desligar" quando a academia está ativa (abre confirmação de desativação), verde com ícone de
"religar" quando está desativada (abre confirmação de reativação). O clique abre o
`GymStatusConfirmationDialog` (Task 16); confirmar aciona `useDeactivateGym`/`useActivateGym`
(Task 17), que já invalidam o cache — a UI reflete o novo status assim que a mutation
resolve e o `useGymById` refaz o fetch.

**Nota de coordenação com a Task 19:** ambas as tasks podem precisar adicionar
`status?: "activated" | "deactivated"` a `GymSummary` em
`apps/frontend/src/features/gyms/api/extended-paths.ts`. Se a Task 19 já tiver rodado quando
esta Task 18 chegar ao Step 3, o campo já existe — não duplicá-lo, apenas confirmar que a
assinatura é exatamente essa e prosseguir direto para a mudança em `page.tsx`.

## Arquivos

- Modify: `apps/frontend/src/features/gyms/api/extended-paths.ts`
- Modify: `apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx`
- Test: `apps/frontend/src/app/(authenticated)/academias/[id]/page.test.tsx`

### Conformidade com as Skills Padrão

- `typescript-advanced`: reutilização do tipo `GymStatusAction` exportado por
  `gym-status-confirmation-dialog.tsx` (Task 16) para escolher a mutation/ícone/cor certos sem
  duplicar a união de estados.
- `tanstack-query` (se disponível no repo; caso não exista skill nomeada correspondente,
  aplicar a categoria mínima — consumir `useMutation`/`isPending` do hook já pronto sem
  gerenciar estado de carregamento manualmente): usar `mutation.isPending` diretamente como
  `isPending` do diálogo, sem duplicar um `useState` de loading.
- `vitest`: suíte de teste seguindo o padrão real já usado em `page.test.tsx` (MSW
  `http.get`/`http.patch`, `useAuthStore.setState`, `vi.mock("sonner", ...)`,
  `renderWithProviders`, `userEvent`).
- `no-workarounds`: o botão nunca aparece para um usuário não-admin — reusa exatamente o
  mesmo sinal (`adminEditHref` truthy) já usado pelo botão de editar, em vez de duplicar a
  checagem de papel.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/gym-deactivation-visual.md` (baseline de
  layout/spacing/hierarquia/tokens)
- **Fonte de design original:** nenhuma; seguir o mockup curado (aprovado pelo usuário sem
  alterações, conforme o próprio arquivo de mockup)
- **Confirmar com o usuário:** existe uma fonte de design original (ex.: URL/Figma) para esta
  tela além do mockup curado?
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma ferramenta de
  design-to-code ou teste visual foi encontrada configurada neste repo no momento do
  planejamento; construir manualmente a partir do mockup, revalidando a lista de
  skills/MCPs disponíveis no ambiente de execução antes de assumir que continua sendo o caso.
- **Decisões visuais já tomadas (não refazer):** botão dentro do mesmo container flutuante do
  "Editar" (`absolute top-3 right-3 z-20`), lado a lado com `gap: 8px`; mesmo tamanho
  36×36px (`h-9 w-9`) e `border-radius: 8px`; sem label visível (ícone + `aria-label`);
  vermelho (`bg-destructive`/`text-destructive-foreground`) com ícone `Power` quando ativa;
  verde (`bg-primary`/`text-primary-foreground`) com ícone `RotateCcw` quando desativada.

## Passos

- **Step 0: Confirmar fonte de design e ferramentas de fidelidade**

Ler `../specs/mockups/gym-deactivation-visual.md` (já lido e resumido acima em "Decisões
visuais já tomadas") e confirmar com o usuário se existe alguma fonte de design original além
do mockup curado. Se nenhuma ferramenta de design-to-code/teste visual estiver configurada no
ambiente de execução no momento de implementar esta task, prosseguir manualmente contra o
mockup — essa é uma resposta válida, não um bloqueio.

- **Step 1: Escrever o teste que falha**

Adicionar ao arquivo já existente `apps/frontend/src/app/(authenticated)/academias/[id]/page.test.tsx`,
reaproveitando os mocks de `sonner`/`useParams` já configurados no topo do arquivo:

```typescript
test("admin vê o botão de desativar em uma academia ativa e confirma a desativação", async () => {
	useAuthStore.setState({
		accessToken: "fake",
		expiresAt: Date.now() + 60_000,
		user: { id: "admin-1", role: "ADMIN" },
	})
	server.use(
		http.get(`${apiBaseUrl}/gyms/:id`, () =>
			HttpResponse.json(
				{
					id: "gym-1",
					title: "Iron Gym",
					description: null,
					phone: null,
					latitude: -23.5,
					longitude: -46.6,
					status: "activated",
				},
				{ status: 200 },
			),
		),
		http.patch(`${apiBaseUrl}/gyms/:id/deactivate`, () =>
			HttpResponse.json({ message: "Gym deactivated" }),
		),
	)

	const user = userEvent.setup()
	renderWithProviders(<GymDetailPage />)

	const toggleButton = await screen.findByRole("button", {
		name: "Desativar academia Iron Gym",
	})
	await user.click(toggleButton)

	const confirmButton = await screen.findByRole("button", {
		name: "Confirmar desativação",
	})
	await user.click(confirmButton)

	await waitFor(() => {
		expect(toast.success).toHaveBeenCalledWith("Academia desativada com sucesso!")
	})
})

test("admin vê o botão de reativar em uma academia desativada e confirma a reativação", async () => {
	useAuthStore.setState({
		accessToken: "fake",
		expiresAt: Date.now() + 60_000,
		user: { id: "admin-1", role: "ADMIN" },
	})
	server.use(
		http.get(`${apiBaseUrl}/gyms/:id`, () =>
			HttpResponse.json(
				{
					id: "gym-1",
					title: "Iron Gym",
					description: null,
					phone: null,
					latitude: -23.5,
					longitude: -46.6,
					status: "deactivated",
				},
				{ status: 200 },
			),
		),
		http.patch(`${apiBaseUrl}/gyms/:id/activate`, () =>
			HttpResponse.json({ message: "Gym activated" }),
		),
	)

	const user = userEvent.setup()
	renderWithProviders(<GymDetailPage />)

	const toggleButton = await screen.findByRole("button", {
		name: "Reativar academia Iron Gym",
	})
	await user.click(toggleButton)

	const confirmButton = await screen.findByRole("button", {
		name: "Confirmar reativação",
	})
	await user.click(confirmButton)

	await waitFor(() => {
		expect(toast.success).toHaveBeenCalledWith("Academia reativada com sucesso!")
	})
})

test("usuário não-admin não vê o botão de alternância de status", async () => {
	useAuthStore.setState({
		accessToken: "fake",
		expiresAt: Date.now() + 60_000,
		user: { id: "user-1", role: "MEMBER" },
	})
	server.use(
		http.get(`${apiBaseUrl}/gyms/:id`, () =>
			HttpResponse.json(
				{
					id: "gym-1",
					title: "Iron Gym",
					description: null,
					phone: null,
					latitude: -23.5,
					longitude: -46.6,
					status: "activated",
				},
				{ status: 200 },
			),
		),
	)

	renderWithProviders(<GymDetailPage />)

	await screen.findByTestId("gym-detail-title")
	expect(screen.queryByTestId("gym-detail-status-toggle")).not.toBeInTheDocument()
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter frontend test:run -- academias/\[id\]/page`
Expected: FAIL — nenhum botão com `data-testid="gym-detail-status-toggle"` ou os `aria-label`s
"Desativar academia Iron Gym"/"Reativar academia Iron Gym" existe ainda.

- **Step 3: Implementação mínima**

`extended-paths.ts` — se `status` ainda não foi adicionado por outra task (ver nota de
coordenação acima), adicionar ao `GymSummary`:
```typescript
export interface GymSummary {
	id: string
	title: string
	description: string | null
	phone: string | null
	address: string | null
	imageKey: string | null
	cnpj?: string
	latitude: number
	longitude: number
	status?: "activated" | "deactivated"
}
```

`page.tsx` — adicionar aos imports do topo do arquivo:
```typescript
import { Power, RotateCcw } from "lucide-react"
// ... mantém ArrowLeft, MapPin, Pencil, Phone já importados de "lucide-react"
import {
	type GymStatusAction,
	GymStatusConfirmationDialog,
} from "@/features/gyms/components/gym-status-confirmation-dialog"
import { useActivateGym, useDeactivateGym } from "@/features/gyms/api"
```

Adicionar o novo componente `GymStatusToggleButton`, próximo de `CheckInButton` (mesmo
arquivo):
```typescript
interface GymStatusToggleButtonProps {
	gym: Gym
}

function GymStatusToggleButton({ gym }: GymStatusToggleButtonProps) {
	const [open, setOpen] = useState(false)
	const deactivateGym = useDeactivateGym()
	const activateGym = useActivateGym()
	const isDeactivated = gym.status === "deactivated"
	const action: GymStatusAction = isDeactivated ? "activate" : "deactivate"
	const mutation = isDeactivated ? activateGym : deactivateGym

	async function handleConfirm() {
		try {
			await mutation.mutateAsync(gym.id)
			toast.success(
				isDeactivated
					? "Academia reativada com sucesso!"
					: "Academia desativada com sucesso!",
			)
			setOpen(false)
		} catch {
			toast.error(
				isDeactivated
					? "Não foi possível reativar a academia. Tente novamente."
					: "Não foi possível desativar a academia. Tente novamente.",
			)
		}
	}

	return (
		<>
			<button
				type="button"
				data-testid="gym-detail-status-toggle"
				aria-label={
					isDeactivated
						? `Reativar academia ${gym.title}`
						: `Desativar academia ${gym.title}`
				}
				onClick={() => setOpen(true)}
				className={
					isDeactivated
						? "inline-flex h-9 w-9 items-center justify-center rounded-md border border-primary bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
						: "inline-flex h-9 w-9 items-center justify-center rounded-md border border-destructive bg-destructive text-destructive-foreground transition-colors hover:bg-destructive/90"
				}
			>
				{isDeactivated ? (
					<RotateCcw className="h-4 w-4" aria-hidden="true" />
				) : (
					<Power className="h-4 w-4" aria-hidden="true" />
				)}
			</button>
			<GymStatusConfirmationDialog
				open={open}
				action={action}
				gymTitle={gym.title}
				isPending={mutation.isPending}
				onOpenChange={setOpen}
				onConfirm={handleConfirm}
			/>
		</>
	)
}
```

Trecho atual de `DetailCard`, dentro do bloco da imagem:
```typescript
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
```

Trecho após a mudança (envolve os dois botões no mesmo container flutuante, per mockup):
```typescript
				{adminEditHref ? (
					<div className="absolute right-3 top-3 z-20 flex items-center gap-2">
						<Link
							href={adminEditHref}
							data-testid="gym-detail-edit"
							aria-label={`Editar academia ${gym.title}`}
							className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/80 text-foreground backdrop-blur transition-colors hover:bg-background hover:text-primary"
						>
							<Pencil className="h-4 w-4" aria-hidden="true" />
						</Link>
						<GymStatusToggleButton gym={gym} />
					</div>
				) : null}
```

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter frontend test:run -- academias/\[id\]/page`
Expected: PASS — os 3 novos casos e todos os já existentes no arquivo passam.

- **Step 5: Commit**

```bash
git add apps/frontend/src/features/gyms/api/extended-paths.ts \
  "apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx" \
  "apps/frontend/src/app/(authenticated)/academias/[id]/page.test.tsx"
git commit -m "feat(gym): add status toggle button to gym detail page"
```

## Critérios de Sucesso

- Um admin vê, sobre a imagem de capa da academia, um botão de status ao lado do botão de
  editar; um usuário comum não vê nenhum dos dois (FR-004).
- Em uma academia ativa, o botão é vermelho, mostra o ícone `Power` e tem
  `aria-label="Desativar academia {title}"`; clicar abre o `GymStatusConfirmationDialog` no
  modo `deactivate` (FR-003, FR-004).
- Em uma academia desativada, o botão é verde, mostra o ícone `RotateCcw` e tem
  `aria-label="Reativar academia {title}"`; clicar abre o diálogo no modo `activate` (FR-003,
  FR-004).
- Confirmar a ação chama `useDeactivateGym`/`useActivateGym` e mostra um toast de sucesso
  específico para cada direção.
- `pnpm --filter frontend test:run -- academias/\[id\]/page` passa com os 3 casos mínimos,
  sem regressão nos casos já existentes no arquivo.
