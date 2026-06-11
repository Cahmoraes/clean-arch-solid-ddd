# Task 2: NavigationGroup — itens estáticos filtrados por role [RF-006, RF-007, RF-008, RF-009]

**Status:** DONE
**PRD:** `../prd/prd-global-command-palette.md`
**Spec:** `../specs/global-command-palette-design.md`
**Depends on:** task-01

## Visão Geral

Cria o componente `NavigationGroup` como arquivo independente. Exibe itens de navegação estáticos filtrados pelo role do usuário (admin items visíveis apenas para ADMIN). Ao selecionar um item, navega e fecha o palette. Não toca em `command-palette.tsx` — a integração ocorre na task-05.

## Arquivos

- Create: `apps/frontend/src/components/command-palette/navigation-group.tsx`
- Create: `apps/frontend/src/components/command-palette/navigation-group.test.tsx`

### Conformidade com as Skills Padrão

- typescript-advanced: `ReadonlyArray`, const assertion no array de rotas
- test-antipatterns: usar `renderWithProviders` ou wrapper mínimo; não mockar `useAuthStore` — usar `setSession`

## Passos

### Step 1: Escrever os testes (TDD)

Criar `apps/frontend/src/components/command-palette/navigation-group.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { Command } from 'cmdk'
import { NavigationGroup } from './navigation-group'
import { useAuthStore } from '@/lib/auth/auth-store'
import { makeTestJwt } from '@/test/render'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

function renderGroup(role: 'MEMBER' | 'ADMIN' = 'MEMBER', query = '') {
  useAuthStore.getState().setSession(makeTestJwt({ role }))
  return render(
    <Command shouldFilter={false}>
      <Command.List>
        <NavigationGroup query={query} onSelect={vi.fn()} />
      </Command.List>
    </Command>,
  )
}

describe('NavigationGroup', () => {
  beforeEach(() => {
    useAuthStore.getState().clear()
    mockPush.mockClear()
  })

  test('exibe itens de navegação principal para membro', () => {
    renderGroup('MEMBER')
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Academias')).toBeInTheDocument()
    expect(screen.getByText('Check-ins')).toBeInTheDocument()
  })

  test('não exibe itens admin para membro', () => {
    renderGroup('MEMBER')
    expect(screen.queryByText('Usuários (admin)')).not.toBeInTheDocument()
    expect(screen.queryByText('Check-ins (admin)')).not.toBeInTheDocument()
  })

  test('exibe itens admin para ADMIN', () => {
    renderGroup('ADMIN')
    expect(screen.getByText('Usuários (admin)')).toBeInTheDocument()
    expect(screen.getByText('Check-ins (admin)')).toBeInTheDocument()
  })

  test('navega ao clicar num item e chama onSelect', async () => {
    const onSelect = vi.fn()
    useAuthStore.getState().setSession(makeTestJwt({ role: 'MEMBER' }))
    render(
      <Command shouldFilter={false}>
        <Command.List>
          <NavigationGroup query="" onSelect={onSelect} />
        </Command.List>
      </Command>,
    )
    await userEvent.click(screen.getByText('Dashboard'))
    expect(mockPush).toHaveBeenCalledWith('/inicio')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  test('filtra itens pelo query quando query não está vazia', () => {
    renderGroup('MEMBER', 'acad')
    expect(screen.getByText('Academias')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  test('exibe todos os itens quando query está vazia', () => {
    renderGroup('MEMBER', '')
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Academias')).toBeInTheDocument()
  })

  test('items aparecem sem espera de API (< 50ms percebidos)', () => {
    // Itens estáticos — renderizam sincronamente, sem estado de loading
    renderGroup('MEMBER')
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
```

### Step 2: Executar testes para confirmar que falham

```bash
pnpm --filter frontend test -- --run -t "NavigationGroup"
```

Expected: FAIL — `Cannot find module './navigation-group'`

### Step 3: Criar NavigationGroup

Criar `apps/frontend/src/components/command-palette/navigation-group.tsx`:

```tsx
'use client'

import { Command } from 'cmdk'
import {
  Building2,
  CheckCircle,
  CreditCard,
  LayoutDashboard,
  User,
  Users,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth/auth-store'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  adminOnly?: boolean
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { href: '/inicio', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/check-ins', label: 'Check-ins', icon: CheckCircle },
  { href: '/academias', label: 'Academias', icon: Building2 },
  { href: '/perfil', label: 'Perfil', icon: User },
  { href: '/assinatura', label: 'Assinatura', icon: CreditCard },
  {
    href: '/admin/usuarios',
    label: 'Usuários (admin)',
    icon: Users,
    adminOnly: true,
  },
  {
    href: '/admin/check-ins',
    label: 'Check-ins (admin)',
    icon: CheckCircle,
    adminOnly: true,
  },
]

interface NavigationGroupProps {
  query: string
  onSelect: () => void
}

export function NavigationGroup({ query, onSelect }: NavigationGroupProps) {
  const user = useAuthStore((state) => state.user)
  const router = useRouter()
  const isAdmin = user?.role === 'ADMIN'

  const items = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !isAdmin) return false
    if (query.trim().length === 0) return true
    return item.label.toLowerCase().includes(query.trim().toLowerCase())
  })

  if (items.length === 0) return null

  return (
    <Command.Group heading="Navegação">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <Command.Item
            key={item.href}
            value={item.label}
            onSelect={() => {
              router.push(item.href)
              onSelect()
            }}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground aria-selected:bg-surface-2"
          >
            <Icon
              className="h-4 w-4 shrink-0 text-subtle"
              aria-hidden="true"
            />
            {item.label}
          </Command.Item>
        )
      })}
    </Command.Group>
  )
}
```

### Step 4: Executar testes do NavigationGroup

```bash
pnpm --filter frontend test -- --run -t "NavigationGroup"
```

Expected: PASS — 7 testes verdes

### Step 5: Rodar lint e typecheck

```bash
pnpm --filter frontend tsc:check
pnpm --filter frontend lint:fix
```

Expected: zero erros

### Step 6: Commit

```bash
git add apps/frontend/src/components/command-palette/navigation-group.tsx \
        apps/frontend/src/components/command-palette/navigation-group.test.tsx
git commit -m "feat(frontend): add NavigationGroup with role-based filtering for command palette"
```

## Critérios de Sucesso

- Ao abrir o palette com query vazia, `NavigationGroup` exibe as páginas principais [RF-006]
- Itens `/admin/usuarios` e `/admin/check-ins` só aparecem para ADMIN [RF-007]
- Ao selecionar um item, `router.push(href)` é chamado e `onSelect()` é disparado [RF-008]
- Itens são estáticos (sem API call) — renderizam sincronamente [RF-009]
- Filtro por `query` funciona client-side
- `tsc:check` e `lint:fix` passam sem erros
