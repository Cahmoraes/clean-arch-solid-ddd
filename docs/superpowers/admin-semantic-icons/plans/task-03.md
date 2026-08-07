# Task 3: TooltipProvider na árvore de providers

**Status:** PENDING
**PRD:** ../prd/prd-admin-semantic-icons.md
**Spec:** ../specs/admin-semantic-icons-design.md
**Tier:** cheap
**Depends on:** task-01

## Visão Geral

Montar `TooltipProvider` (de `@/components/ui/tooltip`, task 1) como camada mais externa na árvore de providers da aplicação (`apps/frontend/src/app/providers.tsx`) e no helper de testes compartilhado (`apps/frontend/src/test/render.tsx`), para que o Radix Tooltip funcione tanto em runtime quanto nos testes das tasks 6, 7 e 8 (que usam `renderWithProviders`, não `providers.tsx` diretamente). Sem FR direto — infraestrutura necessária para as tasks 6, 7 e 8 funcionarem (botões ícone-só com tooltip).

## Arquivos

- Modify: `apps/frontend/src/app/providers.tsx`
- Modify: `apps/frontend/src/test/render.tsx`
- Modify: `apps/frontend/src/test/render.test.tsx`

### Conformidade com as Skills Padrão

- `vercel-composition-patterns`: `TooltipProvider` é um Context Provider — a task envolve empilhar corretamente providers sem quebrar a árvore existente.
- `vercel-react-best-practices`: posicionamento de providers na árvore Next.js App Router (Client Component `providers.tsx` sob o layout raiz).

## Passos

- **Step 1: Write the failing test**

Em `apps/frontend/src/test/render.test.tsx`, adicionar um teste que prova que `renderWithProviders` já envolve com `TooltipProvider` — sem isso o Radix Tooltip não abre (e lança erro se usado fora de um `Provider`):

```tsx
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip"
```

Adicionar este `import` no topo do arquivo (junto aos existentes) e este teste dentro do `describe("renderWithProviders", ...)`:

```tsx
	test("envolve o componente em um TooltipProvider (tooltip abre no hover)", async () => {
		const user = userEvent.setup()
		renderWithProviders(
			<Tooltip>
				<TooltipTrigger>Ação</TooltipTrigger>
				<TooltipContent>Dica</TooltipContent>
			</Tooltip>,
		)
		await user.hover(screen.getByText("Ação"))
		expect(await screen.findByText("Dica")).toBeInTheDocument()
	})
```

Adicionar também o import de `userEvent`:

```tsx
import userEvent from "@testing-library/user-event"
```

- **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend exec vitest run src/test/render.test.tsx`
Expected: FAIL — o Radix Tooltip lança erro (`Tooltip` requer `TooltipProvider` no contexto) ou o conteúdo "Dica" nunca aparece, porque `renderWithProviders` ainda não envolve com `TooltipProvider`.

- **Step 3: Write minimal implementation**

Em `apps/frontend/src/test/render.tsx`, importar `TooltipProvider` e envolver o `Wrapper`:

```tsx
import { TooltipProvider } from "@/components/ui/tooltip"
```

Adicionar este import junto aos existentes, e alterar o `Wrapper` interno de `renderWithProviders`:

```tsx
	function Wrapper({ children }: ProviderProps): ReactElement {
		return (
			<QueryClientProvider client={queryClient}>
				<TooltipProvider>
					<Suspense fallback={null}>{children}</Suspense>
				</TooltipProvider>
			</QueryClientProvider>
		)
	}
```

- **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend exec vitest run src/test/render.test.tsx`
Expected: PASS (2 testes: o probe de `QueryClientProvider` existente + o novo teste de `TooltipProvider`)

- **Step 5: Wire TooltipProvider na árvore de runtime**

Sem teste unitário isolado para este passo: o Radix `Provider` não expõe estado observável em si mesmo (não há nada para asserir além do que já foi coberto pelo Step 1-4 via `renderWithProviders`); a cobertura real deste wiring em runtime acontece transitivamente pelos testes de tooltip das tasks 6, 7 e 8, que dependem do `TooltipProvider` estar presente na árvore renderizada pelos componentes que eles montam via `renderWithProviders` (já coberto acima) e, em produção, pelo `providers.tsx` abaixo.

Editar `apps/frontend/src/app/providers.tsx`: importar `TooltipProvider` e envolver o retorno de `Providers` com ele, como camada mais externa, sem remover ou reordenar os providers existentes:

```tsx
import { TooltipProvider } from "@/components/ui/tooltip"
```

Adicionar este import junto aos existentes, e alterar o `return` de `Providers`:

```tsx
export function Providers({ children }: { children: ReactNode }) {
	const [queryClient] = useState(() => createQueryClient())

	return (
		<TooltipProvider>
			<GoogleOAuthProvider clientId={googleClientId}>
				<QueryClientProvider client={queryClient}>
					<AuthProvider>{children}</AuthProvider>
				</QueryClientProvider>
			</GoogleOAuthProvider>
		</TooltipProvider>
	)
}
```

- **Step 6: Commit** *(esta task participa da Wave 2 em paralelo com a task 4, em arquivos distintos; se seu prompt de execução indicar que você é um dos implementadores de uma wave paralela em árvore compartilhada, pule este passo e apenas reporte os arquivos criados/alterados — o orquestrador comita na barreira de integração da wave.)*

```bash
git add apps/frontend/src/app/providers.tsx apps/frontend/src/test/render.tsx apps/frontend/src/test/render.test.tsx
git commit -m "feat: monta TooltipProvider na árvore de providers e no helper de teste"
```

## Critérios de Sucesso

- `apps/frontend/src/app/providers.tsx` envolve a árvore existente com `TooltipProvider` como camada mais externa, sem remover ou reordenar `GoogleOAuthProvider`/`QueryClientProvider`/`AuthProvider`.
- `renderWithProviders` (em `apps/frontend/src/test/render.tsx`) envolve os componentes testados com `TooltipProvider`, permitindo que os testes das tasks 6, 7 e 8 usem `Tooltip`/`TooltipTrigger`/`TooltipContent` sem precisar aninhar seu próprio `TooltipProvider`.
- O teste existente de `QueryClientProvider` em `render.test.tsx` continua passando sem alteração de asserção.
