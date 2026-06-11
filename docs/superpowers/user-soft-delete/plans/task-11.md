# Task 11: `DeleteConfirmationDialog` em `confirmation-dialogs.tsx` [RF-017]

**Status:** DONE
**PRD:** `../prd/prd-user-soft-delete.md`
**Spec:** `../specs/user-soft-delete-design.md`
**Depends on:** N/A

## Visão Geral

Adiciona um diálogo de confirmação destrutivo `DeleteConfirmationDialog` ao arquivo de diálogos do painel admin, seguindo exatamente o padrão `AlertDialog` (shadcn/ui) já usado por `SuspendConfirmationDialog`. O texto é enfático: deixa claro que a ação não pode ser desfeita pela interface. Este é um componente puro de apresentação — não conhece hooks nem mutations (a orquestração entra na task-12).

## Arquivos

- Modify: `apps/frontend/src/features/admin/components/user-detail/confirmation-dialogs.tsx`

### Conformidade com as Skills Padrão

- use skill `shadcn`: reutilize os primitivos `AlertDialog*` já importados no arquivo; não reescreva o componente base.
- use skill `code-style`: componente de apresentação puro, props explícitas, sem lógica de negócio.

## Passos

- **Step 1: Adicionar a interface e o componente**

Em `apps/frontend/src/features/admin/components/user-detail/confirmation-dialogs.tsx`, ao final do arquivo (após os diálogos existentes), adicione:

```typescript
export interface DeleteConfirmationDialogProps {
	open: boolean
	userName: string
	onOpenChange: (open: boolean) => void
	isPending: boolean
	isDeleting: boolean
	onConfirm: (event: MouseEvent<HTMLButtonElement>) => void
}

export function DeleteConfirmationDialog({
	open,
	userName,
	onOpenChange,
	isPending,
	isDeleting,
	onConfirm,
}: DeleteConfirmationDialogProps) {
	return (
		<AlertDialog open={open} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
					<AlertDialogDescription>
						Tem certeza que deseja excluir {userName}? Esta ação não pode ser
						desfeita pela interface e o usuário perderá o acesso imediatamente.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
					<AlertDialogAction asChild>
						<Button
							variant="destructive"
							onClick={onConfirm}
							disabled={isPending}
							aria-busy={isDeleting}
						>
							{isDeleting ? "Excluindo..." : "Confirmar exclusão"}
						</Button>
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
```

- **Step 2: Confirmar imports**

O arquivo já importa `MouseEvent`, `AlertDialog`, `AlertDialogAction`, `AlertDialogCancel`, `AlertDialogContent`, `AlertDialogDescription`, `AlertDialogFooter`, `AlertDialogHeader`, `AlertDialogTitle` e `Button` (usados por `SuspendConfirmationDialog`). Nenhum import novo é necessário. Verifique visualmente o topo do arquivo.

- **Step 3: Validar lint e tipos**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check`
Expected: zero problemas.

- **Step 4: Commit**

```bash
git add apps/frontend/src/features/admin/components/user-detail/confirmation-dialogs.tsx
git commit -m "feat(frontend): add DeleteConfirmationDialog for user soft delete"
```

## Critérios de Sucesso

- `DeleteConfirmationDialog` existe e segue o padrão `AlertDialog` dos diálogos irmãos (RF-017).
- O texto é enfático sobre a irreversibilidade pela interface.
- Botão de confirmação usa `variant="destructive"`, reflete `isDeleting` e respeita `isPending`.
- `lint:fix` e `tsc:check` passam.
