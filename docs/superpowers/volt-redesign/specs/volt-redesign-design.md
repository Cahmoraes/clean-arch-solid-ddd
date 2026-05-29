---
created_at: "2026-05-29T11:09:21-03:00"
updated_at: "2026-05-29T11:09:21-03:00"
---

# VOLT Redesign — Design Spec

## Resumo

Rebranding completo **GymPass → VOLT** e redesign do frontend fiel aos mockups
gerados no Claude Design (pasta `volt/`). A stack é preservada
(Next.js 16 · React 19 · Tailwind v4 · shadcn/ui · next-themes · TanStack Query ·
Zustand). A migração é entregue em um único plano, cobrindo tokens, fontes,
marca, shell e todas as telas mockadas.

**Identidade VOLT:** plataforma de acesso a academias com estética atlética e de
alto contraste — energia vinda de escala e contraste (números grandes em mono,
display grotesk, accent verde decisivo), nunca de gradientes/glows. Logo: marca
raio/bolt (`zap`) + wordmark **VOLT**.

## Decisões de design (sessão)

| Decisão | Escolha |
|---|---|
| Estratégia CSS | **Retheme via tokens** — substituir tokens/fontes no `globals.css` e manter os componentes shadcn; reconstruir composições ricas do Volt sobre os primitivos |
| Abrangência | **Migração completa** de todas as telas mockadas, em um plano |
| Tema padrão | **`dark`** (light continua via toggle) |
| Painel de Tweaks | **Não portar** — accent/raio/densidade fixos nos defaults do Volt |
| Rebrand | **Visual + metadados + referências internas** |
| Fontes | **Space Grotesk + Inter + JetBrains Mono** |

**Precedência:** decisões desta sessão prevalecem sobre o protótipo. O
`volt/DESIGN.md` é a fonte de verdade para valores de token e composição visual.

## Arquitetura da camada de estilo

### Tokens (núcleo)

Reescrever `apps/frontend/src/app/globals.css` adotando o `volt/globals.css`
como base. Ele remapeia os **mesmos nomes semânticos** que o shadcn já consome,
agora apontando para a paleta Volt:

- **Accent:** `--accent #39e58c` (hover `#22c976`), ink-on-accent `#0a0a0a`.
  Mapeia para `--color-primary`; foreground sobre accent é sempre near-black —
  **nunca branco sobre accent**.
- **Neutros (dark — default):** bg `#080808`, surface `#161616`, surface-2
  `#1d1d1d`, surface-3 `#242424`, border `#2a2a2a`, border-strong `#3a3a3a`,
  text `#f6f6f4`, text-2 `#a3a39c`, text-3 `#6f6f68`.
- **Neutros (light):** bg `#f1f1ec`, surface `#ffffff`, surface-2 `#f7f7f3`,
  surface-3 `#efefe9`, border `#e4e4dc`, border-strong `#d3d3c9`, text `#111110`,
  text-2 `#57574f`, text-3 `#8a8a80`.
- **Sidebar (tokens dedicados `--color-sidebar-*`):** sempre lê a rampa escura,
  independente do tema. Light-theme: bg `#111110`, item ativo `#ffffff`/ink
  `#111110`. Dark-theme: bg `#0f0f0f`, item ativo `var(--accent)`/ink `#0a0a0a`.
- **Status (distintos do accent):** success `#2fcf80`, warning `#ffb443`,
  danger `#ff5a4d`, cada um com variante `-soft` (~14–16% alpha).
- **Radii (vinculados):** `--r-sm 8px`, `--r-control 14px`, `--r-card 22px`,
  `--r-pill 999px` — fixos (sem painel de tweaks). Nunca cantos retos.
- **Spacing/densidade:** `--pad-card 24px`, `--gap-row 14px`, `--content-max
  1180px`, `--sidebar-w 268px` (→ 76px icon-rail < 860px) — fixos nos defaults.
- **Elevação:** profundidade por surface-step + borda 1px; sombras leves
  (`--shadow-sm`, `--shadow-md`, `--shadow-pop`); foco `--ring` accent-mix 28%.

**Disciplina mantida:** componentes consomem **apenas tokens semânticos**, nunca
palette tokens diretos. Dark/light via seletor `.dark`.

### Fontes

`apps/frontend/src/app/layout.tsx` carrega via `next/font/google`:

- **Space Grotesk** → `--font-space-grotesk` (títulos, números, wordmark)
- **Inter** → `--font-inter` (corpo)
- **JetBrains Mono** → `--font-jetbrains-mono` (eyebrows, IDs, timestamps,
  contagens, KPIs, preços — sempre `font-variant-numeric: tabular-nums`)

Escala tipográfica conforme `DESIGN.md`: `display-xl` clamp(30→44px), `title`
21px, `heading` 18px, `body` 15px, `label` 13px/600, `eyebrow` 11px uppercase
0.16em mono, `metric` 38px/700 mono, `metric-xl` 68px.

### Theming

`next-themes` com `attribute="class"` e **`defaultTheme="dark"`**, seletor
`.dark`. O toggle existente (`ThemeToggleFAB`) é reestilizado para o knob
deslizante Volt (pill 132px → ícone 42px < 860px). Persistência em localStorage,
sem FOUC.

## Componentes

Primitivos **shadcn mantidos** e reestilizados via tokens: Button, Dialog,
Input, Label, Tabs, AlertDialog, DropdownMenu, Pagination, Skeleton, EmptyState,
FormField, Toaster, AdminBadge.

Novos componentes em `apps/frontend/src/components/ui/` (recipes Volt sobre
tokens/shadcn, kebab-case, semantic tokens):

- `stat-card` — KPI com ícone accent, valor mono grande, delta up/down
- `segmented` — abas de filtro com contadores mono (`seg-count`)
- `page-header` — eyebrow mono + h1 display + subtítulo + ação à direita
- `eyebrow` — kicker mono uppercase
- `avatar` — círculo accent, iniciais em display font (36–88px)
- list-rows — `user-row`, `checkin-row`, `activity-row`, `rank-row` (hover nudge)
- `week-chart` / `chart-bar` — barras CSS+SVG, single accent (sem nova dep)
- `brand-mark` + wordmark VOLT — ícone raio + texto
- `search-bar` — ícone leading + hint `⌘K`

Cada componente: uma responsabilidade clara, props tipadas, testável isolado.

## Shell (`apps/frontend/src/components/layout/`)

- **`authenticated-shell`** — sidebar dark fixa: brand → grupos de nav com labels
  mono (`Principal`/`Admin`) → user-chip + logout. `main-col` com `topbar` sticky
  blurred (search-bar, theme-toggle knob, sino com dot accent, avatar) +
  `content` no `content-max 1180px`. Item ativo = pill preenchida.
- **`public-shell`** — header/footer rebrandizados VOLT.

## Telas (reconstruídas fiéis ao mockup)

| Tela | Rota | Composição-chave |
|---|---|---|
| Login | `/login` | split 1.05/1fr; painel-marca dark + hero ("você" em accent) + stats mono; form com botão accent block + Google ghost + divider |
| Dashboard | `/inicio` | `stat-grid` (4 KPIs) + `dash-grid` (week-chart + top academias rank-list) + atividade recente |
| Admin Usuários | `/admin/usuarios` | page-header + `segmented` (Todos/Membros/Admins/Ativos/Inativos) + search + `user-row` list + badge de role |
| Admin Check-ins | `/admin/check-ins` | `segmented` (Todos/Pendentes/Aprovados/Rejeitados) + `checkin-row` com Aprovar/Rejeitar/Reverter inline |
| Perfil | `/perfil` | `profile-card` (banner accent + avatar sobreposto 88px + fact-grid) + `metric-card` (streak week-dots) |
| Assinatura | `/assinatura` | `billing-banner` + `plan-grid` (3 planos; `plan-active` com ring/glow accent) |
| Academias | `/academias` | search + `gym-grid` de `gym-card` (foto + status aberto/fechado + rating + tags + Check-in) |

**Admin Role Management:** `/admin/usuarios` é restilizada ao vocabulário Volt
(badge de role `Admin`/`Membro`, AlertDialog de confirmação). A
**funcionalidade existente é preservada** — sem comportamento novo.

## Branding (GymPass → VOLT)

- Wordmark/logo (marca raio) no shell público e autenticado.
- Textos visíveis de header/footer.
- Metadados: `<title>`, `description` em `layout.tsx`.
- Referências internas em código/comentários renomeadas para VOLT onde fizer
  sentido (sem renomear o workspace `frontend` do monorepo).

## Responsividade

`--content-max 1180px`, centralizado, com `section-pad` responsivo.

- **Sidebar:** `268px` → **icon-rail 76px** < 860px (só ícones, labels via
  aria/tooltip). Em mobile, overlay/drawer acionado por botão na topbar
  (reaproveita o padrão de Sheet/overlay existente).
- **Login:** split → coluna única (só form) < 860px; painel-marca dark some.
- **Grids fluidos:** `stat-grid`, `plan-grid`, `gym-grid`, `dash-grid` via
  `repeat(auto-fit/auto-fill, minmax(...))` — reflow 4→2→1 colunas.
- **Segmented tabs:** quebram/scrollam horizontalmente em telas estreitas.
- **Topbar:** search-bar encolhe; theme-toggle pill → botão-ícone 42px < 860px.

## Movimento

Transform-only, curto (120–180ms hover). Entrada de rota `translateY(10px)→0`
(~450ms); barras `scaleY(0)→1` (~700ms); knob do toggle ~280ms. **Regra dura:**
estado-base sempre visível — nunca animar de `opacity:0` com fill-mode
persistente. Respeita `prefers-reduced-motion`.

## Acessibilidade

- Texto AA+ nos dois temas; alvos ≥44px.
- `focus-visible`: anel accent-mix 2px + offset 2px (inputs adicionam ring).
- Nunca branco-sobre-accent nem preto-puro-sobre-branco.
- Disciplina de pareamento `bg-accent` + foreground correto mantida.

## Testes & gate de validação

Critério de conclusão (obrigatório): `pnpm biome:fix`, `pnpm tsc:check`,
`pnpm test:run` e `pnpm build` passando 100%.

- Testes Vitest existentes ajustados onde dependerem de texto de marca/estrutura.
- E2E Playwright que referenciem "GymPass"/seletores antigos atualizados.
- Sem novos comportamentos a testar — é redesign visual; sem mudança de API.

## Fora de escopo

- Painel de tweaks em runtime (defaults fixos).
- Mudanças de backend/API.
- Novas funcionalidades ou novos fluxos de admin.
- Novas dependências (charts em CSS/SVG; sem Recharts novo).
- Renomear o workspace `frontend` do monorepo.
