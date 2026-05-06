# Dark/Light Theme Feature — Design Spec

**Date:** 2026-05-05
**Status:** Approved
**Scope:** `apps/frontend`

---

## Problem Statement

The frontend app is currently hardcoded as light-only (`color-scheme: light`). Users have no way to switch to a dark theme. This spec describes adding a manual dark/light toggle using `next-themes`, a floating action button (FAB), and a macOS-style dark palette.

---

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Theme library | `next-themes` | Handles FOUC, localStorage, SSR hydration; recommended by shadcn/ui |
| Dark aesthetic | Cinza Escuro (macOS-style) | Comfortable for prolonged use; #1c1c1e base |
| Toggle UI | Floating Action Button (FAB) | Always accessible, no navbar clutter |
| Options | Light / Dark only (no System) | Simpler UX; user explicit control |
| Scope | All pages (authenticated + public) | Single root-level mounting |

---

## Architecture

`next-themes` `ThemeProvider` wraps the entire app at the root layout level. The `ThemeToggleFAB` is mounted once inside the provider, making it available on every page without touching individual layouts.

```
app/layout.tsx
  └── ThemeProvider (next-themes, attribute="class", defaultTheme="light")
        ├── {children}               ← authenticated-shell, public-shell, etc.
        └── ThemeToggleFAB           ← fixed position, visible everywhere
```

`next-themes` injects an inline script before first paint that reads `localStorage` and applies the `dark` class to `<html>`. This eliminates flash of unstyled content (FOUC). `suppressHydrationWarning` on `<html>` prevents React hydration mismatch warnings.

---

## Files Changed

| File | Change |
|---|---|
| `apps/frontend/src/app/layout.tsx` | Add `ThemeProvider`, `suppressHydrationWarning` on `<html>`, mount `ThemeToggleFAB` |
| `apps/frontend/src/app/globals.css` | Add `.dark { }` block overriding semantic CSS variables |
| `apps/frontend/src/components/ui/theme-toggle-fab.tsx` | New FAB component |
| `apps/frontend/package.json` | Add `next-themes` dependency |

---

## Dark Theme CSS Tokens

Added as a `.dark { }` block in `globals.css`, overriding only the semantic aliases. The raw palette tokens (`--color-pure-white`, etc.) remain unchanged.

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

---

## ThemeToggleFAB Component

**Path:** `src/components/ui/theme-toggle-fab.tsx`

- Client component (`"use client"`)
- Uses `useTheme()` from `next-themes`
- Renders only after mount to prevent hydration mismatch (`mounted` state guard)
- Position: `fixed bottom-6 right-6 z-50`
- Size: 40×40px, pill border-radius
- **Light mode**: `bg-foreground text-background` (dark button, 🌙 icon)
- **Dark mode**: `bg-foreground text-background` (light button, ☀️ icon)
- Click toggles between `"light"` and `"dark"`
- Smooth icon transition via opacity/scale animation

```tsx
"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeToggleFAB() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background shadow-md transition-transform hover:scale-105"
      aria-label={theme === "dark" ? "Ativar tema claro" : "Ativar tema escuro"}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  )
}
```

---

## Layout Integration

**`src/app/layout.tsx`** — only change needed in routing:

```tsx
import { ThemeProvider } from "next-themes"
import { ThemeToggleFAB } from "@/components/ui/theme-toggle-fab"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          {children}
          <ThemeToggleFAB />
        </ThemeProvider>
      </body>
    </html>
  )
}
```

`authenticated-shell` and `public-shell` require **no changes** — FAB and Provider are already above them in the tree.

---

## Testing

**Unit tests** (`theme-toggle-fab.test.tsx`) with Vitest + React Testing Library:

| Test | Description |
|---|---|
| Renders moon icon in light mode | When `theme === "light"`, FAB shows 🌙 |
| Renders sun icon in dark mode | When `theme === "dark"`, FAB shows ☀️ |
| Toggles to dark on click | Clicking in light mode calls `setTheme("dark")` |
| Toggles to light on click | Clicking in dark mode calls `setTheme("light")` |
| Does not render before mount | Returns `null` when `mounted === false` (SSR safety) |

Mock strategy: `vi.mock("next-themes")` exposing `useTheme` with controlled state.

No E2E tests required — persistence behaviour is covered by `next-themes` internals; unit tests cover all component logic.

---

## Out of Scope

- System theme preference (`prefers-color-scheme`) — user chose manual control only
- Per-page forced themes (`forcedTheme`) — not required
- User account theme preference sync (server-side) — not required
- Animated icon transition beyond simple swap — can be added later if desired
