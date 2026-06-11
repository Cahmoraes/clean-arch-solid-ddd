# Task 12: Integrar exclusão no painel — `useUserDetailActions` + `user-actions-footer` + fechar painel + testes [RF-016, RF-019, RF-018]

**Status:** DONE
**PRD:** `../prd/prd-user-soft-delete.md`
**Spec:** `../specs/user-soft-delete-design.md`
**Depends on:** task-10, task-11

## Visão Geral

Liga a ponta solta do frontend: integra `useDeleteUser` no orquestrador `useUserDetailActions` (estado do diálogo, flag `isDeleting`, permissão `canDelete`, `onConfirmDelete`), habilita o botão "Excluir" no `user-actions-footer` (removendo o estado desabilitado e o tooltip "disponível em breve"), oculta-o contextualmente para self/super admin (RF-019), renderiza o `DeleteConfirmationDialog` no painel e fecha o painel após sucesso. Atualiza os testes do footer.

## Arquivos

- Modify: `apps/frontend/src/features/admin/components/user-detail/use-user-detail-actions.ts`
- Modify: `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.test.tsx`

### Conformidade com as Skills Padrão

- use skill `code-style`: espelhe os padrões existentes de `useUserDetailActions` (permissões, flags, confirm state).
- use skill `vercel-react-best-practices`: evite re-renderizações desnecessárias; mantenha callbacks estáveis no padrão já usado.
- use skill `test-antipatterns`: teste comportamento de UI (botão habilitado abre confirmação; oculto para self/super admin).

## Passos

- **Step 1: Atualizar o teste do footer (que falha)**

Em `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.test.tsx`, ajuste `baseProps` para incluir as novas props e troque o teste de "Excluir desabilitado" por habilitado:

```tsx
function baseProps() {
	return {
		user: buildUser(),
		permissions: {
			canActivate: false,
			canSuspend: true,
			canPromoteToAdmin: true,
			canDemoteFromAdmin: false,
			canDelete: true,
			isLocked: false,
		},
		flags: {
			isPending: false,
			isActivating: false,
			isSuspending: false,
			isPromoting: false,
			isDemoting: false,
			isDeleting: false,
		},
		onEdit: vi.fn(),
		onActivate: vi.fn(),
		onOpenSuspend: vi.fn(),
		onOpenPromote: vi.fn(),
		onOpenDemote: vi.fn(),
		onOpenDelete: vi.fn(),
	}
}
```

Substitua o teste que exigia o botão desabilitado por:

```tsx
test("habilita o botão Excluir e dispara onOpenDelete", async () => {
	const user = userEvent.setup()
	const props = baseProps()
	render(<UserActionsFooter {...props} />)
	const button = screen.getByRole("button", { name: /excluir/i })
	expect(button).toBeEnabled()
	await user.click(button)
	expect(props.onOpenDelete).toHaveBeenCalledTimes(1)
})

test("oculta o botão Excluir quando canDelete é falso", () => {
	const props = baseProps()
	props.permissions.canDelete = false
	render(<UserActionsFooter {...props} />)
	expect(
		screen.queryByRole("button", { name: /excluir/i }),
	).not.toBeInTheDocument()
})
```

- **Step 2: Rodar e confirmar a falha**

Run: `pnpm --filter frontend test -- -t "UserActionsFooter"`
Expected: FAIL — `onOpenDelete`/`canDelete`/`isDeleting` ainda não existem; o botão está desabilitado.

- **Step 3: Atualizar o `user-actions-footer.tsx`**

Adicione `isDeleting` a `ActionFlags`, `canDelete` é lido de `permissions`, `onOpenDelete` às props, e troque o botão fixo "Excluir" desabilitado por uma ação contextual. Edições:

```typescript
interface ActionFlags {
	isPending: boolean
	isActivating: boolean
	isSuspending: boolean
	isPromoting: boolean
	isDemoting: boolean
	isDeleting: boolean
}

export interface UserActionsFooterProps {
	user: AdminUser
	permissions: UserDetailPermissions
	flags: ActionFlags
	onEdit: () => void
	onActivate: () => void
	onOpenSuspend: () => void
	onOpenPromote: () => void
	onOpenDemote: () => void
	onOpenDelete: () => void
}
```

Em `buildContextualActions`, acrescente a ação de exclusão ao array retornado (após `demote`), usando `permissions.canDelete` e `flags.isDeleting`, e inclua `onOpenDelete` em `ActionHandlers`:

```typescript
type ActionHandlers = Pick<
	UserActionsFooterProps,
	"onActivate" | "onOpenSuspend" | "onOpenPromote" | "onOpenDemote" | "onOpenDelete"
>
```

```typescript
		{
			key: "delete",
			visible: permissions.canDelete,
			label: flags.isDeleting ? "Excluindo..." : "Excluir",
			onClick: handlers.onOpenDelete,
			busy: flags.isDeleting,
			className: SUSPEND_CLASS,
		},
```

No componente `UserActionsFooter`, passe `onOpenDelete` para `buildContextualActions` e **remova** o `<Button ... disabled title="Exclusão de usuário disponível em breve">Excluir</Button>` fixo. Para preservar o alinhamento à direita ("ml-auto") que o botão Excluir tinha, mantenha o layout com `ContextualActions` (a ação delete agora é renderizada via `ContextualActions`). Se o alinhamento à direita for desejado, aplique `ml-auto` à className da ação `delete`:

```typescript
		{
			key: "delete",
			visible: permissions.canDelete,
			label: flags.isDeleting ? "Excluindo..." : "Excluir",
			onClick: handlers.onOpenDelete,
			busy: flags.isDeleting,
			className: `ml-auto ${SUSPEND_CLASS}`,
		},
```

E atualize a chamada:

```typescript
	const actions = buildContextualActions(permissions, flags, {
		onActivate,
		onOpenSuspend,
		onOpenPromote,
		onOpenDemote,
		onOpenDelete,
	})
```

- **Step 4: Rodar o teste do footer e confirmar que passa**

Run: `pnpm --filter frontend test -- -t "UserActionsFooter"`
Expected: PASS.

- **Step 5: Estender `useUserDetailActions`**

Em `apps/frontend/src/features/admin/components/user-detail/use-user-detail-actions.ts`:

Importe o hook e aceite um callback de sucesso opcional:

```typescript
import { useDeleteUser } from "@/features/admin/api/use-delete-user"
```

Adicione `canDelete` à interface `UserDetailPermissions` e calcule-o em `resolvePermissions`:

```typescript
export interface UserDetailPermissions {
	canSuspend: boolean
	canActivate: boolean
	canPromoteToAdmin: boolean
	canDemoteFromAdmin: boolean
	canDelete: boolean
	isLocked: boolean
}
```

```typescript
	const canDelete =
		currentUserId !== user.id && user.email !== SUPER_ADMIN_EMAIL
	return {
		canSuspend,
		canActivate,
		canPromoteToAdmin,
		canDemoteFromAdmin,
		canDelete,
		isLocked,
	}
```

Aceite o callback no hook e fie a mutation:

```typescript
export function useUserDetailActions(
	user: AdminUser,
	options?: { onDeleteSuccess?: () => void },
): UserDetailActions {
	const currentUser = useAuthStore((state) => state.user)
	const activateUser = useActivateUser()
	const suspendUser = useSuspendUser()
	const promoteToAdmin = usePromoteToAdmin()
	const demoteFromAdmin = useDemoteFromAdmin()
	const deleteUser = useDeleteUser()
	const [suspendOpen, setSuspendOpen] = useState(false)
	const [promoteOpen, setPromoteOpen] = useState(false)
	const [demoteOpen, setDemoteOpen] = useState(false)
	const [deleteOpen, setDeleteOpen] = useState(false)
```

Inclua `deleteUser.isPending` em `isPending` e em `errorMessage` (no topo da cadeia, para que erros de exclusão apareçam):

```typescript
	const isPending =
		activateUser.isPending ||
		suspendUser.isPending ||
		promoteToAdmin.isPending ||
		demoteFromAdmin.isPending ||
		deleteUser.isPending

	const errorMessage =
		getErrorMessage(deleteUser) ??
		getErrorMessage(demoteFromAdmin) ??
		getErrorMessage(promoteToAdmin) ??
		getErrorMessage(suspendUser) ??
		getErrorMessage(activateUser)
```

Adicione o handler:

```typescript
	function onConfirmDelete(event: MouseEvent<HTMLButtonElement>) {
		event.preventDefault()
		deleteUser.mutate(user.id, {
			onSuccess: () => {
				setDeleteOpen(false)
				options?.onDeleteSuccess?.()
			},
			onError: () => setDeleteOpen(false),
		})
	}
```

Atualize a interface `UserDetailActions` e o objeto retornado para incluir `flags.isDeleting`, `confirm.deleteOpen`, `confirm.setDeleteOpen` e `onConfirmDelete`:

```typescript
		flags: {
			isPending,
			isActivating: activateUser.isPending,
			isSuspending: suspendUser.isPending,
			isPromoting: promoteToAdmin.isPending,
			isDemoting: demoteFromAdmin.isPending,
			isDeleting: deleteUser.isPending,
		},
```

```typescript
		confirm: {
			suspendOpen,
			promoteOpen,
			demoteOpen,
			deleteOpen,
			setSuspendOpen,
			setPromoteOpen,
			setDemoteOpen,
			setDeleteOpen,
		},
		onActivate: () => activateUser.mutate(user.id),
		onConfirmSuspend,
		onConfirmPromote,
		onConfirmDemote,
		onConfirmDelete,
```

Atualize também os tipos da interface `UserDetailActions` (campos `flags.isDeleting`, `confirm.deleteOpen`, `confirm.setDeleteOpen`, `onConfirmDelete`) para refletir o retorno.

- **Step 6: Renderizar o diálogo e ligar o botão no painel**

Em `apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx`:

- Importe `DeleteConfirmationDialog` de `./confirmation-dialogs`.
- Passe `onOpenDelete={() => actions.confirm.setDeleteOpen(true)}` ao `UserActionsFooter` (junto às demais props `onOpen*`).
- Renderize o diálogo junto aos demais diálogos de confirmação:

```tsx
<DeleteConfirmationDialog
	open={actions.confirm.deleteOpen}
	userName={user.name}
	onOpenChange={actions.confirm.setDeleteOpen}
	isPending={actions.flags.isPending}
	isDeleting={actions.flags.isDeleting}
	onConfirm={actions.onConfirmDelete}
/>
```

- Encaminhe o fechamento do painel: se o painel recebe um `onClose`/`onDeleteSuccess`, passe `useUserDetailActions(user, { onDeleteSuccess: onClose })`. Inspecione como `user-detail-panel.tsx` recebe o callback de fechamento (vindo de `UserDetailContainer` / `page.tsx` via `handleModalClose`) e reuse-o como `onDeleteSuccess` para limpar a seleção e fechar o painel após o sucesso (RF-018).

> Confirme os nomes reais das props de fechamento em `user-detail-panel.tsx` e `user-detail-container.tsx` antes de ligar. Se o painel só conhece `onClose`, use-o; não invente uma nova prop sem necessidade.

- **Step 7: Validar lint, tipos e a suíte de testes do frontend**

Run: `pnpm --filter frontend lint:fix && pnpm --filter frontend tsc:check && pnpm --filter frontend test`
Expected: zero problemas; toda a suíte passa.

- **Step 8: Commit**

```bash
git add apps/frontend/src/features/admin/components/user-detail/
git commit -m "feat(frontend): enable user delete action with confirmation in detail panel"
```

## Critérios de Sucesso

- Botão "Excluir" habilitado e funcional (sem o tooltip "disponível em breve") (RF-016).
- Botão oculto para o próprio admin logado e para super admin (`canDelete`) (RF-019).
- Confirmar a exclusão dispara `useDeleteUser`, e no sucesso o painel fecha e a seleção é limpa (RF-018).
- Testes do footer atualizados passam; `lint:fix`, `tsc:check` e `test` passam.
