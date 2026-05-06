# Task 4: Integrar ThemeProvider e FAB no root layout [RF-001, RF-007, RF-008, RF-009]

**Status:** PENDING
**Plan:** `../2026-05-05-dark-light-theme.md`

## Visão Geral

Modifica o root layout do Next.js para envolver toda a aplicação com o `ThemeProvider` do `next-themes`, adiciona `suppressHydrationWarning` no `<html>` e monta o `ThemeToggleFAB` uma única vez, tornando-o disponível em todas as páginas.

## Arquivos

- Modify: `apps/frontend/src/app/layout.tsx`

## Passos

- [ ] **Step 1: Substituir o conteúdo de `apps/frontend/src/app/layout.tsx`**

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

> **Nota:** `bg-pure-white text-pure-black` substituído por `bg-background text-foreground` para que o body responda ao tema automaticamente.

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

Expected: todos os testes PASS.

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

## Critérios de Sucesso

- FAB visível em páginas autenticadas e públicas [RF-001]
- `defaultTheme="light"` garante tema padrão correto [RF-007]
- Classe `dark` aplicada globalmente via `attribute="class"` [RF-008]
- `suppressHydrationWarning` no `<html>` previne FOUC e warnings de hidratação [RF-009]
- `biome:fix` + `tsc:check` + `test:run` + `build` passam sem erros
