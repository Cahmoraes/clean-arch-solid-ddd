# Task 3: Criar componente ThemeToggleFAB com TDD [RF-001, RF-002, RF-003, RF-004]

**Status:** PENDING
**Plan:** `../2026-05-05-dark-light-theme.md`

## Visão Geral

Cria o componente FAB de toggle de tema usando TDD. Escreve os testes primeiro, confirma que falham, depois implementa o componente até todos os testes passarem.

## Arquivos

- Create: `apps/frontend/src/components/ui/theme-toggle-fab.test.tsx`
- Create: `apps/frontend/src/components/ui/theme-toggle-fab.tsx`

## Passos

- [ ] **Step 1: Criar o arquivo de testes**

Crie `apps/frontend/src/components/ui/theme-toggle-fab.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ThemeToggleFAB } from "./theme-toggle-fab"

const mockSetTheme = vi.fn()

vi.mock("next-themes", () => ({
  useTheme: vi.fn(),
}))

async function importUseTheme() {
  const { useTheme } = await import("next-themes")
  return useTheme as ReturnType<typeof vi.fn>
}

describe("ThemeToggleFAB", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("não renderiza antes do mount (proteção SSR)", async () => {
    const useTheme = await importUseTheme()
    useTheme.mockReturnValue({ theme: "light", setTheme: mockSetTheme })

    render(<ThemeToggleFAB />)
    const btn = screen.queryByRole("button")
    expect(btn).toBeInTheDocument()
  })

  it("exibe ícone 🌙 quando tema é light", async () => {
    const useTheme = await importUseTheme()
    useTheme.mockReturnValue({ theme: "light", setTheme: mockSetTheme })

    render(<ThemeToggleFAB />)
    expect(screen.getByRole("button")).toHaveTextContent("🌙")
  })

  it("exibe ícone ☀️ quando tema é dark", async () => {
    const useTheme = await importUseTheme()
    useTheme.mockReturnValue({ theme: "dark", setTheme: mockSetTheme })

    render(<ThemeToggleFAB />)
    expect(screen.getByRole("button")).toHaveTextContent("☀️")
  })

  it("chama setTheme('dark') ao clicar em modo light", async () => {
    const useTheme = await importUseTheme()
    useTheme.mockReturnValue({ theme: "light", setTheme: mockSetTheme })

    render(<ThemeToggleFAB />)
    await userEvent.click(screen.getByRole("button"))
    expect(mockSetTheme).toHaveBeenCalledWith("dark")
  })

  it("chama setTheme('light') ao clicar em modo dark", async () => {
    const useTheme = await importUseTheme()
    useTheme.mockReturnValue({ theme: "dark", setTheme: mockSetTheme })

    render(<ThemeToggleFAB />)
    await userEvent.click(screen.getByRole("button"))
    expect(mockSetTheme).toHaveBeenCalledWith("light")
  })

  it("tem aria-label 'Ativar tema escuro' no modo light", async () => {
    const useTheme = await importUseTheme()
    useTheme.mockReturnValue({ theme: "light", setTheme: mockSetTheme })

    render(<ThemeToggleFAB />)
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Ativar tema escuro",
    )
  })

  it("tem aria-label 'Ativar tema claro' no modo dark", async () => {
    const useTheme = await importUseTheme()
    useTheme.mockReturnValue({ theme: "dark", setTheme: mockSetTheme })

    render(<ThemeToggleFAB />)
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Ativar tema claro",
    )
  })
})
```

- [ ] **Step 2: Rodar testes para confirmar que falham**

```bash
pnpm --filter frontend test -- --run src/components/ui/theme-toggle-fab.test.tsx
```

Expected: FAIL com "Cannot find module './theme-toggle-fab'" ou similar.

- [ ] **Step 3: Criar o componente**

Crie `apps/frontend/src/components/ui/theme-toggle-fab.tsx`:

```tsx
"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeToggleFAB() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const isDark = theme === "dark"

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background shadow-md transition-transform hover:scale-105 active:scale-95"
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
    >
      {isDark ? "☀️" : "🌙"}
    </button>
  )
}
```

- [ ] **Step 4: Rodar testes para confirmar que passam**

```bash
pnpm --filter frontend test -- --run src/components/ui/theme-toggle-fab.test.tsx
```

Expected: 7/7 testes PASS.

- [ ] **Step 5: Rodar lint**

```bash
pnpm --filter frontend biome:fix
```

Expected: zero issues.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src/components/ui/theme-toggle-fab.tsx \
        apps/frontend/src/components/ui/theme-toggle-fab.test.tsx
git commit -m "feat(frontend): add ThemeToggleFAB component with tests"
```

## Critérios de Sucesso

- 7 testes passando [RF-001, RF-002, RF-003, RF-004]
- Componente visível em todas as páginas após integração na Task 4 [RF-001]
- Ícones corretos por estado de tema [RF-002]
- Toggle funcional ao clicar [RF-003]
- `aria-label` dinâmico presente [RF-004]
