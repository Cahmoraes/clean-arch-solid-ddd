# Task 5: Wire all groups + page URL params [RF-015, RF-021]

**Status:** PENDING
**PRD:** `../prd/prd-global-command-palette.md`
**Spec:** `../specs/global-command-palette-design.md`
**Depends on:** task-01, task-02, task-03, task-04

## Visão Geral

Integra todos os grupos no `CommandPalette`, passa o `query` da `Command.Input` via estado interno, e atualiza as duas páginas de destino: (1) `academias/page.tsx` para ler `?search=` da URL no mount; (2) `admin/usuarios/page.tsx` para ler `?userId=` + `?query=` da URL e auto-selecionar o usuário quando a lista carrega.

## Arquivos

- Modify: `apps/frontend/src/components/command-palette/command-palette.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/academias/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`

### Conformidade com as Skills Padrão

- tanstack-query-best-practices: sem side effects desnecessários nas páginas
- test-antipatterns: testar comportamento observável (URLs geradas, elementos na tela), não implementação

## Passos

### Step 1: Escrever testes de integração para o CommandPalette com grupos

Adicionar ao arquivo `apps/frontend/src/components/command-palette/command-palette.test.tsx` (criado na task-01):

```tsx
import { http, HttpResponse } from 'msw'
import { server } from '@/test/setup'
import { renderWithProviders, makeTestJwt } from '@/test/render'
import { useAuthStore } from '@/lib/auth/auth-store'

// Adicionar esses testes ao describe('CommandPalette') existente:

test('exibe NavigationGroup quando aberto com query vazia (membro)', async () => {
  useAuthStore.getState().setSession(makeTestJwt({ role: 'MEMBER' }))
  renderWithProviders(<CommandPalette open={true} onOpenChange={vi.fn()} />)
  expect(await screen.findByText('Dashboard')).toBeInTheDocument()
  expect(screen.queryByText('Usuários (admin)')).not.toBeInTheDocument()
})

test('exibe NavigationGroup com itens admin quando ADMIN', async () => {
  useAuthStore.getState().setSession(makeTestJwt({ role: 'ADMIN' }))
  renderWithProviders(<CommandPalette open={true} onOpenChange={vi.fn()} />)
  expect(await screen.findByText('Usuários (admin)')).toBeInTheDocument()
})

test('exibe GymGroup após digitar 2+ chars', async () => {
  server.use(
    http.get('*/gyms/search/:name', () =>
      HttpResponse.json([{ id: '1', title: 'Academia Power', description: '', phone: '', latitude: 0, longitude: 0 }]),
    ),
  )
  useAuthStore.getState().setSession(makeTestJwt({ role: 'MEMBER' }))
  renderWithProviders(<CommandPalette open={true} onOpenChange={vi.fn()} />)
  await userEvent.type(screen.getByPlaceholderText('Buscar páginas, academias, usuários...'), 'ac')
  await waitFor(() => expect(screen.getByText('Academia Power')).toBeInTheDocument(), { timeout: 1000 })
})

test('não exibe UserGroup para membro', async () => {
  server.use(
    http.get('*/users', () =>
      HttpResponse.json({ users: [{ id: '1', name: 'João', email: 'j@t.com', role: 'MEMBER', status: 'active' }], pagination: {} }),
    ),
  )
  useAuthStore.getState().setSession(makeTestJwt({ role: 'MEMBER' }))
  renderWithProviders(<CommandPalette open={true} onOpenChange={vi.fn()} />)
  await userEvent.type(screen.getByPlaceholderText('Buscar páginas, academias, usuários...'), 'jo')
  // dar tempo para queries dispararem
  await new Promise((r) => setTimeout(r, 500))
  expect(screen.queryByText('João')).not.toBeInTheDocument()
})
```

### Step 2: Executar testes para confirmar que falham (grupos não estão integrados ainda)

```bash
pnpm --filter frontend test -- --run -t "exibe NavigationGroup quando aberto"
```

Expected: FAIL — grupos não renderizados ainda

### Step 3: Atualizar CommandPalette para integrar os grupos

Editar `apps/frontend/src/components/command-palette/command-palette.tsx` — versão final completa:

```tsx
'use client'

import { Root, Portal, Overlay, Content } from '@radix-ui/react-dialog'
import { Command } from 'cmdk'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '@/lib/auth/auth-store'
import { GymGroup } from './gym-group'
import { NavigationGroup } from './navigation-group'
import { UserGroup } from './user-group'
import { useGlobalSearch } from './use-global-search'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const user = useAuthStore((state) => state.user)
  const isAdmin = user?.role === 'ADMIN'
  const { debouncedQuery, isActive } = useGlobalSearch(query)

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setQuery('')
    onOpenChange(nextOpen)
  }

  return (
    <Root open={open} onOpenChange={handleOpenChange}>
      <Portal>
        <Overlay className="fixed inset-0 z-40 bg-black/60" />
        <Content
          className="fixed left-1/2 top-[15vh] z-50 w-[calc(100vw-2rem)] max-w-[560px] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover shadow-pop focus:outline-none"
          aria-describedby={undefined}
        >
          <Command shouldFilter={false} className="flex flex-col">
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search
                className="h-4 w-4 shrink-0 text-subtle"
                aria-hidden="true"
              />
              <Command.Input
                value={query}
                onValueChange={setQuery}
                placeholder="Buscar páginas, academias, usuários..."
                className="flex h-12 w-full bg-transparent py-3 text-sm text-foreground placeholder:text-subtle outline-none"
              />
            </div>
            <Command.List className="max-h-[400px] overflow-y-auto py-2">
              <Command.Empty className="py-8 text-center text-sm text-subtle">
                Nenhum resultado encontrado.
              </Command.Empty>

              <NavigationGroup
                query={query}
                onSelect={() => handleOpenChange(false)}
              />

              <GymGroup
                query={debouncedQuery}
                isActive={isActive}
                onSelect={() => handleOpenChange(false)}
              />

              {isAdmin && (
                <UserGroup
                  query={debouncedQuery}
                  isActive={isActive}
                  onSelect={() => handleOpenChange(false)}
                />
              )}
            </Command.List>
          </Command>
        </Content>
      </Portal>
    </Root>
  )
}
```

### Step 4: Executar testes de integração do CommandPalette

```bash
pnpm --filter frontend test -- --run -t "CommandPalette"
```

Expected: PASS — todos os testes verdes (incluindo os de task-01)

### Step 5: Escrever teste para academias page com ?search= URL param

Localizar o arquivo de teste existente para a página de academias (se houver) ou criar
`apps/frontend/src/app/(authenticated)/academias/academias-page.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { vi, test, expect, describe } from 'vitest'
import { renderWithProviders, makeTestJwt } from '@/test/render'
import { useAuthStore } from '@/lib/auth/auth-store'

const mockPush = vi.fn()
let mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/academias',
}))

// Importar após o mock para capturar o mock correto
// (ajustar o caminho conforme a estrutura real do arquivo de teste)
describe('academias page — URL param ?search=', () => {
  test('pre-preenche a busca quando ?search= está na URL', async () => {
    mockSearchParams = new URLSearchParams({ search: 'Power Gym' })
    useAuthStore.getState().setSession(makeTestJwt({ role: 'MEMBER' }))

    // Importar a página dinamicamente para pegar o mock atualizado
    const { default: AcademiasPage } = await import('./page')
    renderWithProviders(<AcademiasPage />)

    // O input de busca deve estar pre-preenchido
    const input = screen.getByRole('searchbox') as HTMLInputElement
    expect(input.value).toBe('Power Gym')
  })
})
```

Nota: o teste exato depende da estrutura interna do arquivo `page.tsx`. Leia o arquivo antes de adaptar. Se o arquivo usa um componente `AcademiasSearchInput` separado, ajuste o seletor conforme necessário.

### Step 6: Atualizar academias/page.tsx para ler ?search= da URL

Editar `apps/frontend/src/app/(authenticated)/academias/page.tsx`.

Localizar a importação do `useSearchParams` (se não existe, adicionar):

```tsx
import { useSearchParams } from 'next/navigation'
```

Localizar onde `draftQuery` e `submittedQuery` são inicializados (atualmente `useState("")`) e substituir:

```tsx
// Antes:
const [draftQuery, setDraftQuery] = useState("")
const [submittedQuery, setSubmittedQuery] = useState("")

// Depois:
const searchParams = useSearchParams()
const initialSearch = searchParams?.get('search') ?? ''
const [draftQuery, setDraftQuery] = useState(initialSearch)
const [submittedQuery, setSubmittedQuery] = useState(initialSearch)
```

Verificar que o `useSearchParams` não está importado duas vezes e que `'use client'` está no topo do arquivo.

### Step 7: Escrever teste para admin/usuarios page com ?userId= e ?query=

Localizar o arquivo de teste da página admin/usuarios (se houver) ou criar um cenário específico.

Adicionar ao arquivo de teste existente (ou criar novo):

```tsx
describe('admin/usuarios page — URL params ?userId= e ?query=', () => {
  test('auto-seleciona usuário quando ?userId= e ?query= estão na URL', async () => {
    mockSearchParams = new URLSearchParams({ userId: 'usr-1', query: 'João' })
    useAuthStore.getState().setSession(makeTestJwt({ role: 'ADMIN' }))

    server.use(
      http.get('*/users', () =>
        HttpResponse.json({
          users: [
            { id: 'usr-1', name: 'João Silva', email: 'joao@test.com', role: 'MEMBER', status: 'active' },
          ],
          pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
        }),
      ),
    )

    const { default: AdminUsuariosPage } = await import('./page')
    renderWithProviders(<AdminUsuariosPage />)

    // Input deve estar pre-preenchido com o query
    const input = screen.getByRole('searchbox') as HTMLInputElement
    expect(input.value).toBe('João')

    // Após os dados carregarem, o painel de detalhe do usuário deve estar visível
    await waitFor(() =>
      expect(screen.getByTestId('user-detail-panel')).toBeInTheDocument(),
    )
  })
})
```

Nota: se o painel de detalhe não tiver `data-testid="user-detail-panel"`, localize o elemento correto lendo `admin/usuarios/page.tsx` e ajuste o seletor.

### Step 8: Atualizar admin/usuarios/page.tsx para ler URL params

Editar `apps/frontend/src/app/(authenticated)/admin/usuarios/page.tsx`.

**Adicionar import de useSearchParams** (se não existe):

```tsx
import { useSearchParams } from 'next/navigation'
```

**Dentro do componente**, localizar onde `inputQuery` é inicializado e substituir:

```tsx
// Antes:
const [inputQuery, setInputQuery] = useState('')

// Depois:
const searchParams = useSearchParams()
const [inputQuery, setInputQuery] = useState(searchParams?.get('query') ?? '')
```

**Adicionar um `useEffect` para auto-selecionar usuário** após os dados carregarem. Inserir logo após os hooks existentes, antes do `return`:

```tsx
// Auto-seleciona usuário vindo do command palette (?userId= na URL)
const pendingUserId = searchParams?.get('userId') ?? null
useEffect(() => {
  if (!pendingUserId || !data?.users?.length || selectedUser) return
  const found = data.users.find((u) => u.id === pendingUserId)
  if (found) setSelectedUser(found)
}, [data?.users, pendingUserId, selectedUser])
```

Nota: `selectedUser` e `setSelectedUser` são o estado local existente no componente. Se o nome for diferente, ajuste conforme o arquivo real.

### Step 9: Executar todos os testes do frontend

```bash
pnpm --filter frontend test -- --run
```

Expected: todos passando

### Step 10: Rodar lint e typecheck

```bash
pnpm --filter frontend tsc:check
pnpm --filter frontend lint:fix
```

Expected: zero erros

### Step 11: Build final

```bash
pnpm --filter frontend build
```

Expected: build sem erros

### Step 12: Commit final

```bash
git add apps/frontend/src/components/command-palette/command-palette.tsx \
        apps/frontend/src/app/\(authenticated\)/academias/page.tsx \
        apps/frontend/src/app/\(authenticated\)/admin/usuarios/page.tsx
git commit -m "feat(frontend): wire command palette groups and add URL param navigation for academias and admin users"
```

## Critérios de Sucesso

- Seleção de academia navega para `/academias?search=<nome>` e página carrega com busca pre-preenchida [RF-015]
- Seleção de usuário (admin) navega para `/admin/usuarios?userId=X&query=Y` e painel de detalhe auto-abre [RF-021]
- `UserGroup` só é renderizado quando `isAdmin === true` (membro não vê a seção de usuários)
- Estado do palette (query) é resetado ao fechar
- Build completo sem erros
- `tsc:check` e `lint:fix` passam sem erros
