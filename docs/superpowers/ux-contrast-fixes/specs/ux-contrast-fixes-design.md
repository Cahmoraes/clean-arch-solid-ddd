---
created_at: "2026-05-27T11:56:13-03:00"
updated_at: "2026-05-27T11:56:13-03:00"
---

# UX Contrast Fixes

## Problema

Dois pontos de contraste insuficiente no frontend, ambos com mesma causa raiz.

### Causa raiz

Componentes usam `text-foreground` / `text-muted-foreground` sobre `bg-accent`. Em dark mode, `accent = #c9b4fa` (violeta claro) e `foreground = #f5f3f0` (quase branco) → contraste ~1.2:1. O design system já provê o par semântico correto: `accent-foreground` (`#0e0c1f` dark / `#1b1938` light), projetado para texto sobre fundo `accent`.

---

## Escopo

### Fix 1 — `DemoBanner` e `ErrorAlert` (`/assinatura`)

**Arquivo:** `apps/frontend/src/app/(authenticated)/assinatura/page.tsx`

| Componente | Elemento | Antes | Depois |
|---|---|---|---|
| `DemoBanner` | container | `text-foreground` | `text-accent-foreground` |
| `DemoBanner` | `<span>` secundário | `text-muted-foreground` | `text-accent-foreground/70` |
| `ErrorAlert` | container | `text-foreground` | `text-accent-foreground` |

Contraste resultante:
- Dark: `#0e0c1f` sobre `#c9b4fa` → ~10.7:1 ✓ (passa WCAG AA + AAA)
- Light: `#1b1938` sobre `#c9b4fa` → ~9.1:1 ✓

### Fix 2 — Botão "Entrar" (`/`)

**Arquivo:** `apps/frontend/src/app/(public)/page.tsx`

| Estado | Antes | Depois |
|---|---|---|
| hover | `hover:bg-accent` | `hover:bg-accent hover:text-accent-foreground` |

Contraste resultante em dark mode hover: `#0e0c1f` sobre `#c9b4fa` → ~10.7:1 ✓

---

## Fora do escopo

- Alteração de paleta ou tokens no `globals.css`
- Outros componentes que possam usar `bg-accent` (não reportados)
- Mudança visual em light mode além da correção do texto secundário

---

## Validação

Após fix: capturar screenshots com playwright-cli em dark + light mode para confirmar contraste visual. Executar `pnpm lint:fix`, `pnpm tsc:check`, `pnpm test`.
