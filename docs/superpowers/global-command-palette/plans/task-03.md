# Task 3: useGlobalSearch + GymGroup [RF-010, RF-011, RF-012, RF-013, RF-014]

**Status:** DONE
**PRD:** `../prd/prd-global-command-palette.md`
**Spec:** `../specs/global-command-palette-design.md`
**Depends on:** task-01

## Visão Geral

Cria o hook `useGlobalSearch` (debounce 300ms + cálculo de `isActive`) e o componente `GymGroup` que busca academias via `useGymsByName` e exibe resultados com skeleton e empty state. Não toca em `command-palette.tsx` — a integração ocorre na task-05.

## Arquivos

- Create: `apps/frontend/src/components/command-palette/use-global-search.ts`
- Create: `apps/frontend/src/components/command-palette/gym-group.tsx`
- Create: `apps/frontend/src/components/command-palette/gym-group.test.tsx`

### Conformidade com as Skills Padrão

- tanstack-query-best-practices: não chamar hooks condicionalmente; usar `enabled` no useGymsByName
- test-antipatterns: usar MSW para interceptar HTTP; não mockar `useGymsByName` diretamente

## Passos

### Step 1: Escrever os testes para GymGroup (TDD)

Criar `apps/frontend/src/components/command-palette/gym-group.test.tsx`:

```tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { Command } from 'cmdk'
import { server } from '@/test/setup'
import { renderWithProviders } from '@/test/render'
import { GymGroup } from './gym-group'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

function renderGymGroup(query: string, isActive = query.trim().length >= 2) {
  return renderWithProviders(
    <Command shouldFilter={false}>
      <Command.List>
        <GymGroup query={query} isActive={isActive} onSelect={vi.fn()} />
      </Command.List>
    </Command>,
  )
}

describe('GymGroup', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  test('não exibe nada quando isActive=false', () => {
    renderGymGroup('a', false)
    expect(screen.queryByText('Academias')).not.toBeInTheDocument()
  })

  test('exibe skeleton enquanto carrega', async () => {
    server.use(
      http.get('*/gyms/search/:name', async () => {
        await new Promise((r) => setTimeout(r, 100))
        return HttpResponse.json([])
      }),
    )
    renderGymGroup('academia')
    expect(screen.getByTestId('gym-group-loading')).toBeInTheDocument()
  })

  test('exibe academias retornadas pela API', async () => {
    server.use(
      http.get('*/gyms/search/:name', () =>
        HttpResponse.json([
          { id: '1', title: 'Academia Fit', description: '', phone: '', latitude: 0, longitude: 0 },
          { id: '2', title: 'Gym Power', description: '', phone: '', latitude: 0, longitude: 0 },
        ]),
      ),
    )
    renderGymGroup('academia')
    await waitFor(() => expect(screen.getByText('Academia Fit')).toBeInTheDocument())
    expect(screen.getByText('Gym Power')).toBeInTheDocument()
  })

  test('exibe estado vazio quando API retorna lista vazia', async () => {
    server.use(
      http.get('*/gyms/search/:name', () => HttpResponse.json([])),
    )
    renderGymGroup('xxxx')
    await waitFor(() =>
      expect(screen.getByText('Nenhuma academia encontrada.')).toBeInTheDocument(),
    )
  })

  test('navega para /academias com query ao selecionar', async () => {
    const onSelect = vi.fn()
    server.use(
      http.get('*/gyms/search/:name', () =>
        HttpResponse.json([
          { id: '1', title: 'Academia Fit', description: '', phone: '', latitude: 0, longitude: 0 },
        ]),
      ),
    )
    renderWithProviders(
      <Command shouldFilter={false}>
        <Command.List>
          <GymGroup query="academia" isActive={true} onSelect={onSelect} />
        </Command.List>
      </Command>,
    )
    await waitFor(() => screen.getByText('Academia Fit'))
    await userEvent.click(screen.getByText('Academia Fit'))
    expect(mockPush).toHaveBeenCalledWith('/academias?search=Academia+Fit')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
```

### Step 2: Executar testes para confirmar que falham

```bash
pnpm --filter frontend test -- --run -t "GymGroup"
```

Expected: FAIL — `Cannot find module './gym-group'`

### Step 3: Criar useGlobalSearch

Criar `apps/frontend/src/components/command-palette/use-global-search.ts`:

```ts
import { useDebounce } from '@/hooks/use-debounce'

export interface GlobalSearchState {
  debouncedQuery: string
  isActive: boolean
}

export function useGlobalSearch(query: string): GlobalSearchState {
  const debouncedQuery = useDebounce(query, 300)
  const isActive = debouncedQuery.trim().length >= 2

  return {
    debouncedQuery: isActive ? debouncedQuery.trim() : '',
    isActive,
  }
}
```

### Step 4: Criar GymGroup

Criar `apps/frontend/src/components/command-palette/gym-group.tsx`:

```tsx
'use client'

import { Command } from 'cmdk'
import { Building2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useGymsByName } from '@/features/gyms/api'

interface GymGroupProps {
  query: string
  isActive: boolean
  onSelect: () => void
}

export function GymGroup({ query, isActive, onSelect }: GymGroupProps) {
  const router = useRouter()

  const { data: gyms = [], isLoading } = useGymsByName({
    name: isActive ? query : '',
    page: 1,
  })

  if (!isActive) return null

  if (isLoading) {
    return (
      <Command.Group heading="Academias">
        <div
          data-testid="gym-group-loading"
          className="space-y-1 px-3 py-2"
          aria-label="Carregando academias"
        >
          {[1, 2].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded-md bg-surface-3" />
          ))}
        </div>
      </Command.Group>
    )
  }

  if (gyms.length === 0) {
    return (
      <Command.Group heading="Academias">
        <p className="px-3 py-2 text-sm text-subtle">Nenhuma academia encontrada.</p>
      </Command.Group>
    )
  }

  return (
    <Command.Group heading="Academias">
      {gyms.map((gym) => (
        <Command.Item
          key={gym.id}
          value={gym.title}
          onSelect={() => {
            const params = new URLSearchParams({ search: gym.title })
            router.push(`/academias?${params.toString()}`)
            onSelect()
          }}
          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground aria-selected:bg-surface-2"
        >
          <Building2 className="h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
          {gym.title}
        </Command.Item>
      ))}
    </Command.Group>
  )
}
```

### Step 5: Executar testes do GymGroup

```bash
pnpm --filter frontend test -- --run -t "GymGroup"
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
git add apps/frontend/src/components/command-palette/use-global-search.ts \
        apps/frontend/src/components/command-palette/gym-group.tsx \
        apps/frontend/src/components/command-palette/gym-group.test.tsx
git commit -m "feat(frontend): add useGlobalSearch hook and GymGroup for command palette"
```

## Critérios de Sucesso

- `GymGroup` visível para todos os usuários autenticados [RF-010]
- Query `< 2 chars` → `isActive=false` → grupo não renderiza (API não é chamada) [RF-011]
- `useGlobalSearch` retorna `debouncedQuery` com 300ms de delay [RF-012]
- Skeleton de loading exibido durante request [RF-013]
- Mensagem de vazio exibida quando API retorna lista vazia [RF-014]
- `tsc:check` e `lint:fix` passam sem erros
