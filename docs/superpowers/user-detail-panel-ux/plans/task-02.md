# Task 2: Componente MoreActionsMenu [FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-016]

**Status:** PENDING
**PRD:** `../prd/prd-user-detail-panel-ux.md`
**Spec:** `../specs/user-detail-panel-ux-design.md`
**Tier:** standard
**Depends on:** N/A

## Visão Geral

Cria o componente `MoreActionsMenu` — um `DropdownMenu` shadcn/ui que agrupa as ações de gerenciamento de usuário (exceto "Editar dados") em um menu contextual com itens coloridos por nível de risco. O componente é testável em isolamento e exporta a interface `ActionFlags` para ser reutilizada pela `task-03` em `UserActionsFooter`.

Itens do dropdown são contextuais: aparecem somente quando a permissão correspondente é `true`. Separadores (`DropdownMenuSeparator`) aparecem somente entre grupos que têm pelo menos um item visível.

## Arquivos

- Create: `apps/frontend/src/features/admin/components/user-detail/more-actions-menu.tsx`
- Create: `apps/frontend/src/features/admin/components/user-detail/more-actions-menu.test.tsx`

### Conformidade com as Skills Padrão

- `shadcn`: usar `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator` de `@/components/ui/dropdown-menu`
- `tailwindcss`: classes de cor semântica (`text-warning`, `text-success`, `text-destructive`) para hierarquia de risco visual; `focus:text-*` para sobrescrever o foco padrão do `DropdownMenuItem`
- `typescript-advanced`: exportar `ActionFlags` e `MoreActionsMenuProps` para reutilização na task-03
- `vercel-react-best-practices`: componente client-only (`"use client"`), props tipadas, sem estado global
- `test-antipatterns`: testar comportamento observável (itens visíveis, callbacks chamados), não implementação interna

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/user-detail-panel-ux-visual.md` (Section 3 — hierarquia visual do dropdown)
- **Fonte de design original:** Screenshot e mockup HTML gerado no brainstorming — sem URL de ferramenta de design; seguir o mockup curado
- **Confirmar com o usuário:** existe alguma fonte de design adicional (Figma, URL) para esta tela?
- **Ferramentas de fidelidade visual:** nenhuma configurada neste repo; construir manualmente a partir do mockup curado
- **Decisões visuais já tomadas (não refazer):** itens coloridos `text-warning (#ffb443)` para "Inativar", `text-success (#2fcf80)` para "Ativar"/"Desbloquear", `text-destructive (#ff5a4d)` para "Excluir"; separadores entre grupos de risco diferente; trigger `variant="outline"` com `ChevronDown`

## Passos

- **Step 0: Confirm design source & fidelity tools**

  Ler `### Fidelidade Visual` acima. Confirmar com o usuário se há fonte de design adicional (Figma). Se não, implementar diretamente a partir do mockup curado em `../specs/mockups/user-detail-panel-ux-visual.md`.

- **Step 1: Escrever os testes falhando em `more-actions-menu.test.tsx`**

  Criar `apps/frontend/src/features/admin/components/user-detail/more-actions-menu.test.tsx`:

  ```tsx
  import { render, screen } from "@testing-library/react"
  import userEvent from "@testing-library/user-event"
  import { describe, expect, test, vi } from "vitest"
  import { MoreActionsMenu } from "./more-actions-menu"
  import type { MoreActionsMenuProps } from "./more-actions-menu"

  function basePermissions(): MoreActionsMenuProps["permissions"] {
    return {
      canActivate: false,
      canSuspend: true,
      canPromoteToAdmin: true,
      canDemoteFromAdmin: false,
      canDelete: true,
      isLocked: false,
      canEditProfile: true,
      canChangeStatus: true,
      canChangeRole: false,
    }
  }

  function baseFlags(): MoreActionsMenuProps["flags"] {
    return {
      isPending: false,
      isActivating: false,
      isSuspending: false,
      isPromoting: false,
      isDemoting: false,
      isDeleting: false,
    }
  }

  function baseHandlers() {
    return {
      onActivate: vi.fn(),
      onOpenSuspend: vi.fn(),
      onOpenPromote: vi.fn(),
      onOpenDemote: vi.fn(),
      onOpenDelete: vi.fn(),
    }
  }

  async function openMenu() {
    const trigger = screen.getByRole("button", { name: /mais ações/i })
    await userEvent.click(trigger)
  }

  describe("MoreActionsMenu", () => {
    test("renderiza o trigger 'Mais ações'", () => {
      render(
        <MoreActionsMenu
          permissions={basePermissions()}
          flags={baseFlags()}
          {...baseHandlers()}
        />,
      )
      expect(
        screen.getByRole("button", { name: /mais ações/i }),
      ).toBeInTheDocument()
    })

    test("exibe 'Tornar Admin' quando canPromoteToAdmin = true e abre dialog ao clicar", async () => {
      const handlers = baseHandlers()
      render(
        <MoreActionsMenu
          permissions={basePermissions()}
          flags={baseFlags()}
          {...handlers}
        />,
      )
      await openMenu()
      const item = screen.getByRole("menuitem", { name: /tornar admin/i })
      expect(item).toBeInTheDocument()
      await userEvent.click(item)
      expect(handlers.onOpenPromote).toHaveBeenCalledTimes(1)
    })

    test("exibe 'Remover Admin' quando canDemoteFromAdmin = true", async () => {
      const permissions = { ...basePermissions(), canPromoteToAdmin: false, canDemoteFromAdmin: true }
      render(
        <MoreActionsMenu
          permissions={permissions}
          flags={baseFlags()}
          {...baseHandlers()}
        />,
      )
      await openMenu()
      expect(screen.getByRole("menuitem", { name: /remover admin/i })).toBeInTheDocument()
      expect(screen.queryByRole("menuitem", { name: /tornar admin/i })).not.toBeInTheDocument()
    })

    test("exibe 'Inativar' em cor warning quando canSuspend = true", async () => {
      render(
        <MoreActionsMenu
          permissions={basePermissions()}
          flags={baseFlags()}
          {...baseHandlers()}
        />,
      )
      await openMenu()
      const item = screen.getByRole("menuitem", { name: /inativar/i })
      expect(item).toBeInTheDocument()
      expect(item.className).toContain("text-warning")
    })

    test("chama onOpenSuspend ao clicar em Inativar (não executa diretamente)", async () => {
      const handlers = baseHandlers()
      render(
        <MoreActionsMenu
          permissions={basePermissions()}
          flags={baseFlags()}
          {...handlers}
        />,
      )
      await openMenu()
      await userEvent.click(screen.getByRole("menuitem", { name: /inativar/i }))
      expect(handlers.onOpenSuspend).toHaveBeenCalledTimes(1)
      expect(handlers.onActivate).not.toHaveBeenCalled()
    })

    test("exibe 'Ativar' em cor success quando canActivate = true", async () => {
      const permissions = { ...basePermissions(), canActivate: true, canSuspend: false, isLocked: false }
      render(
        <MoreActionsMenu
          permissions={permissions}
          flags={baseFlags()}
          {...baseHandlers()}
        />,
      )
      await openMenu()
      const item = screen.getByRole("menuitem", { name: /^ativar$/i })
      expect(item).toBeInTheDocument()
      expect(item.className).toContain("text-success")
    })

    test("exibe 'Desbloquear' quando canActivate = true e isLocked = true", async () => {
      const permissions = { ...basePermissions(), canActivate: true, canSuspend: false, isLocked: true }
      render(
        <MoreActionsMenu
          permissions={permissions}
          flags={baseFlags()}
          {...baseHandlers()}
        />,
      )
      await openMenu()
      expect(screen.getByRole("menuitem", { name: /desbloquear/i })).toBeInTheDocument()
      expect(screen.queryByRole("menuitem", { name: /^ativar$/i })).not.toBeInTheDocument()
    })

    test("chama onActivate diretamente (sem dialog) ao clicar em Ativar", async () => {
      const handlers = baseHandlers()
      const permissions = { ...basePermissions(), canActivate: true, canSuspend: false }
      render(
        <MoreActionsMenu
          permissions={permissions}
          flags={baseFlags()}
          {...handlers}
        />,
      )
      await openMenu()
      await userEvent.click(screen.getByRole("menuitem", { name: /^ativar$/i }))
      expect(handlers.onActivate).toHaveBeenCalledTimes(1)
      expect(handlers.onOpenSuspend).not.toHaveBeenCalled()
    })

    test("exibe 'Excluir' em cor destructive quando canDelete = true", async () => {
      render(
        <MoreActionsMenu
          permissions={basePermissions()}
          flags={baseFlags()}
          {...baseHandlers()}
        />,
      )
      await openMenu()
      const item = screen.getByRole("menuitem", { name: /excluir/i })
      expect(item).toBeInTheDocument()
      expect(item.className).toContain("text-destructive")
    })

    test("chama onOpenDelete ao clicar em Excluir (não executa diretamente)", async () => {
      const handlers = baseHandlers()
      render(
        <MoreActionsMenu
          permissions={basePermissions()}
          flags={baseFlags()}
          {...handlers}
        />,
      )
      await openMenu()
      await userEvent.click(screen.getByRole("menuitem", { name: /excluir/i }))
      expect(handlers.onOpenDelete).toHaveBeenCalledTimes(1)
    })

    test("não exibe 'Excluir' quando canDelete = false", async () => {
      const permissions = { ...basePermissions(), canDelete: false }
      render(
        <MoreActionsMenu
          permissions={permissions}
          flags={baseFlags()}
          {...baseHandlers()}
        />,
      )
      await openMenu()
      expect(screen.queryByRole("menuitem", { name: /excluir/i })).not.toBeInTheDocument()
    })

    test("não exibe separador quando grupo acima está vazio (sem Tornar/Remover Admin)", async () => {
      const permissions = {
        ...basePermissions(),
        canPromoteToAdmin: false,
        canDemoteFromAdmin: false,
        canSuspend: true,
      }
      render(
        <MoreActionsMenu
          permissions={permissions}
          flags={baseFlags()}
          {...baseHandlers()}
        />,
      )
      await openMenu()
      // Não há separator antes de Inativar se grupo 1 está vazio
      const separators = document.querySelectorAll('[role="separator"]')
      // Apenas o separator entre grupo 2 e grupo 3 deve existir
      expect(separators).toHaveLength(1)
    })

    test("desabilita o trigger quando isPending = true", () => {
      const flags = { ...baseFlags(), isPending: true }
      render(
        <MoreActionsMenu
          permissions={basePermissions()}
          flags={flags}
          {...baseHandlers()}
        />,
      )
      expect(screen.getByRole("button", { name: /mais ações/i })).toBeDisabled()
    })
  })
  ```

- **Step 2: Rodar os testes e verificar que falham**

  ```bash
  pnpm --filter frontend test -- --run "more-actions-menu"
  ```

  Expected: FAIL — arquivo `more-actions-menu.tsx` não existe.

- **Step 3: Criar `more-actions-menu.tsx`**

  Criar `apps/frontend/src/features/admin/components/user-detail/more-actions-menu.tsx`:

  ```tsx
  "use client"

  import { ChevronDown } from "lucide-react"
  import { Button } from "@/components/ui/button"
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
  import type { UserDetailPermissions } from "./use-user-detail-actions"

  export interface ActionFlags {
    isPending: boolean
    isActivating: boolean
    isSuspending: boolean
    isPromoting: boolean
    isDemoting: boolean
    isDeleting: boolean
  }

  export interface MoreActionsMenuProps {
    permissions: UserDetailPermissions
    flags: ActionFlags
    onActivate: () => void
    onOpenSuspend: () => void
    onOpenPromote: () => void
    onOpenDemote: () => void
    onOpenDelete: () => void
  }

  export function MoreActionsMenu({
    permissions,
    flags,
    onActivate,
    onOpenSuspend,
    onOpenPromote,
    onOpenDemote,
    onOpenDelete,
  }: MoreActionsMenuProps) {
    const hasGroup1 =
      permissions.canPromoteToAdmin || permissions.canDemoteFromAdmin
    const hasGroup2 = permissions.canSuspend || permissions.canActivate
    const hasGroup3 = permissions.canDelete

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-11 rounded-md px-4 font-semibold"
            disabled={flags.isPending}
          >
            Mais ações
            <ChevronDown className="ml-1 size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {permissions.canPromoteToAdmin && (
            <DropdownMenuItem
              onClick={onOpenPromote}
              disabled={flags.isPromoting}
            >
              Tornar Admin
            </DropdownMenuItem>
          )}
          {permissions.canDemoteFromAdmin && (
            <DropdownMenuItem
              onClick={onOpenDemote}
              disabled={flags.isDemoting}
            >
              Remover Admin
            </DropdownMenuItem>
          )}
          {hasGroup1 && hasGroup2 && <DropdownMenuSeparator />}
          {permissions.canSuspend && (
            <DropdownMenuItem
              onClick={onOpenSuspend}
              disabled={flags.isSuspending}
              className="text-warning focus:text-warning"
            >
              Inativar
            </DropdownMenuItem>
          )}
          {permissions.canActivate && (
            <DropdownMenuItem
              onClick={onActivate}
              disabled={flags.isActivating}
              className="text-success focus:text-success"
            >
              {permissions.isLocked ? "Desbloquear" : "Ativar"}
            </DropdownMenuItem>
          )}
          {hasGroup2 && hasGroup3 && <DropdownMenuSeparator />}
          {permissions.canDelete && (
            <DropdownMenuItem
              onClick={onOpenDelete}
              disabled={flags.isDeleting}
              className="text-destructive focus:text-destructive"
            >
              Excluir
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }
  ```

- **Step 4: Rodar os testes e verificar que passam**

  ```bash
  pnpm --filter frontend test -- --run "more-actions-menu"
  ```

  Expected: PASS — todos os testes do describe passam.

- **Step 5: Verificar regressão nos testes do diretório user-detail**

  ```bash
  pnpm --filter frontend test -- --run "user-detail"
  ```

  Expected: zero falhas novas. O arquivo novo não afeta componentes existentes.

- **Step 6: Rodar lint e typecheck**

  ```bash
  pnpm --filter frontend lint:fix
  pnpm --filter frontend tsc:check
  ```

  Expected: zero erros. Verificar especialmente que `UserDetailPermissions` é importado corretamente de `./use-user-detail-actions` e que `ActionFlags` e `MoreActionsMenuProps` são exportados para uso na task-03.

- **Step 7: Commit**

  ```bash
  git add apps/frontend/src/features/admin/components/user-detail/more-actions-menu.tsx \
          apps/frontend/src/features/admin/components/user-detail/more-actions-menu.test.tsx
  git commit -m "feat(admin): componente MoreActionsMenu com hierarquia de risco no dropdown"
  ```

## Critérios de Sucesso

- **FR-007**: "Tornar Admin" e "Remover Admin" mutuamente exclusivos conforme `canPromoteToAdmin`/`canDemoteFromAdmin`
- **FR-008**: "Inativar", "Ativar" e "Desbloquear" contextuais conforme `canSuspend`, `canActivate`, `isLocked`
- **FR-009**: "Excluir" aparece quando `canDelete = true`
- **FR-010**: item "Inativar" tem `className` contendo `text-warning`
- **FR-011**: itens "Ativar"/"Desbloquear" têm `className` contendo `text-success`
- **FR-012**: item "Excluir" tem `className` contendo `text-destructive`
- **FR-013**: `DropdownMenuSeparator` ausente quando grupo adjacente está vazio
- **FR-016**: `onActivate` chamado diretamente ao clicar em "Ativar"/"Desbloquear" (sem dialog intermediário)
- Todos os testes do describe passam; `tsc:check` e `lint:fix` sem erros
