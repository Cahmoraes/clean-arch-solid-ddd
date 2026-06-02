# Task 1: Install cmdk + CommandPalette shell + SearchBar onClick + AuthenticatedShell wiring [RF-001, RF-002, RF-003, RF-004, RF-005, RF-022, RF-023, RF-024, RF-025, RF-026]

**Status:** PENDING
**PRD:** `../prd/prd-global-command-palette.md`
**Spec:** `../specs/global-command-palette-design.md`
**Depends on:** N/A

## Visão Geral

Instala `cmdk`, cria o `CommandPalette` como shell modal vazio (sem grupos de resultado ainda), atualiza `SearchBar` para aceitar `onClick` no div wrapper, e conecta tudo no `AuthenticatedShell` com estado `isOpen` e listener `⌘K`/`Ctrl+K`. O palette abre, fecha (Esc + backdrop), tem keyboard navigation e focus trap via `cmdk` + Radix Dialog.

## Arquivos

- Install: `cmdk` (pnpm --filter frontend add cmdk)
- Modify: `apps/frontend/src/components/ui/search-bar.tsx`
- Create: `apps/frontend/src/components/command-palette/command-palette.tsx`
- Modify: `apps/frontend/src/components/layout/authenticated-shell.tsx`
- Create: `apps/frontend/src/components/command-palette/command-palette.test.tsx`

### Conformidade com as Skills Padrão

- typescript-advanced: tipos corretos para event handlers, props com Omit
- test-antipatterns: não mockar cmdk internamente — testar pelo DOM

## Passos

### Step 1: Instalar cmdk

```bash
pnpm --filter frontend add cmdk
```

Verificar que a versão foi adicionada ao `apps/frontend/package.json`:
```bash
grep cmdk apps/frontend/package.json
```
Expected: linha com `"cmdk": "^X.Y.Z"`

### Step 2: Escrever os testes para CommandPalette (TDD)

Criar `apps/frontend/src/components/command-palette/command-palette.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi } from 'vitest'
import { CommandPalette } from './command-palette'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

describe('CommandPalette', () => {
  test('não renderiza o input quando open=false', () => {
    render(<CommandPalette open={false} onOpenChange={vi.fn()} />)
    expect(
      screen.queryByPlaceholderText('Buscar páginas, academias, usuários...'),
    ).not.toBeInTheDocument()
  })

  test('renderiza o input quando open=true', () => {
    render(<CommandPalette open={true} onOpenChange={vi.fn()} />)
    expect(
      screen.getByPlaceholderText('Buscar páginas, academias, usuários...'),
    ).toBeInTheDocument()
  })

  test('chama onOpenChange(false) ao pressionar Esc', async () => {
    const onOpenChange = vi.fn()
    render(<CommandPalette open={true} onOpenChange={onOpenChange} />)
    await userEvent.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  test('exibe mensagem de resultado vazio quando nada foi digitado', () => {
    render(<CommandPalette open={true} onOpenChange={vi.fn()} />)
    expect(screen.getByText('Nenhum resultado encontrado.')).toBeInTheDocument()
  })
})
```

### Step 3: Executar testes para confirmar que falham

```bash
pnpm --filter frontend test -- --run -t "CommandPalette"
```

Expected: FAIL — `Cannot find module './command-palette'`

### Step 4: Criar o CommandPalette

Criar `apps/frontend/src/components/command-palette/command-palette.tsx`:

```tsx
'use client'

import { Root, Portal, Overlay, Content } from '@radix-ui/react-dialog'
import { Command } from 'cmdk'
import { Search } from 'lucide-react'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  return (
    <Root open={open} onOpenChange={onOpenChange}>
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
                placeholder="Buscar páginas, academias, usuários..."
                className="flex h-12 w-full bg-transparent py-3 text-sm text-foreground placeholder:text-subtle outline-none"
              />
            </div>
            <Command.List className="max-h-[400px] overflow-y-auto py-2">
              <Command.Empty className="py-8 text-center text-sm text-subtle">
                Nenhum resultado encontrado.
              </Command.Empty>
            </Command.List>
          </Command>
        </Content>
      </Portal>
    </Root>
  )
}
```

### Step 5: Executar testes do CommandPalette para confirmar que passam

```bash
pnpm --filter frontend test -- --run -t "CommandPalette"
```

Expected: PASS — 4 testes verdes

### Step 6: Escrever os testes para SearchBar onClick

Criar `apps/frontend/src/components/ui/search-bar.test.tsx` (ou adicionar ao existente se já houver):

```tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi } from 'vitest'
import { SearchBar } from './search-bar'

describe('SearchBar', () => {
  test('chama onClick ao clicar no wrapper quando onClick é fornecido', async () => {
    const onClick = vi.fn()
    render(<SearchBar onClick={onClick} placeholder="buscar" />)
    await userEvent.click(screen.getByRole('presentation'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  test('não chama onClick quando não é fornecido', async () => {
    // deve renderizar sem erros
    render(<SearchBar placeholder="buscar" />)
    expect(screen.getByPlaceholderText('buscar')).toBeInTheDocument()
  })
})
```

Nota: se existir um arquivo de teste para SearchBar, adicione esses casos ao arquivo existente em vez de criar um novo.

### Step 7: Atualizar SearchBar para aceitar onClick no div wrapper

Editar `apps/frontend/src/components/ui/search-bar.tsx`:

```tsx
import { Search } from 'lucide-react'
import type { InputHTMLAttributes, MouseEventHandler } from 'react'
import { cn } from '@/lib/cn'

export interface SearchBarProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'onClick'> {
  className?: string
  /** Exibe a dica de atalho ⌘K à direita. Default: false. */
  showShortcut?: boolean
  /** Callback acionado ao clicar no wrapper (usado para abrir o Command Palette). */
  onClick?: MouseEventHandler<HTMLDivElement>
}

export function SearchBar({
  className,
  showShortcut = false,
  onClick,
  ...inputProps
}: SearchBarProps) {
  return (
    <div
      role={onClick ? 'presentation' : undefined}
      onClick={onClick}
      className={cn(
        'flex h-[52px] items-center gap-3 rounded-md border border-border bg-surface px-4 text-subtle',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      <Search className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <input
        type="search"
        className="h-full flex-1 border-none bg-transparent text-[15px] text-foreground outline-none placeholder:text-subtle"
        {...inputProps}
      />
      {showShortcut && (
        <kbd className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-subtle">
          ⌘K
        </kbd>
      )}
    </div>
  )
}
```

### Step 8: Executar testes do SearchBar

```bash
pnpm --filter frontend test -- --run -t "SearchBar"
```

Expected: PASS

### Step 9: Atualizar authenticated-shell.tsx para conectar o CommandPalette

Editar `apps/frontend/src/components/layout/authenticated-shell.tsx`:

**Adicionar imports no topo** (logo após `import type { ReactNode } from "react"`):

```tsx
import { useState, useEffect } from 'react'
import { CommandPalette } from '@/components/command-palette/command-palette'
```

**Adicionar estado e listener dentro de `AuthenticatedShell`**, após `const displayName = ...`:

```tsx
const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setIsCommandPaletteOpen(true)
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])
```

**Atualizar o `SearchBar` no header** para passar `onClick` e `readOnly`:

```tsx
<SearchBar
  showShortcut
  placeholder="Buscar..."
  aria-label="Buscar"
  className="max-w-[460px] flex-1 max-[560px]:hidden"
  onClick={() => setIsCommandPaletteOpen(true)}
  readOnly
  tabIndex={-1}
/>
```

**Adicionar `<CommandPalette />` após `</header>` e antes de `<main>`**:

```tsx
</header>

<CommandPalette
  open={isCommandPaletteOpen}
  onOpenChange={setIsCommandPaletteOpen}
/>

<main className="flex-1 overflow-y-auto">
```

### Step 10: Rodar lint e typecheck

```bash
pnpm --filter frontend tsc:check
pnpm --filter frontend lint:fix
```

Expected: zero erros

### Step 11: Rodar todos os testes do frontend

```bash
pnpm --filter frontend test -- --run
```

Expected: todos passando (os anteriores não devem regredir)

### Step 12: Commit

```bash
git add apps/frontend/src/components/command-palette/ \
        apps/frontend/src/components/ui/search-bar.tsx \
        apps/frontend/src/components/layout/authenticated-shell.tsx \
        apps/frontend/package.json pnpm-lock.yaml
git commit -m "feat(frontend): add CommandPalette shell with ⌘K trigger and SearchBar onClick"
```

## Critérios de Sucesso

- `cmdk` instalado e presente no `package.json` do frontend
- `CommandPalette` abre ao pressionar ⌘K/Ctrl+K em qualquer página autenticada [RF-001]
- `CommandPalette` abre ao clicar no `SearchBar` do header [RF-002]
- `CommandPalette` fecha ao pressionar Esc [RF-003]
- `CommandPalette` fecha ao clicar no overlay backdrop [RF-004]
- Focus trap funciona (foco não escapa do modal) [RF-025]
- ARIA: `Command.Input` tem `role="combobox"` e `aria-autocomplete="list"` (provido pelo cmdk) [RF-026]
- Keyboard navigation com ↑↓ entre itens (provido pelo cmdk) [RF-022, RF-023]
- `tsc:check` e `lint:fix` passam sem erros
