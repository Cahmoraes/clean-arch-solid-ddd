---
created_at: "2026-05-25T17:02:40-03:00"
updated_at: "2026-05-25T17:02:40-03:00"
---

# Design System Migration — Design Spec

## Visão Geral

Migrar o design system do frontend de uma filosofia monocromática (inspirada no Ollama) para uma paleta cromática rica (inspirada no Superhumon), mantendo o dark/light mode existente. A migração cobre três camadas: tokens de CSS (`globals.css`), componentes shadcn/ui, e páginas/features.

O `DESIGN.md` de `apps/frontend/DESIGN.md` é substituído pelo novo `DESIGN.md` da raiz do monorepo ao final da migração.

**Escopo explicitamente fora:** estrutura de três canvas (hero indigo / corpo branco / banda teal) e redesenho de layout de página — apenas paleta, tipografia, tokens e componentes são migrados.

---

## Decisões de Design

### Fonte

**Super Sans VF não está disponível.** Usa-se **Inter Variable** como fonte primária (carregada via `next/font/google`), que é o fallback oficial do novo design. SF Pro Rounded e ui-sans-serif são removidos como primários.

```
Display: Inter Variable — weight 600/700, letter-spacing -0.02em a -0.04em, line-height 0.96
Body:    Inter Variable — weight 400/500, line-height 1.5
Mono:    ui-monospace (mantido inalterado para código)
```

### Dark Mode

O dark mode existente (via `next-themes`, toggle `ThemeToggleFAB`) é mantido e adaptado. O novo design não define dark mode convencional, portanto os tokens dark são derivados da paleta cromática do novo design:

- Background dark: `#0e0c1f` (indigo deep)
- Surface/card dark: `#1b1938` (indigo navy)
- Texto dark: `#f5f3f0` (warm white)
- Accent dark: `#c9b4fa` (violet — sem inversão, funciona em ambos os modos)

A regra já estabelecida de usar **sempre tokens semânticos** nos componentes (nunca palette tokens) garante que o dark mode cascade corretamente após a atualização dos CSS vars.

---

## Seção 1 — Camada de Tokens

### Paleta de cores (`globals.css`)

| Token semântico | Light mode | Dark mode |
|---|---|---|
| `--color-background` | `#ffffff` | `#0e0c1f` |
| `--color-foreground` | `#292827` | `#f5f3f0` |
| `--color-card` | `#fafaf8` | `#1b1938` |
| `--color-card-foreground` | `#292827` | `#f5f3f0` |
| `--color-primary` | `#1b1938` | `#c9b4fa` |
| `--color-primary-foreground` | `#ffffff` | `#0e0c1f` |
| `--color-secondary` | `#f0edf8` | `#262240` |
| `--color-secondary-foreground` | `#1b1938` | `#c9b4fa` |
| `--color-muted` | `#f5f3f0` | `#262240` |
| `--color-muted-foreground` | `#73706d` | `#9a8fc4` |
| `--color-accent` | `#c9b4fa` | `#c9b4fa` |
| `--color-accent-foreground` | `#1b1938` | `#0e0c1f` |
| `--color-border` | `#e8e4dd` | `#2e2a4a` |
| `--color-input` | `#e8e4dd` | `#2e2a4a` |
| `--color-ring` | `#1b1938` | `#c9b4fa` |
| `--color-destructive` | `#dc2626` | `#f87171` |
| `--color-teal` | `#155555` | `#0e3030` |

Tokens de paleta bruta (ex.: `--color-pure-white`, `--color-pure-black`) são removidos ou tornados internos — componentes não devem referenciá-los diretamente.

### Tipografia

```css
--font-display: 'Inter Variable', system-ui, sans-serif;
--font-body:    'Inter Variable', system-ui, sans-serif;
--font-mono:    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
```

Classes utilitárias:
- `font-display`: aplica `--font-display` + `letter-spacing: -0.02em` + `line-height: 0.96`
- `font-body`: aplica `--font-body` + `letter-spacing: 0` + `line-height: 1.5`

### Border Radius

| Token | Valor | Uso |
|---|---|---|
| `--radius-xs` | `4px` | Badges pequenos |
| `--radius-sm` | `6px` | Chips, tooltips |
| `--radius-md` | `8px` | Botões, inputs (padrão interativo) |
| `--radius-lg` | `12px` | Cards, containers |
| `--radius-xl` | `16px` | Modais, dialogs, drawers |
| `--radius-full` | `9999px` | Tags, avatares, badges pill |

Remove o sistema binário anterior (pill em tudo + 12px em containers).

### Sombras

```css
--shadow-sm: 0 1px 3px rgba(0,0,0,0.08);    /* cards padrão */
--shadow-md: 0 8px 24px rgba(0,0,0,0.12);   /* modais, dropdowns elevados */
--shadow-none: 0 0 #0000;
```

---

## Seção 2 — Componentes

### Button
- `rounded-md` substitui `rounded-full`
- Variante `default`: `bg-primary` (indigo) + `text-primary-foreground`
- Variante `secondary`: `bg-secondary` + `text-secondary-foreground`
- Variante `outline`: `border-border` warm + `hover:bg-muted`
- Variante `ghost`: `hover:bg-muted`
- Variante `destructive`: `bg-destructive`
- Padding: mantém `px-4 py-2` (ajuste fino por tamanho)

### Input / Textarea
- `rounded-md` substitui `rounded-full`
- Borda: `border-input` (warm hairline)
- Placeholder: `text-muted-foreground`
- Focus ring: `ring-ring` (indigo em light, violet em dark)

### Card
- Mantém `rounded-lg` (12px)
- Adiciona `shadow-sm` (Level 1)
- Borda: `border-border` warm

### Dialog / Sheet
- `rounded-xl` (16px)
- `shadow-md` (Level 2)
- Background: `bg-card`

### Tabs
- Lista: `bg-muted rounded-md`
- Tab ativa: `bg-background rounded-md shadow-sm`
- Remove estilo pill anterior

### Badge
- **Mantém `rounded-full`** — único componente interativo que permanece pill
- Variante `default`: `bg-primary text-primary-foreground`
- Variante `secondary`: `bg-secondary text-secondary-foreground`
- Variante `outline`: `border-border`

### Dropdown / Select / Popover
- Container: `rounded-lg shadow-md`
- Item hover: `bg-muted`

### Skeleton
- Mantém comportamento; atualiza cor base para `bg-muted`

---

## Seção 3 — Páginas e Features

### AppSidebar
O componente mais impactado visualmente:

```
Sidebar: bg-primary (indigo #1b1938) em light mode
         bg-card (#1b1938) em dark mode + border-r border-border para separação visual
├── Logo / App name: text-primary-foreground (branco)
├── Nav items: text-primary-foreground/70, hover text-primary-foreground/90
├── Item ativo: pill bg-white text-primary (mantém padrão existente, cor atualizada)
├── Seção Admin: label text-accent (violet #c9b4fa)
└── Footer: Avatar + Nome + Role — text-primary-foreground/70
```

Sheet mobile (drawer): mesmo estilo da sidebar desktop.

### Dashboard `/inicio`

| Componente | Mudança |
|---|---|
| `ProfileHeroCard` | `shadow-sm`; badge Ativo em `bg-accent text-accent-foreground` (violet); badge Inativo em `bg-muted` |
| `KpiCards` | `shadow-sm`; número/destaque em `text-primary`; ícone em `text-primary` |
| `WeeklyChart` | Barras em `primary` com opacidade variável (20%→100%); tooltip com `shadow-md` |
| `HeatmapCard` | Escala de intensidade derivada de `primary` (indigo, opacidade crescente) |
| `CheckinsTimeline` | Validado: `bg-accent` (violet); Pendente: `bg-amber-100 text-amber-800` (dark: `bg-amber-900/30 text-amber-300`); Rejeitado: `bg-destructive/10 text-destructive` |
| `StatusDonutCard` | **Sem alteração** — exceção semântica para visualização de dados |

### Páginas de autenticação (`/login`, `/register`, `/forgot-password`)
- Cabeçalho/hero: `bg-primary` (indigo) com `text-primary-foreground`
- Formulário: `bg-background` padrão
- Aplica identidade cromática na área acima do fold sem sidebar

### Páginas de listagem (`/academias`, `/check-ins`, `/admin/*`)
- Sem redesign estrutural
- Herdam as mudanças de tokens e componentes (shadow nos cards, `rounded-md` nos botões, indigo nos CTAs primários)

---

## Substituição do DESIGN.md

Ao final da migração:
1. O arquivo `apps/frontend/DESIGN.md` é substituído pelo conteúdo do `DESIGN.md` da raiz do monorepo
2. Uma nota de adaptação é adicionada ao topo indicando que Super Sans VF foi substituído por Inter Variable e que a estrutura de três canvas não é aplicada no contexto SaaS

---

## Convenções Mantidas

- **Tokens semânticos obrigatórios** em componentes — nunca palette tokens estáticos
- `cn` com `clsx + tailwind-merge` para composição de classes
- Radix UI como base dos componentes acessíveis
- Tailwind v4 com `@theme` em `globals.css`
- `next-themes` para toggle dark/light
- `ThemeToggleFAB` no RootLayout (sem alteração)

---

## Critérios de Conclusão

- `pnpm --filter frontend tsc:check` passa sem erros
- `pnpm --filter frontend lint:fix` passa sem issues
- `pnpm --filter frontend build` passa
- Dark mode e light mode funcionam em todas as rotas autenticadas
- Sidebar exibe fundo indigo em light mode
- Botões e inputs usam `rounded-md` (não mais pill)
- Nenhum componente referencia tokens de paleta estáticos (`pure-white`, `pure-black`, etc.)
