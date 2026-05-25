# Task 3: Card, Dialog, AlertDialog, Skeleton — elevação e radius

**Status:** DONE
**PRD:** N/A
**Spec:** `../specs/design-system-migration-design.md`

## Visão Geral

Adicionar sombra Level 1 (`shadow-sm`) em cards, sombra Level 2 (`shadow-md`) e `rounded-xl` em dialogs/alert-dialogs. Atualizar `Skeleton` para usar `bg-muted` como cor base. Esses componentes não mudam geometria de forma radical — a mudança principal é a introdução da elevação via sombra.

## Arquivos

- Modify: `apps/frontend/src/components/ui/dialog.tsx`
- Modify: `apps/frontend/src/components/ui/dialog.test.tsx`
- Modify: `apps/frontend/src/components/ui/alert-dialog.tsx`
- Modify: `apps/frontend/src/components/ui/skeleton.tsx`
- Inspect + Modify: `apps/frontend/src/components/ui/form-field.tsx` (se usa card-like styling)

### Conformidade com as Skills Padrão

- shadcn: Dialog é um Radix primitive — só alterar as classes CSS, nunca a lógica do primitive
- tailwindcss: `shadow-sm` e `shadow-md` mapeiam para as variáveis `--shadow-sm` e `--shadow-md` definidas no Task 1

## Passos

- [ ] **Step 1: Verificar o teste do Dialog para entender as asserções atuais**

Ler `apps/frontend/src/components/ui/dialog.test.tsx` para identificar se há asserções de `rounded-` ou `shadow-`. Adicionar teste se necessário:

```typescript
test("DialogContent deve ter rounded-xl e shadow-md", () => {
  render(
    <Dialog open>
      <DialogContent>conteúdo</DialogContent>
    </Dialog>
  )
  const content = screen.getByRole("dialog")
  expect(content).toHaveClass("rounded-xl")
  expect(content).toHaveClass("shadow-md")
})
```

- [ ] **Step 2: Executar o teste para confirmar falha**

```bash
pnpm --filter frontend test -- -t "DialogContent deve ter rounded-xl"
```

Esperado: FAIL (implementação atual não tem `rounded-xl` nem `shadow-md`).

- [ ] **Step 3: Atualizar dialog.tsx**

Localizar o `DialogContent` em `apps/frontend/src/components/ui/dialog.tsx`. Adicionar `rounded-xl shadow-md` às classes do content. O componente usa Radix `DialogPrimitive.Content` — apenas altere as classes CSS do forwardRef wrapper:

```typescript
// Antes (classe típica):
// "fixed left-[50%] top-[50%] z-50 ... rounded-lg shadow-lg ..."

// Depois — substituir rounded-lg e shadow-lg por:
// "fixed left-[50%] top-[50%] z-50 ... rounded-xl shadow-md ..."
```

A classe exata depende do conteúdo atual do arquivo. Abrir o arquivo e localizar o `forwardRef` de `DialogContent`, depois substituir qualquer `rounded-*` por `rounded-xl` e qualquer `shadow-*` por `shadow-md`.

- [ ] **Step 4: Executar o teste para confirmar aprovação**

```bash
pnpm --filter frontend test -- -t "DialogContent deve ter rounded-xl"
```

Esperado: PASS.

- [ ] **Step 5: Atualizar alert-dialog.tsx**

Abrir `apps/frontend/src/components/ui/alert-dialog.tsx`. Localizar o `AlertDialogContent` (forwardRef sobre `AlertDialogPrimitive.Content`). Aplicar as mesmas classes: substituir `rounded-lg` por `rounded-xl` e `shadow-lg` por `shadow-md`.

Não há teste separado para `AlertDialog` — a mudança é idêntica ao `Dialog` e será validada pelo build + tsc.

- [ ] **Step 6: Atualizar skeleton.tsx**

Abrir `apps/frontend/src/components/ui/skeleton.tsx`. O componente típico usa `bg-muted` ou `animate-pulse`. Garantir que usa `bg-muted` (não `bg-accent` ou palette token estático):

```typescript
import { cn } from "@/lib/cn"

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn("animate-pulse rounded-md bg-muted", className)}
			{...props}
		/>
	)
}
```

Se já estiver correto, nenhuma alteração é necessária — apenas confirmar.

- [ ] **Step 7: Verificar form-field.tsx**

Abrir `apps/frontend/src/components/ui/form-field.tsx` e verificar se usa algum token de paleta estático (ex.: `text-silver`, `bg-pure-white`). Se sim, substituir pelo equivalente semântico. Se usa apenas tokens semânticos, nenhuma alteração é necessária.

- [ ] **Step 8: Verificar lint, tipos e testes**

```bash
pnpm --filter frontend lint:fix
pnpm --filter frontend tsc:check
pnpm --filter frontend test
```

Esperado: zero erros e todos os testes passam.

- [ ] **Step 9: Commit**

```bash
git add apps/frontend/src/components/ui/dialog.tsx \
        apps/frontend/src/components/ui/dialog.test.tsx \
        apps/frontend/src/components/ui/alert-dialog.tsx \
        apps/frontend/src/components/ui/skeleton.tsx
git commit -m "feat(frontend/ui): adicionar elevação shadow-md e rounded-xl em Dialog e AlertDialog"
```

## Critérios de Sucesso

- `DialogContent` e `AlertDialogContent` usam `rounded-xl` e `shadow-md`
- `Skeleton` usa `bg-muted` como cor base
- Nenhum componente usa tokens de paleta estáticos (`bg-pure-white`, `text-silver`, etc.)
- Todos os testes passam, lint e tsc sem erros
