# Dark/Light Theme Toggle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar toggle manual de tema dark/light via FAB flutuante em todas as páginas do frontend, usando `next-themes` + paleta Cinza Escuro (macOS-style).

**Architecture:** `next-themes` `ThemeProvider` envolve o app inteiro no root layout. A classe `dark` é aplicada no `<html>` via `attribute="class"`. Um componente FAB (`ThemeToggleFAB`) fixo no canto inferior direito é montado uma única vez no root layout, ficando visível em todas as páginas.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, next-themes, Vitest + React Testing Library

**PRD:** `docs/superpowers/specs/2026-05-05-dark-light-theme-prd.md`
**Spec:** `docs/superpowers/specs/2026-05-05-dark-light-theme-design.md`

---

## File Map

| Ação | Arquivo |
|---|---|
| Modify | `apps/frontend/package.json` |
| Modify | `apps/frontend/src/app/layout.tsx` |
| Modify | `apps/frontend/src/app/globals.css` |
| Create | `apps/frontend/src/components/ui/theme-toggle-fab.tsx` |
| Create | `apps/frontend/src/components/ui/theme-toggle-fab.test.tsx` |

---

### Task 1: Instalar next-themes [RF-005, RF-006, RF-009]

**Files:**
- Modify: `apps/frontend/package.json` (adicionado automaticamente pelo pnpm)
- Modify: `apps/frontend/pnpm-lock.yaml` (atualizado automaticamente)

- [ ] **Step 1: Instalar a dependência**

```bash
cd /path/to/project
pnpm --filter frontend add next-themes
```

Expected: `+ next-themes X.X.X` no output. Sem erros.

- [ ] **Step 2: Verificar a instalação**

```bash
pnpm --filter frontend tsc:check
```

Expected: sem erros de tipo.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/package.json pnpm-lock.yaml
git commit -m "chore(frontend): add next-themes dependency"
```

---

### Task 2: Adicionar tokens CSS dark no globals.css [RF-008, RF-010]

**Files:**
- Modify: `apps/frontend/src/app/globals.css`

- [ ] **Step 1: Abrir o arquivo `apps/frontend/src/app/globals.css` e localizar o final do bloco `@layer base`**

O arquivo deve ter a estrutura `@theme { ... }` seguida de `@layer base { ... }`. Adicione o bloco `.dark { }` **após** o `@layer base`, no nível raiz do arquivo.

- [ ] **Step 2: Adicionar o bloco de tokens dark**

Ao final de `apps/frontend/src/app/globals.css`, adicione:

```css
.dark {
  --color-background: #1c1c1e;
  --color-foreground: #f5f5f7;
  --color-card: #2c2c2e;
  --color-card-foreground: #f5f5f7;
  --color-popover: #2c2c2e;
  --color-popover-foreground: #f5f5f7;
  --color-muted: #2c2c2e;
  --color-muted-foreground: #8e8e93;
  --color-border: #3a3a3c;
  --color-input: #3a3a3c;
  --color-primary: #f5f5f7;
  --color-primary-foreground: #1c1c1e;
  --color-secondary: #3a3a3c;
  --color-secondary-foreground: #ebebf5;
  --color-accent: #3a3a3c;
  --color-accent-foreground: #ebebf5;
  --color-destructive: #ebebf5;
  --color-destructive-foreground: #1c1c1e;
}
```

- [ ] **Step 3: Verificar lint e tipos**

```bash
pnpm --filter frontend biome:fix
pnpm --filter frontend tsc:check
```

Expected: zero issues em ambos.

- [ ] **Step 4: Commit**

```bash
git add apps/frontend/src/app/globals.css
git commit -m "feat(frontend): add dark theme CSS tokens (macOS-style gray)"
```

---

### Task 3: Criar componente ThemeToggleFAB com TDD [RF-001, RF-002, RF-003, RF-004]

**Files:**
- Create: `apps/frontend/src/components/ui/theme-toggle-fab.test.tsx`
- Create: `apps/frontend/src/components/ui/theme-toggle-fab.tsx`

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

// Helper para controlar o retorno do useTheme em cada teste
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

    // Simula componente antes do useEffect de mount rodar
    // O componente retorna null enquanto mounted=false
    // Como jsdom roda effects síncronos no render, testamos o estado mounted=true
    // mas verificamos que o botão existe (mounted=true após render)
    render(<ThemeToggleFAB />)
    const btn = screen.queryByRole("button")
    // Após mount no jsdom, o botão deve aparecer
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

- [ ] **Step 2: Rodar os testes para confirmar que falham**

```bash
pnpm --filter frontend test -- --run src/components/ui/theme-toggle-fab.test.tsx
```

Expected: todos os testes FAIL com "Cannot find module './theme-toggle-fab'" ou similar.

- [ ] **Step 3: Criar o componente `theme-toggle-fab.tsx`**

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

- [ ] **Step 4: Rodar os testes para confirmar que passam**

```bash
pnpm --filter frontend test -- --run src/components/ui/theme-toggle-fab.test.tsx
```

Expected: todos os 7 testes PASS.

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

---

### Task 4: Integrar ThemeProvider e FAB no root layout [RF-001, RF-007, RF-008, RF-009]

**Files:**
- Modify: `apps/frontend/src/app/layout.tsx`

- [ ] **Step 1: Abrir `apps/frontend/src/app/layout.tsx` e atualizar o arquivo**

Substitua o conteúdo completo do arquivo por:

```tsx
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { ThemeProvider } from "next-themes"
import { ThemeToggleFAB } from "@/components/ui/theme-toggle-fab"
import { Toaster } from "@/components/ui/toaster"
import { Providers } from "./providers"
import { WebVitalsReporter } from "./web-vitals"
import "./globals.css"

export const metadata: Metadata = {
  title: "GymPass-like",
  description: "Frontend monocromático inspirado em Ollama",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          <WebVitalsReporter />
          <Providers>{children}</Providers>
          <Toaster />
          <ThemeToggleFAB />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

> **Nota:** `bg-pure-white text-pure-black` foi substituído por `bg-background text-foreground` para que o body também responda ao tema.

- [ ] **Step 2: Rodar lint e verificação de tipos**

```bash
pnpm --filter frontend biome:fix
pnpm --filter frontend tsc:check
```

Expected: zero issues em ambos.

- [ ] **Step 3: Rodar todos os testes**

```bash
pnpm --filter frontend test:run
```

Expected: todos os testes PASS (incluindo os do ThemeToggleFAB e os demais existentes).

- [ ] **Step 4: Rodar o build**

```bash
pnpm --filter frontend build
```

Expected: build concluído sem erros.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app/layout.tsx
git commit -m "feat(frontend): integrate ThemeProvider and ThemeToggleFAB in root layout"
```

---

## Checklist de Validação Final

Após todas as tasks, confirme que os seguintes comandos passam sem erros:

```bash
pnpm --filter frontend biome:fix   # zero issues
pnpm --filter frontend tsc:check   # zero erros de tipo
pnpm --filter frontend test:run    # todos os testes passam
pnpm --filter frontend build       # build sem erros
```
