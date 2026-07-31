# Task 19: Selo "Desativada" em `GymCard`/`GymRow` para admin [FR-012]

**Status:** PENDING
**PRD:** `../prd/prd-gym-deactivation.md`
**Spec:** `../specs/gym-deactivation-design.md`
**Tier:** cheap
**Depends on:** task-13, task-14, task-17

## Visão Geral

`GymCard` e `GymRow` (`apps/frontend/src/features/gyms/components/gym-card.tsx` e
`gym-row.tsx`) já exibem um selo fixo "Disponível" para toda academia, admin ou não. Esta task
adiciona o campo `status` ao tipo `GymSummary` (usado pelo tipo `Gym` de
`apps/frontend/src/features/gyms/api/index.ts`) e troca esse selo para "Desativada" quando
`gym.status === "deactivated"` **e** o contexto é de admin — o mesmo sinal `adminEditHref`
truthy já usado por esses dois componentes para decidir se mostram o botão de editar (só um
admin recebe `adminEditHref`; um usuário comum nunca vê uma academia desativada na lista, já
que os backends de listagem/busca — Tasks 13/14 — filtram isso antes de chegar ao frontend).

`status` é declarado como campo **opcional** em `GymSummary` (`status?: "activated" |
"deactivated"`), não obrigatório — o mesmo tratamento já dado a `cnpj?: string` nesse mesmo
tipo. Isso evita quebrar em tempo de compilação todas as fixtures de teste já existentes em
`gym-card.test.tsx`, `gym-row.test.tsx`, `gym-results.test.tsx` e outras que constroem objetos
`Gym` sem esse campo; a ausência de `status` é tratada como "ativada" (nenhum selo alterado).

**Nota de coordenação:** a Task 18 (Wave 7, roda depois desta) também pode precisar de
`gym.status` na página de detalhe. Se a Task 18 já tiver adicionado `status` a `GymSummary`
quando esta Task 19 rodar (ordem de execução invertida), não duplicar o campo — apenas
confirmar que a assinatura é exatamente `status?: "activated" | "deactivated"` e prosseguir
direto para a mudança em `gym-card.tsx`/`gym-row.tsx`.

## Arquivos

- Modify: `apps/frontend/src/features/gyms/api/extended-paths.ts`
- Modify: `apps/frontend/src/features/gyms/components/gym-card.tsx`
- Modify: `apps/frontend/src/features/gyms/components/gym-row.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-card.test.tsx`
- Test: `apps/frontend/src/features/gyms/components/gym-row.test.tsx`

### Conformidade com as Skills Padrão

- `typescript-advanced`: campo opcional `status?: "activated" | "deactivated"` em
  `GymSummary`, sem quebrar os call-sites/fixtures existentes.
- `vitest`: novos casos de teste adicionados aos arquivos já existentes
  `gym-card.test.tsx`/`gym-row.test.tsx`, seguindo o padrão real de `renderWithProviders` +
  `screen.getByText`/`getByTestId` já usado neles.
- `no-workarounds`: a decisão "mostrar o selo de desativada" depende exclusivamente de
  `adminEditHref` (sinal já existente de contexto admin) e `gym.status`, sem introduzir uma
  nova prop redundante (`isAdmin`) quando `adminEditHref` já cumpre esse papel no componente.

## Passos

- **Step 1: Escrever o teste que falha**

```typescript
// gym-card.test.tsx — adicionar dentro do describe("GymCard VOLT", ...) já existente
test("mostra o selo 'Desativada' quando a academia está desativada e adminEditHref é informado", () => {
	const deactivatedGym: Gym = { ...gym, status: "deactivated" }
	renderWithProviders(
		<GymCard gym={deactivatedGym} adminEditHref="/admin/academias/g1/editar" />,
	)
	expect(screen.getByText("Desativada")).toBeInTheDocument()
	expect(screen.queryByText("Disponível")).not.toBeInTheDocument()
})

test("não mostra o selo 'Desativada' sem adminEditHref, mesmo com status desativado", () => {
	const deactivatedGym: Gym = { ...gym, status: "deactivated" }
	renderWithProviders(<GymCard gym={deactivatedGym} />)
	expect(screen.queryByText("Desativada")).not.toBeInTheDocument()
	expect(screen.getByText("Disponível")).toBeInTheDocument()
})

test("mostra 'Disponível' quando status é 'activated', mesmo para admin", () => {
	const activeGym: Gym = { ...gym, status: "activated" }
	renderWithProviders(
		<GymCard gym={activeGym} adminEditHref="/admin/academias/g1/editar" />,
	)
	expect(screen.getByText("Disponível")).toBeInTheDocument()
	expect(screen.queryByText("Desativada")).not.toBeInTheDocument()
})
```

```typescript
// gym-row.test.tsx — adicionar dentro do describe("GymRow VOLT", ...) já existente
test("mostra o selo 'Desativada' quando a academia está desativada e adminEditHref é informado", () => {
	const deactivatedGym: Gym = { ...gym, status: "deactivated" }
	renderWithProviders(
		<GymRow gym={deactivatedGym} adminEditHref="/admin/academias/g1/editar" />,
	)
	expect(screen.getByText("Desativada")).toBeInTheDocument()
	expect(screen.queryByText("Disponível")).not.toBeInTheDocument()
})

test("não mostra o selo 'Desativada' sem adminEditHref, mesmo com status desativado", () => {
	const deactivatedGym: Gym = { ...gym, status: "deactivated" }
	renderWithProviders(<GymRow gym={deactivatedGym} />)
	expect(screen.queryByText("Desativada")).not.toBeInTheDocument()
	expect(screen.getByText("Disponível")).toBeInTheDocument()
})
```

- **Step 2: Rodar o teste e confirmar que falha**

Run: `pnpm --filter frontend test:run -- gym-card gym-row`
Expected: FAIL — `status` ainda não existe em `GymSummary` (erro de tipo em `{ ...gym, status:
"deactivated" }`) e o selo "Desativada" nunca é renderizado.

- **Step 3: Implementação mínima**

`extended-paths.ts` — trecho atual de `GymSummary`:
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
}
```

`GymSummary` após a mudança (adiciona `status` opcional):
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

`gym-card.tsx` — trecho atual do selo, dentro de `GymCard`:
```typescript
					<span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-[11.5px] font-semibold text-subtle backdrop-blur">
						<span className="h-1.5 w-1.5 rounded-full bg-current" /> Disponível
					</span>
```

Trecho após a mudança:
```typescript
					{adminEditHref && gym.status === "deactivated" ? (
						<span
							data-testid={`gym-card-status-${gym.id}`}
							className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-destructive/90 px-2.5 py-1 text-[11.5px] font-semibold text-destructive-foreground backdrop-blur"
						>
							<span className="h-1.5 w-1.5 rounded-full bg-current" /> Desativada
						</span>
					) : (
						<span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1 text-[11.5px] font-semibold text-subtle backdrop-blur">
							<span className="h-1.5 w-1.5 rounded-full bg-current" /> Disponível
						</span>
					)}
```

`gym-row.tsx` — trecho atual do selo, dentro de `GymRow`:
```typescript
						<span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-semibold text-subtle">
							<span className="h-1.5 w-1.5 rounded-full bg-current" />{" "}
							Disponível
						</span>
```

Trecho após a mudança:
```typescript
						{adminEditHref && gym.status === "deactivated" ? (
							<span
								data-testid={`gym-row-status-${gym.id}`}
								className="inline-flex items-center gap-1.5 rounded-full bg-destructive/90 px-2 py-0.5 text-[11px] font-semibold text-destructive-foreground"
							>
								<span className="h-1.5 w-1.5 rounded-full bg-current" />{" "}
								Desativada
							</span>
						) : (
							<span className="inline-flex items-center gap-1.5 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-semibold text-subtle">
								<span className="h-1.5 w-1.5 rounded-full bg-current" />{" "}
								Disponível
							</span>
						)}
```

- **Step 4: Rodar o teste e confirmar que passa**

Run: `pnpm --filter frontend test:run -- gym-card gym-row`
Expected: PASS — os 5 novos casos e todos os já existentes nos dois arquivos passam.

- **Step 5: Commit**

```bash
git add apps/frontend/src/features/gyms/api/extended-paths.ts \
  apps/frontend/src/features/gyms/components/gym-card.tsx \
  apps/frontend/src/features/gyms/components/gym-card.test.tsx \
  apps/frontend/src/features/gyms/components/gym-row.tsx \
  apps/frontend/src/features/gyms/components/gym-row.test.tsx
git commit -m "feat(gym): show 'Desativada' badge for admins on deactivated gyms"
```

## Critérios de Sucesso

- `GymSummary.status?: "activated" | "deactivated"` foi adicionado sem quebrar nenhuma
  fixture de teste existente que não define esse campo (FR-012).
- `GymCard`/`GymRow` mostram "Desativada" apenas quando `adminEditHref` está presente **e**
  `gym.status === "deactivated"`.
- Um usuário comum (sem `adminEditHref`) nunca vê o selo "Desativada", mesmo que
  `gym.status` seja `"deactivated"` (defesa em profundidade, já que o backend não deveria
  entregar essa academia a ele).
- Toda academia ativada continua mostrando "Disponível", independentemente do contexto ser
  admin ou não.
- `pnpm --filter frontend test:run -- gym-card gym-row` passa sem regressão nos casos já
  existentes.
