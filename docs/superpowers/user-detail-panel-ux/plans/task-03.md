# Task 3: Refatorar UserActionsFooter [FR-005, FR-006, FR-014, FR-015]

**Status:** DONE
**PRD:** `../prd/prd-user-detail-panel-ux.md`
**Spec:** `../specs/user-detail-panel-ux-design.md`
**Tier:** standard
**Depends on:** task-02

## Visão Geral

Simplifica `UserActionsFooter` de componente que renderiza todos os botões inline para um shell de layout puro: botão "Editar dados" (quando `canEdit = true`) com a cor de destaque do design system + dropdown `MoreActionsMenu` (criado na task-02). Remove `buildContextualActions()`, `ContextualActions`, as constantes de classe locais e a interface `ActionFlags` (que agora vive em `more-actions-menu.tsx`).

Os testes existentes em `user-actions-footer.test.tsx` precisam ser atualizados: as ações que antes eram botões expostos agora estão no dropdown. Abrir o dropdown antes de clicar num item.

## Arquivos

- Modify: `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.tsx`
- Modify: `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.test.tsx`

### Conformidade com as Skills Padrão

- `tailwindcss`: botão "Editar dados" com `bg-accent text-accent-foreground h-11 rounded-md px-4 font-semibold hover:bg-accent/90`
- `shadcn`: `Button` com as classes corretas; importar `MoreActionsMenu` do arquivo criado na task-02
- `refactoring`: redução de responsabilidade — `UserActionsFooter` passa de renderizador de ações para shell de layout
- `typescript-advanced`: importar `ActionFlags` de `./more-actions-menu` em vez de definir localmente; manter `UserActionsFooterProps` exportado
- `test-antipatterns`: testes devem interagir com o dropdown para acessar ações internas, não testar implementação interna do `MoreActionsMenu`

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/user-detail-panel-ux-visual.md` (Section 2 — Footer de ações)
- **Fonte de design original:** Screenshot do usuário mostrando layout dos botões — sem URL de ferramenta de design; seguir o mockup curado
- **Confirmar com o usuário:** existe alguma fonte de design adicional (Figma, URL) para o footer?
- **Ferramentas de fidelidade visual:** nenhuma configurada neste repo; construir manualmente a partir do mockup curado
- **Decisões visuais já tomadas (não refazer):** botão "Editar dados" com `bg-accent` (preenchido com cor de destaque primária do VOLT design system); botão "Mais ações" com `variant="outline"`; layout em `flex items-center gap-2`

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Ler `### Fidelidade Visual` acima. Confirmar com o usuário se há fonte de design adicional. Se não, seguir o mockup curado em `../specs/mockups/user-detail-panel-ux-visual.md`.

- **Step 1: Atualizar os testes existentes para o novo comportamento (testes falhando)**

  Substituir o conteúdo completo de `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.test.tsx`:

  ```tsx
  import { render, screen } from "@testing-library/react"
  import userEvent from "@testing-library/user-event"
  import { describe, expect, test, vi } from "vitest"
  import type { AdminUser } from "@/features/admin/api/use-users"
  import { UserActionsFooter } from "./user-actions-footer"

  function buildUser(overrides: Partial<AdminUser> = {}): AdminUser {
    return {
      id: "u1",
      name: "Ana Silva",
      email: "ana@example.com",
      role: "MEMBER",
      status: "activated",
      createdAt: "2024-01-01T00:00:00.000Z",
      isSuperAdmin: false,
      ...overrides,
    }
  }

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
        canEditProfile: true,
        canChangeStatus: true,
        canChangeRole: false,
      },
      flags: {
        isPending: false,
        isActivating: false,
        isSuspending: false,
        isPromoting: false,
        isDemoting: false,
        isDeleting: false,
      },
      canEdit: true,
      onEdit: vi.fn(),
      onActivate: vi.fn(),
      onOpenSuspend: vi.fn(),
      onOpenPromote: vi.fn(),
      onOpenDemote: vi.fn(),
      onOpenDelete: vi.fn(),
    }
  }

  async function openMoreActions() {
    await userEvent.click(screen.getByRole("button", { name: /mais ações/i }))
  }

  describe("UserActionsFooter", () => {
    test("renderiza o botão Editar dados e dispara onEdit ao clicar", async () => {
      const props = baseProps()
      render(<UserActionsFooter {...props} />)
      await userEvent.click(screen.getByRole("button", { name: /editar dados/i }))
      expect(props.onEdit).toHaveBeenCalledTimes(1)
    })

    test("oculta o botão Editar dados quando canEdit é false", () => {
      render(<UserActionsFooter {...baseProps()} canEdit={false} />)
      expect(
        screen.queryByRole("button", { name: /editar dados/i }),
      ).not.toBeInTheDocument()
    })

    test("renderiza o botão Mais ações sempre", () => {
      render(<UserActionsFooter {...baseProps()} />)
      expect(
        screen.getByRole("button", { name: /mais ações/i }),
      ).toBeInTheDocument()
    })

    test("renderiza o botão Mais ações mesmo quando canEdit é false", () => {
      render(<UserActionsFooter {...baseProps()} canEdit={false} />)
      expect(
        screen.getByRole("button", { name: /mais ações/i }),
      ).toBeInTheDocument()
    })

    test("abre o dropdown e chama onOpenSuspend ao clicar em Inativar", async () => {
      const props = baseProps()
      render(<UserActionsFooter {...props} />)
      await openMoreActions()
      await userEvent.click(screen.getByRole("menuitem", { name: /inativar/i }))
      expect(props.onOpenSuspend).toHaveBeenCalledTimes(1)
    })

    test("abre o dropdown e chama onOpenDelete ao clicar em Excluir", async () => {
      const props = baseProps()
      render(<UserActionsFooter {...props} />)
      await openMoreActions()
      await userEvent.click(screen.getByRole("menuitem", { name: /excluir/i }))
      expect(props.onOpenDelete).toHaveBeenCalledTimes(1)
    })

    test("abre o dropdown e não exibe Excluir quando canDelete = false", async () => {
      const props = baseProps()
      props.permissions.canDelete = false
      render(<UserActionsFooter {...props} />)
      await openMoreActions()
      expect(
        screen.queryByRole("menuitem", { name: /excluir/i }),
      ).not.toBeInTheDocument()
    })

    test("abre o dropdown e chama onOpenPromote ao clicar em Tornar Admin", async () => {
      const props = baseProps()
      render(<UserActionsFooter {...props} />)
      await openMoreActions()
      await userEvent.click(screen.getByRole("menuitem", { name: /tornar admin/i }))
      expect(props.onOpenPromote).toHaveBeenCalledTimes(1)
    })

    test("botão Editar dados tem classe bg-accent", () => {
      render(<UserActionsFooter {...baseProps()} />)
      const btn = screen.getByRole("button", { name: /editar dados/i })
      expect(btn.className).toContain("bg-accent")
    })
  })
  ```

- **Step 2: Rodar os testes e verificar que falham**

  ```bash
  pnpm --filter frontend test -- --run "user-actions-footer"
  ```

  Expected: a maioria dos testes falha porque o `UserActionsFooter` atual não tem "Mais ações" nem `MoreActionsMenu`.

- **Step 3: Substituir o corpo de `user-actions-footer.tsx`**

  Substituir o conteúdo completo de `apps/frontend/src/features/admin/components/user-detail/user-actions-footer.tsx`:

  ```tsx
  "use client"

  import { Button } from "@/components/ui/button"
  import type { AdminUser } from "@/features/admin/api/use-users"
  import type { UserDetailPermissions } from "./use-user-detail-actions"
  import { type ActionFlags, MoreActionsMenu } from "./more-actions-menu"

  export interface UserActionsFooterProps {
    user: AdminUser
    permissions: UserDetailPermissions
    flags: ActionFlags
    canEdit: boolean
    onEdit: () => void
    onActivate: () => void
    onOpenSuspend: () => void
    onOpenPromote: () => void
    onOpenDemote: () => void
    onOpenDelete: () => void
  }

  export function UserActionsFooter({
    permissions,
    flags,
    canEdit,
    onEdit,
    onActivate,
    onOpenSuspend,
    onOpenPromote,
    onOpenDemote,
    onOpenDelete,
  }: UserActionsFooterProps) {
    return (
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {canEdit ? (
          <Button
            onClick={onEdit}
            className="h-11 rounded-md bg-accent px-4 font-semibold text-accent-foreground hover:bg-accent/90"
          >
            Editar dados
          </Button>
        ) : null}
        <MoreActionsMenu
          permissions={permissions}
          flags={flags}
          onActivate={onActivate}
          onOpenSuspend={onOpenSuspend}
          onOpenPromote={onOpenPromote}
          onOpenDemote={onOpenDemote}
          onOpenDelete={onOpenDelete}
        />
      </div>
    )
  }
  ```

  **Nota:** a prop `user` é preservada em `UserActionsFooterProps` por compatibilidade com o caller existente (`user-detail-panel.tsx`), mas não é mais usada internamente. Verificar se o caller passa essa prop — se não passar mais, remover do type. Verificar em `user-detail-panel.tsx`.

- **Step 4: Verificar se `user-detail-panel.tsx` passa a prop `user` para `UserActionsFooter`**

  ```bash
  grep -n "UserActionsFooter" apps/frontend/src/features/admin/components/user-detail/user-detail-panel.tsx
  ```

  Se a prop `user` for passada mas não mais usada, a remoção é segura — só causar erro de TypeScript se o caller tentar passar uma prop que não existe no type. Portanto, **manter `user: AdminUser` em `UserActionsFooterProps`** para não quebrar o caller sem uma refatoração separada.

- **Step 5: Rodar os testes e verificar que passam**

  ```bash
  pnpm --filter frontend test -- --run "user-actions-footer"
  ```

  Expected: PASS — todos os testes do describe passam.

- **Step 6: Rodar todos os testes do diretório user-detail para verificar regressão**

  ```bash
  pnpm --filter frontend test -- --run "user-detail"
  ```

  Expected: zero falhas novas. O `user-detail-panel.tsx` e demais consumidores de `UserActionsFooter` não devem ser afetados porque a interface pública de `UserActionsFooterProps` é preservada.

- **Step 7: Rodar a suite completa de testes**

  ```bash
  pnpm --filter frontend test -- --run
  ```

  Expected: zero falhas novas.

- **Step 8: Rodar lint e typecheck**

  ```bash
  pnpm --filter frontend lint:fix
  pnpm --filter frontend tsc:check
  ```

  Expected: zero erros. Verificar especialmente que `ActionFlags` é importado de `./more-actions-menu` e que não há definição duplicada no arquivo.

- **Step 9: Commit**

  ```bash
  git add apps/frontend/src/features/admin/components/user-detail/user-actions-footer.tsx \
          apps/frontend/src/features/admin/components/user-detail/user-actions-footer.test.tsx
  git commit -m "refactor(admin): simplificar UserActionsFooter delegando ações ao MoreActionsMenu"
  ```

## Critérios de Sucesso

- **FR-005**: botão "Editar dados" visível e com `bg-accent` quando `canEdit = true`
- **FR-006**: botão "Editar dados" ausente quando `canEdit = false`; dropdown "Mais ações" ainda aparece
- **FR-014**: callbacks `onOpenSuspend`, `onOpenPromote`, `onOpenDemote` passados ao `MoreActionsMenu` — que os liga aos dialogs existentes em `confirmation-dialogs.tsx`
- **FR-015**: callback `onOpenDelete` passado ao `MoreActionsMenu` — que o liga ao dialog de exclusão existente
- `buildContextualActions()`, `ContextualActions`, constantes `OUTLINE_CLASS/SUSPEND_CLASS/DELETE_CLASS` e `interface ActionFlags` locais foram removidos
- Todos os testes do describe passam; nenhum teste em `user-detail` quebra; `tsc:check` e `lint:fix` sem erros
