# Task 4: UserGroup (admin only) [RF-016, RF-017, RF-018, RF-019, RF-020]

**Status:** PENDING
**PRD:** `../prd/prd-global-command-palette.md`
**Spec:** `../specs/global-command-palette-design.md`
**Depends on:** task-01, task-03

## Visão Geral

Cria o componente `UserGroup` que busca usuários via `useUsers` (admin only), com skeleton e empty state. Usa a mesma assinatura de props `{ query, isActive, onSelect }` estabelecida pelo `GymGroup` na task-03. Não toca em `command-palette.tsx` — a integração ocorre na task-05.

## Arquivos

- Create: `apps/frontend/src/components/command-palette/user-group.tsx`
- Create: `apps/frontend/src/components/command-palette/user-group.test.tsx`

### Conformidade com as Skills Padrão

- tanstack-query-best-practices: limit: 5 na busca do palette; sem keepPreviousData (context diferente)
- test-antipatterns: usar MSW para interceptar `/users`; usar `makeTestJwt` para simular admin

## Passos

### Step 1: Escrever os testes para UserGroup (TDD)

Criar `apps/frontend/src/components/command-palette/user-group.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { Command } from 'cmdk'
import { server } from '@/test/setup'
import { renderWithProviders, makeTestJwt } from '@/test/render'
import { useAuthStore } from '@/lib/auth/auth-store'
import { UserGroup } from './user-group'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

function renderUserGroup(
  query: string,
  role: 'MEMBER' | 'ADMIN' = 'ADMIN',
  isActive = query.trim().length >= 2,
) {
  useAuthStore.getState().setSession(makeTestJwt({ role }))
  return renderWithProviders(
    <Command shouldFilter={false}>
      <Command.List>
        <UserGroup query={query} isActive={isActive} onSelect={vi.fn()} />
      </Command.List>
    </Command>,
  )
}

describe('UserGroup', () => {
  beforeEach(() => {
    useAuthStore.getState().clear()
    mockPush.mockClear()
  })

  test('não exibe nada quando isActive=false', () => {
    renderUserGroup('jo', 'ADMIN', false)
    expect(screen.queryByText('Usuários')).not.toBeInTheDocument()
  })

  test('exibe skeleton enquanto carrega', async () => {
    server.use(
      http.get('*/users', async () => {
        await new Promise((r) => setTimeout(r, 100))
        return HttpResponse.json({ users: [], pagination: {} })
      }),
    )
    renderUserGroup('joao')
    expect(screen.getByTestId('user-group-loading')).toBeInTheDocument()
  })

  test('exibe usuários retornados pela API', async () => {
    server.use(
      http.get('*/users', () =>
        HttpResponse.json({
          users: [
            { id: '1', name: 'João Silva', email: 'joao@test.com', role: 'MEMBER', status: 'active' },
            { id: '2', name: 'Joana Faria', email: 'joana@test.com', role: 'ADMIN', status: 'active' },
          ],
          pagination: { total: 2, page: 1, limit: 5, totalPages: 1 },
        }),
      ),
    )
    renderUserGroup('joao')
    await waitFor(() => expect(screen.getByText('João Silva')).toBeInTheDocument())
    expect(screen.getByText('Joana Faria')).toBeInTheDocument()
  })

  test('exibe estado vazio quando API retorna lista vazia', async () => {
    server.use(
      http.get('*/users', () =>
        HttpResponse.json({ users: [], pagination: { total: 0, page: 1, limit: 5, totalPages: 0 } }),
      ),
    )
    renderUserGroup('xxxx')
    await waitFor(() =>
      expect(screen.getByText('Nenhum usuário encontrado.')).toBeInTheDocument(),
    )
  })

  test('navega para /admin/usuarios com userId e query ao selecionar', async () => {
    const onSelect = vi.fn()
    server.use(
      http.get('*/users', () =>
        HttpResponse.json({
          users: [{ id: 'usr-1', name: 'João Silva', email: 'joao@test.com', role: 'MEMBER', status: 'active' }],
          pagination: { total: 1, page: 1, limit: 5, totalPages: 1 },
        }),
      ),
    )
    useAuthStore.getState().setSession(makeTestJwt({ role: 'ADMIN' }))
    renderWithProviders(
      <Command shouldFilter={false}>
        <Command.List>
          <UserGroup query="joao" isActive={true} onSelect={onSelect} />
        </Command.List>
      </Command>,
    )
    await waitFor(() => screen.getByText('João Silva'))
    await userEvent.click(screen.getByText('João Silva'))
    expect(mockPush).toHaveBeenCalledWith(
      '/admin/usuarios?userId=usr-1&query=Jo%C3%A3o+Silva',
    )
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
```

### Step 2: Executar testes para confirmar que falham

```bash
pnpm --filter frontend test -- --run -t "UserGroup"
```

Expected: FAIL — `Cannot find module './user-group'`

### Step 3: Criar UserGroup

Criar `apps/frontend/src/components/command-palette/user-group.tsx`:

```tsx
'use client'

import { Command } from 'cmdk'
import { User } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useUsers } from '@/features/admin/api'

interface UserGroupProps {
  query: string
  isActive: boolean
  onSelect: () => void
}

export function UserGroup({ query, isActive, onSelect }: UserGroupProps) {
  const router = useRouter()

  const { data, isLoading } = useUsers({
    page: 1,
    limit: 5,
    query: isActive ? query : undefined,
  })

  const users = isActive ? (data?.users ?? []) : []

  if (!isActive) return null

  if (isLoading) {
    return (
      <Command.Group heading="Usuários">
        <div
          data-testid="user-group-loading"
          className="space-y-1 px-3 py-2"
          aria-label="Carregando usuários"
        >
          {[1, 2].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded-md bg-surface-3" />
          ))}
        </div>
      </Command.Group>
    )
  }

  if (users.length === 0) {
    return (
      <Command.Group heading="Usuários">
        <p className="px-3 py-2 text-sm text-subtle">Nenhum usuário encontrado.</p>
      </Command.Group>
    )
  }

  return (
    <Command.Group heading="Usuários">
      {users.map((user) => (
        <Command.Item
          key={user.id}
          value={user.name}
          onSelect={() => {
            const params = new URLSearchParams({
              userId: user.id,
              query: user.name,
            })
            router.push(`/admin/usuarios?${params.toString()}`)
            onSelect()
          }}
          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground aria-selected:bg-surface-2"
        >
          <User className="h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
          <span className="flex-1 truncate">{user.name}</span>
          <span className="text-xs text-subtle">
            {user.role === 'ADMIN' ? 'admin' : 'membro'}
          </span>
        </Command.Item>
      ))}
    </Command.Group>
  )
}
```

### Step 4: Verificar o tipo AdminUser

Verificar o caminho de importação correto do tipo `AdminUser`:

```bash
grep -r "export.*AdminUser" apps/frontend/src --include="*.ts" --include="*.tsx" -l
```

Se `AdminUser` não for re-exportado por `@/features/admin/api`, importar do arquivo correto (ex.: `@/features/admin/types`). Ajustar o import em `user-group.tsx` conforme o resultado.

### Step 5: Executar testes do UserGroup

```bash
pnpm --filter frontend test -- --run -t "UserGroup"
```

Expected: PASS — 5 testes verdes

### Step 6: Rodar lint e typecheck

```bash
pnpm --filter frontend tsc:check
pnpm --filter frontend lint:fix
```

Expected: zero erros

### Step 7: Commit

```bash
git add apps/frontend/src/components/command-palette/user-group.tsx \
        apps/frontend/src/components/command-palette/user-group.test.tsx
git commit -m "feat(frontend): add UserGroup (admin-only) for command palette"
```

## Critérios de Sucesso

- `UserGroup` só é renderizado por código admin (RF-016 — o controle de role ocorre na task-05 ao integrar no CommandPalette)
- Query `< 2 chars` → `isActive=false` → grupo não renderiza [RF-017]
- Debounce 300ms via `useGlobalSearch.isActive` (propagado pelo CommandPalette) [RF-018]
- Skeleton de loading exibido durante request [RF-019]
- Mensagem de vazio exibida quando API retorna lista vazia [RF-020]
- Seleção navega para `/admin/usuarios?userId=X&query=Y` (wiring completo na task-05)
- `tsc:check` e `lint:fix` passam sem erros
