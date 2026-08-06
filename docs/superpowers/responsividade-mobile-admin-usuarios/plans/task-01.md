# Task 1: Modais: respiro lateral incondicional e contenção vertical no `DialogContent` e `AlertDialogContent`

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/responsividade-mobile-admin-usuarios-design.md`
**Tier:** cheap
**Depends on:** N/A

## Visão Geral

Hoje `DialogContent` e `AlertDialogContent` (dois componentes base independentes, cada um com sua própria string de classes) usam `w-full` sem margem lateral — em telas pequenas o card encosta nas bordas esquerda/direita, incluindo o modal de edição/detalhes de usuário em `/admin/usuarios` (`Dialog`) e os diálogos de confirmação de status (`AlertDialog`). Troca `w-full` por `w-[calc(100%-2rem)]` nos dois componentes base, dando 16px de respiro de cada lado sempre que a viewport for menor que o `max-w-*` de cada consumidor (D1 do spec: `width` e `max-width` competem nativamente — o menor vence — então nenhum breakpoint condicional é necessário). Mudança feita na base de cada componente, não em cada consumidor, porque o bug lateral é o mesmo padrão nos dois arquivos.

Adicionalmente, só o `DialogContent` recebe `max-h-[calc(100dvh-2rem)] overflow-y-auto`: sem isso, um modal com conteúdo mais alto que a viewport (ex. o painel de edição de usuário) empurra o botão de fechar (`DialogPrimitive.Close`, posicionado `absolute right-4 top-4` dentro do próprio conteúdo) para fora da área visível, tornando-o inalcançável sem scroll da página inteira. O `AlertDialogContent` não recebe essa mudança — diálogos de confirmação são curtos por natureza e não têm esse risco (D1 do spec).

## Arquivos

- Modify: `apps/frontend/src/components/ui/dialog.tsx`
- Modify: `apps/frontend/src/components/ui/alert-dialog.tsx`
- Test: `apps/frontend/src/components/ui/dialog.test.tsx`
- Test: `apps/frontend/src/components/ui/alert-dialog.test.tsx` (novo arquivo — `AlertDialogContent` não tem teste hoje)

### Conformidade com as Skills Padrão

- `tailwindcss`: a mudança troca `w-full` por um arbitrary value (`w-[calc(100%-2rem)]`) dentro de um `cn(...)` já existente — a skill cobre convenções de arbitrary values e interação `width`/`max-width` no Tailwind v4.
- `shadcn`: `DialogContent` é um wrapper de `@radix-ui/react-dialog` no padrão compound-component (`forwardRef`, `cn`, `className` mesclável) típico de shadcn/ui — a skill orienta a manter esse padrão ao editar o componente base.
- `test-antipatterns`: a task ajusta um teste de classes CSS existente em vez de criar um novo — a skill orienta a manter a asserção específica (classe exata) em vez de testes frágeis por snapshot completo.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/responsividade-mobile-admin-usuarios-visual.md` (seção "Modal de usuário") — baseline: `w-[calc(100%-2rem)] mx-auto rounded-xl border border-border bg-card p-6`.
- **Fonte de design original:** nenhuma; layout definido apenas via mockup do companion visual desta sessão, a partir de screenshots reais do app.
- **Confirmar com o usuário:** não aplicável — spec e mockup já registram que não há fonte de design original (Figma/export); nada a confirmar além disso.
- **Ferramentas de fidelidade visual (descobrir no ambiente):** nenhuma ferramenta de design-to-code dedicada configurada neste repo; usar a skill `playwright-cli` (ou `claude-in-chrome`, se disponível na sessão) para abrir `pnpm --filter frontend dev` e conferir visualmente o resultado nos consumidores conhecidos de `Dialog` e `AlertDialog` — construção manual a partir do mockup.
- **Decisões visuais já tomadas (não refazer):** `w-[calc(100%-2rem)]` sem breakpoint `sm:` condicional (D1), nos dois componentes; mudança neutra em telas onde o `max-w-*` de cada consumidor já é o fator limitante. `max-h-[calc(100dvh-2rem)] overflow-y-auto` só no `DialogContent` (confirmações do `AlertDialog` são curtas, não precisam de contenção vertical). Consumidores conhecidos e seus `max-w-*`: `Dialog` — `apps/frontend/src/features/gyms/components/gym-image-edit-overlay.tsx` (`sm:max-w-md`), `apps/frontend/src/features/profile/components/EditProfileModal.tsx` (`sm:max-w-md`), `apps/frontend/src/features/admin/components/user-detail/user-detail-container.tsx` (`max-w-2xl`); `AlertDialog` — `apps/frontend/src/features/gyms/components/gym-status-confirmation-dialog.tsx`, `apps/frontend/src/features/admin/components/bulk-status-confirmation-dialog.tsx`, `apps/frontend/src/features/admin/components/user-detail/confirmation-dialogs.tsx` (todos `max-w-md`, o default do componente).

## Passos

- **Step 0: Confirmar fonte de design e ferramentas de fidelidade**

Releia a subseção `### Fidelidade Visual` acima. Não há fonte de design original a confirmar (já registrado no spec). Verifique se `playwright-cli` ou `claude-in-chrome` estão disponíveis nesta sessão; se nenhuma estiver, a verificação do Step 7 abaixo é feita rodando `pnpm --filter frontend dev` e inspecionando manualmente no navegador.

- **Step 1: Escrever os testes que falham — `dialog.test.tsx`**

Em `apps/frontend/src/components/ui/dialog.test.tsx`, substitua o teste `"DialogContent deve ter rounded-xl e shadow-md"` por:

```tsx
test("DialogContent deve ter rounded-xl, shadow-md, respiro lateral e contenção vertical", () => {
	render(
		<Dialog open>
			<DialogContent>conteúdo</DialogContent>
		</Dialog>,
	)
	const content = screen.getByRole("dialog")
	expect(content).toHaveClass("rounded-xl")
	expect(content).toHaveClass("shadow-md")
	expect(content).toHaveClass("w-[calc(100%-2rem)]")
	expect(content).toHaveClass("max-h-[calc(100dvh-2rem)]")
	expect(content).toHaveClass("overflow-y-auto")
})
```

- **Step 2: Escrever os testes que falham — `alert-dialog.test.tsx` (novo arquivo)**

Crie `apps/frontend/src/components/ui/alert-dialog.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogTitle,
} from "./alert-dialog"

describe("AlertDialog", () => {
	test("AlertDialogContent deve ter rounded-xl, shadow-md e respiro lateral (w-[calc(100%-2rem)])", () => {
		render(
			<AlertDialog open>
				<AlertDialogContent>
					<AlertDialogTitle>Confirmar</AlertDialogTitle>
					<AlertDialogDescription>Tem certeza?</AlertDialogDescription>
				</AlertDialogContent>
			</AlertDialog>,
		)
		const content = screen.getByRole("alertdialog")
		expect(content).toHaveClass("rounded-xl")
		expect(content).toHaveClass("shadow-md")
		expect(content).toHaveClass("w-[calc(100%-2rem)]")
	})
})
```

- **Step 3: Rodar os testes para confirmar que falham**

Run: `pnpm --filter frontend exec vitest run src/components/ui/dialog.test.tsx src/components/ui/alert-dialog.test.tsx`
Expected: FAIL — em `dialog.test.tsx`, o teste renomeado falha em `w-[calc(100%-2rem)]`, `max-h-[calc(100dvh-2rem)]` e `overflow-y-auto` (nenhuma das três existe ainda); os outros 2 testes do arquivo (abrir/fechar via trigger, fechar com Escape) continuam passando. Em `alert-dialog.test.tsx` (arquivo novo), o único teste falha em `w-[calc(100%-2rem)]` porque `AlertDialogContent` ainda usa `w-full`.

- **Step 4: Implementar a troca de classes no `dialog.tsx`**

Em `apps/frontend/src/components/ui/dialog.tsx`, no `DialogContent`, troque a string de classes:

```tsx
const DialogContent = forwardRef<
	ElementRef<typeof DialogPrimitive.Content>,
	ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
	<DialogPortal>
		<DialogOverlay />
		<DialogPrimitive.Content
			ref={ref}
			className={cn(
				"fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-lg max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto border border-border bg-card p-6 rounded-xl shadow-md",
				className,
			)}
			{...props}
		>
			{children}
			<DialogPrimitive.Close
				className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
				aria-label="Close"
			>
				<X className="h-4 w-4" />
			</DialogPrimitive.Close>
		</DialogPrimitive.Content>
	</DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName
```

(Mudanças: `w-full` → `w-[calc(100%-2rem)]`, e adiciona `max-h-[calc(100dvh-2rem)]` + `overflow-y-auto` na string de classes; nada mais no arquivo muda.)

- **Step 5: Implementar a troca de classe no `alert-dialog.tsx`**

Em `apps/frontend/src/components/ui/alert-dialog.tsx`, no `AlertDialogContent`, troque a string de classes:

```tsx
const AlertDialogContent = forwardRef<
	ElementRef<typeof AlertDialogPrimitive.Content>,
	ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
	<AlertDialogPortal>
		<AlertDialogOverlay />
		<AlertDialogPrimitive.Content
			ref={ref}
			className={cn(
				"fixed left-1/2 top-1/2 z-50 grid w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl shadow-md border border-border bg-card p-6",
				className,
			)}
			{...props}
		/>
	</AlertDialogPortal>
))
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName
```

(Única mudança: `w-full` → `w-[calc(100%-2rem)]` na string de classes; nada mais no arquivo muda. Sem `max-h`/`overflow` — ver Visão Geral.)

- **Step 6: Rodar os testes para confirmar que passam**

Run: `pnpm --filter frontend exec vitest run src/components/ui/dialog.test.tsx src/components/ui/alert-dialog.test.tsx`
Expected: PASS — os 3 testes de `dialog.test.tsx` e o 1 teste de `alert-dialog.test.tsx` passam.

- **Step 7: Verificação manual de neutralidade visual e contenção vertical**

Não há teste automatizado que cubra neutralidade visual entre viewports (classe CSS de `max-width` competindo com `width` não é verificável de forma confiável em `happy-dom`). Rode `pnpm --filter frontend dev` e abra, em 414px, 560px e ≥768px:
1. Editar/detalhe de usuário em `/admin/usuarios` (`user-detail-container.tsx`, `Dialog`, `max-w-2xl`) — confirme também que, com o painel de edição aberto e o teclado virtual sobreposto (ou a janela reduzida em altura), o botão de fechar continua alcançável via scroll dentro do modal.
2. Editar perfil (`EditProfileModal.tsx`, `Dialog`, `sm:max-w-md`)
3. Overlay de imagem de academia (`gym-image-edit-overlay.tsx`, `Dialog`, `sm:max-w-md`)
4. Confirmação de status de academia (`gym-status-confirmation-dialog.tsx`, `AlertDialog`)
5. Confirmação de ação em massa de usuários (`bulk-status-confirmation-dialog.tsx`, `AlertDialog`)
6. Confirmações de detalhe de usuário (`confirmation-dialogs.tsx`, `AlertDialog`)

Confirme: em todas as larguras o card não encosta nas bordas (≥16px de respiro), e em telas largas (≥768px) o layout de cada modal é visualmente idêntico ao anterior à mudança (o `max-w-*` de cada um continua governando a largura final).

- **Step 8: Commit**

```bash
git add apps/frontend/src/components/ui/dialog.tsx apps/frontend/src/components/ui/dialog.test.tsx apps/frontend/src/components/ui/alert-dialog.tsx apps/frontend/src/components/ui/alert-dialog.test.tsx
git commit -m "fix(frontend): adiciona respiro lateral ao DialogContent/AlertDialogContent e contenção vertical ao DialogContent"
```

## Critérios de Sucesso

- `DialogContent` e `AlertDialogContent` usam `w-[calc(100%-2rem)]` em vez de `w-full`, sem breakpoint condicional.
- `DialogContent` também usa `max-h-[calc(100dvh-2rem)] overflow-y-auto`; `AlertDialogContent` não (confirmações são curtas, D1 do spec).
- O teste de classes do `dialog.test.tsx` cobre `w-[calc(100%-2rem)]`, `max-h-[calc(100dvh-2rem)]` e `overflow-y-auto`, além de `rounded-xl`/`shadow-md`. O novo `alert-dialog.test.tsx` cobre `w-[calc(100%-2rem)]` além de `rounded-xl`/`shadow-md`.
- Os 3 consumidores conhecidos do `Dialog` e os 3 do `AlertDialog` permanecem visualmente neutros em telas ≥768px, verificado manualmente.
- `pnpm --filter frontend exec vitest run src/components/ui/dialog.test.tsx src/components/ui/alert-dialog.test.tsx` passa com os 4 testes.
