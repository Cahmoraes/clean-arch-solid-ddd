# Task 6: Frontend — Criar CheckInSearchInput e CheckInSortToggle [RF-006, RF-008, RF-010, RF-012, RF-013]

**Status:** DONE
**PRD:** `../prd/prd-checkin-badges-search-sort.md`
**Spec:** `../specs/checkin-badges-search-sort-design.md`
**Depends on:** N/A

## Visão Geral

Cria dois novos componentes puros:
1. **`CheckInSearchInput`** — campo de busca controlado (input + ícone de lupa + botão X para limpar). Reutiliza o `SearchBar` existente em `components/ui/search-bar.tsx` como base visual. Recebe `value`, `onChange` e `placeholder`.
2. **`CheckInSortToggle`** — botão toggle que alterna entre `"desc"` (▼ Mais recentes) e `"asc"` (▲ Mais antigos). Recebe `value` e `onValueChange`.

Ambos são componentes controlados simples — sem lógica de debounce ou URL (isso é responsabilidade do container/página).

## Arquivos

- Create: `apps/frontend/src/features/check-ins/components/check-in-search-input.tsx`
- Create: `apps/frontend/src/features/check-ins/components/check-in-sort-toggle.tsx`
- Create: `apps/frontend/src/features/check-ins/components/check-in-search-input.test.tsx`
- Create: `apps/frontend/src/features/check-ins/components/check-in-sort-toggle.test.tsx`

### Conformidade com as Skills Padrão

- code-style: componentes controlled, props explícitas, sem side effects internos

## Passos

### Passo 1: Escrever os testes que falham

Criar `apps/frontend/src/features/check-ins/components/check-in-search-input.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { CheckInSearchInput } from "./check-in-search-input"

describe("CheckInSearchInput", () => {
  it("renderiza o campo de busca com placeholder", () => {
    render(
      <CheckInSearchInput
        value=""
        onChange={vi.fn()}
        placeholder="Buscar academia..."
      />,
    )
    expect(screen.getByPlaceholderText("Buscar academia...")).toBeInTheDocument()
  })

  it("exibe o valor atual no input", () => {
    render(
      <CheckInSearchInput
        value="SmartFit"
        onChange={vi.fn()}
        placeholder="Buscar academia..."
      />,
    )
    expect(screen.getByDisplayValue("SmartFit")).toBeInTheDocument()
  })

  it("chama onChange ao digitar", async () => {
    const onChange = vi.fn()
    render(
      <CheckInSearchInput
        value=""
        onChange={onChange}
        placeholder="Buscar academia..."
      />,
    )
    await userEvent.type(screen.getByPlaceholderText("Buscar academia..."), "a")
    expect(onChange).toHaveBeenCalled()
  })

  it("exibe botão de limpar quando há valor e o chama com string vazia ao clicar", async () => {
    const onChange = vi.fn()
    render(
      <CheckInSearchInput
        value="SmartFit"
        onChange={onChange}
        placeholder="Buscar academia..."
      />,
    )
    const clearButton = screen.getByRole("button", { name: /limpar busca/i })
    expect(clearButton).toBeInTheDocument()
    await userEvent.click(clearButton)
    expect(onChange).toHaveBeenCalledWith("")
  })

  it("não exibe botão de limpar quando valor está vazio", () => {
    render(
      <CheckInSearchInput
        value=""
        onChange={vi.fn()}
        placeholder="Buscar academia..."
      />,
    )
    expect(screen.queryByRole("button", { name: /limpar busca/i })).not.toBeInTheDocument()
  })
})
```

Criar `apps/frontend/src/features/check-ins/components/check-in-sort-toggle.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { CheckInSortToggle } from "./check-in-sort-toggle"

describe("CheckInSortToggle", () => {
  it("exibe 'Mais recentes' quando value é desc", () => {
    render(<CheckInSortToggle value="desc" onValueChange={vi.fn()} />)
    expect(screen.getByText(/mais recentes/i)).toBeInTheDocument()
  })

  it("exibe 'Mais antigos' quando value é asc", () => {
    render(<CheckInSortToggle value="asc" onValueChange={vi.fn()} />)
    expect(screen.getByText(/mais antigos/i)).toBeInTheDocument()
  })

  it("chama onValueChange com asc ao clicar quando value é desc", async () => {
    const onValueChange = vi.fn()
    render(<CheckInSortToggle value="desc" onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole("button"))
    expect(onValueChange).toHaveBeenCalledWith("asc")
  })

  it("chama onValueChange com desc ao clicar quando value é asc", async () => {
    const onValueChange = vi.fn()
    render(<CheckInSortToggle value="asc" onValueChange={onValueChange} />)
    await userEvent.click(screen.getByRole("button"))
    expect(onValueChange).toHaveBeenCalledWith("desc")
  })
})
```

- [ ] **Step 1: Rodar os testes para verificar que falham**

```bash
cd apps/frontend && pnpm test -- check-in-search-input.test check-in-sort-toggle.test 2>&1 | tail -15
```

Resultado esperado: `FAIL` com `Cannot find module` para ambos os componentes.

### Passo 2: Criar `CheckInSearchInput`

Criar `apps/frontend/src/features/check-ins/components/check-in-search-input.tsx`:

```typescript
import { Search, X } from "lucide-react"
import { cn } from "@/lib/cn"

export interface CheckInSearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function CheckInSearchInput({
  value,
  onChange,
  placeholder = "Buscar por academia...",
  className,
}: CheckInSearchInputProps) {
  return (
    <div
      className={cn(
        "flex h-[52px] items-center gap-3 rounded-md border border-border bg-surface px-4 text-subtle",
        className,
      )}
    >
      <Search className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full flex-1 border-none bg-transparent text-[15px] text-foreground outline-none placeholder:text-subtle"
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          aria-label="Limpar busca"
          onClick={() => onChange("")}
          className="flex-shrink-0 rounded-full p-0.5 text-subtle hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
```

### Passo 3: Criar `CheckInSortToggle`

Criar `apps/frontend/src/features/check-ins/components/check-in-sort-toggle.tsx`:

```typescript
import { ArrowDown, ArrowUp } from "lucide-react"
import { cn } from "@/lib/cn"
import type { SortOrder } from "../api/extended-paths.js"

export interface CheckInSortToggleProps {
  value: SortOrder
  onValueChange: (value: SortOrder) => void
  className?: string
}

export function CheckInSortToggle({
  value,
  onValueChange,
  className,
}: CheckInSortToggleProps) {
  const isDesc = value === "desc"
  const nextValue: SortOrder = isDesc ? "asc" : "desc"

  return (
    <button
      type="button"
      onClick={() => onValueChange(nextValue)}
      className={cn(
        "inline-flex h-[52px] items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
      aria-label={isDesc ? "Ordenar por mais antigos" : "Ordenar por mais recentes"}
    >
      {isDesc ? (
        <>
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
          Mais recentes
        </>
      ) : (
        <>
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
          Mais antigos
        </>
      )}
    </button>
  )
}
```

**Nota:** `SortOrder` é importado de `../api/extended-paths.js`. Se a task-03 ainda não foi executada (task-06 roda em paralelo com task-03), defina `SortOrder` localmente como `type SortOrder = "asc" | "desc"` por ora e atualize o import após task-03 ser concluída.

- [ ] **Step 3: Rodar os testes para verificar que passam**

```bash
cd apps/frontend && pnpm test -- check-in-search-input.test check-in-sort-toggle.test 2>&1 | tail -25
```

Resultado esperado: todos os testes passam.

### Passo 4: Type check e lint

- [ ] **Step 4a: Type check**

```bash
cd apps/frontend && pnpm tsc:check 2>&1 | tail -10
```

Resultado esperado: zero erros (se task-03 não foi executada ainda, pode haver erro de import — veja nota no Passo 3).

- [ ] **Step 4b: Lint**

```bash
cd apps/frontend && pnpm lint:fix 2>&1 | tail -10
```

Resultado esperado: zero issues.

- [ ] **Step 4c: Commit**

```bash
git add \
  apps/frontend/src/features/check-ins/components/check-in-search-input.tsx \
  apps/frontend/src/features/check-ins/components/check-in-search-input.test.tsx \
  apps/frontend/src/features/check-ins/components/check-in-sort-toggle.tsx \
  apps/frontend/src/features/check-ins/components/check-in-sort-toggle.test.tsx
git commit -m "feat(check-ins): add CheckInSearchInput and CheckInSortToggle components"
```

## Critérios de Sucesso

- `<CheckInSearchInput value="smart" onChange={fn} />` renderiza input com valor e botão X
- Clicar no X chama `onChange("")`
- `<CheckInSortToggle value="desc" onValueChange={fn} />` exibe "Mais recentes" com ▼
- Clicar no toggle chama `onValueChange("asc")`
- `<CheckInSortToggle value="asc" onValueChange={fn} />` exibe "Mais antigos" com ▲
- Clicar no toggle chama `onValueChange("desc")`
- Sem texto quando `value` está vazio (sem crash)
- `pnpm test` e `pnpm tsc:check` passam
- RF-006 (campo de busca existe): ✅
- RF-008 (busca placeholder): ✅
- RF-010 (botão X para limpar): ✅
- RF-012 (toggle de ordenação existe): ✅
- RF-013 (toggle alterna entre desc/asc): ✅
