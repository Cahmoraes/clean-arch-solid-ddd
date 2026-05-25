---
created_at: "2026-05-25T10:13:18-03:00"
updated_at: "2026-05-25T10:13:18-03:00"
---

# Dashboard Início — Design Spec

## Visão Geral

Adicionar uma rota `/inicio` como **tela principal pós-login** do frontend, apresentando um dashboard personalizado com informações do usuário, KPIs de frequência e histórico de check-ins inspirado em sistemas de academias reais.

Concomitantemente, o `AuthenticatedShell` é **refatorado**: o top-nav com abas é substituído por um `AppSidebar` lateral aplicado a **todas** as rotas autenticadas, garantindo navegação consistente em toda a app.

Nenhum campo novo é adicionado à API — todos os dados vêm dos endpoints existentes.

---

## Rota e Navegação

| Item | Decisão |
|---|---|
| Path | `/inicio` |
| Redirect pós-login | Muda de `/academias` → `/inicio` |
| Grupo de rota | `src/app/(authenticated)/inicio/page.tsx` |
| Proteção | Middleware existente (`has_session` cookie) — sem alteração |

---

## Refatoração do Shell — `AppSidebar`

### O que muda

O componente `AuthenticatedShell` (top-nav com abas) é refatorado para um layout de **sidebar lateral fixa**. A mudança se aplica a todas as rotas do grupo `(authenticated)/`.

### Estrutura do AppSidebar

```
┌─────────────────────────────────────────────────┐
│  SIDEBAR (220px)        │  MAIN CONTENT          │
│  ─────────────────      │  ───────────────────── │
│  Logo / App name        │  <page content>        │
│                         │                        │
│  [Principal]            │                        │
│  ● Dashboard  ←ativo    │                        │
│    Check-ins            │                        │
│    Academias            │                        │
│    Perfil               │                        │
│    Assinatura           │                        │
│                         │                        │
│  [Admin] (role=ADMIN)   │                        │
│    Usuários             │                        │
│    Check-ins admin      │                        │
│    Academias admin      │                        │
│                         │                        │
│  ────────────────────   │                        │
│  [Avatar] Nome  role    │                        │
└─────────────────────────────────────────────────┘
```

### Comportamento responsivo

- **Desktop (≥1024px):** sidebar fixa visível
- **Mobile/tablet (<1024px):** sidebar escondida; botão hamburger no topo abre um `Sheet` (drawer) do shadcn/ui
- O item ativo é destacado com pill branco (`bg-white text-black rounded-full`), seguindo o padrão monochromático do design system

### Seção Admin

O bloco "Admin" na sidebar é renderizado condicionalmente: somente quando `user.role === 'ADMIN'` (lido do `useAuthStore`). Sem alteração na API.

---

## Feature: Dashboard `/inicio`

### Módulo

```
src/features/dashboard/
  api/
    index.ts          # TanStack Query hooks: useDashboardData
  components/
    dashboard-page.tsx
    profile-hero-card.tsx
    kpi-cards.tsx
    weekly-chart.tsx
    heatmap-card.tsx
    checkins-timeline.tsx
    status-donut-card.tsx
  hooks/
    use-dashboard-metrics.ts   # cálculos client-side derivados dos check-ins
```

### Fontes de dados

| Dado | Endpoint | Observação |
|---|---|---|
| Perfil (nome, email, role, createdAt, status) | `GET /users/me` | Hook existente `useMe` em `features/profile` — reutilizar |
| Total de check-ins | `GET /users/metrics` | Hook novo em `features/dashboard/api` |
| Histórico de check-ins | `GET /check-ins/me` | Buscar com `pageSize=150` (cobre 90 dias com margem para frequência diária). Hook existente `useMyCheckIns` — reutilizar com `pageSize` maior |

### Cálculos client-side (`use-dashboard-metrics.ts`)

Todos derivados do array de check-ins retornado por `/check-ins/me`:

| Métrica | Cálculo |
|---|---|
| **Check-ins este mês** | Filtrar por `createdAt` dentro do mês atual |
| **Streak (sequência)** | Dias consecutivos com ao menos 1 check-in `status === 'validated'`. Ponto de partida: hoje se houver check-in validado hoje, senão ontem. Conta regressivamente enquanto cada dia anterior tiver ao menos um check-in validado |
| **Frequência semanal** | Agrupar check-ins dos últimos 28 dias por `dayOfWeek` (0–6). Normalizar para barras relativas |
| **Heatmap (90 dias)** | Agrupar check-ins por data (YYYY-MM-DD). Calcular intensidade: 0=sem check-in, 1=1, 2=2, 3=3, 4=4+ |
| **Donut de status** | Contar `validated`, `pending`, `rejected` no histórico completo |

### Widgets e layout

```
┌────────────────────────────────────────────────────────┐
│  Olá, João 👋   Domingo, 25 de maio de 2026            │
├────────────────────────────────────────────────────────┤
│  [Profile Hero Card]                                   │
│  Avatar(iniciais) | Nome, Email, Membro desde | Stats  │
│                   |                           | Total  │
│                   |                           | Mês    │
│                   |                           | Streak │
├──────────────┬──────────────┬────────┬────────┤
│ Total        │ Este Mês     │Streak  │ Status │  ← KPI cards (4 cols)
│ check-ins    │              │ 5 🔥   │ Ativo  │
├──────────────────────────┬─────────────────────┤
│  Frequência Semanal      │  Status (donut)     │  ← charts row
│  (bar chart, Dom–Sáb)    │                     │
├──────────────────────────┴─────────────────────┤
│  Heatmap Atividade (90 dias) │ Últimos Check-ins│  ← bottom row
│  (grid estilo GitHub)        │ (timeline 5 itens│
└──────────────────────────────────────────────────┘
```

### Componentes

**`ProfileHeroCard`**
- Avatar com iniciais geradas do nome (ex.: "JS" para "João Silva")
- Badge de status da conta: `Ativo` (verde) ou `Inativo` (vermelho)
- Stats inline: total, este mês, streak — lidos de `useDashboardMetrics`

**`KpiCards`**
- Grid 4 colunas responsivo (2 cols em mobile)
- Loading: skeleton `animate-pulse`
- Dados: `totalCheckIns` (de `/users/metrics`), `thisMonth`, `streak`, `status`

**`WeeklyChart`**
- Recharts `BarChart` via shadcn `<ChartContainer>`
- Eixo X: Dom Seg Ter Qua Qui Sex Sáb
- Eixo Y: contagem de check-ins
- Cor: `fill="hsl(var(--foreground))"` — monocromático

**`HeatmapCard`**
- Grid CSS 13 colunas × 7 linhas (13 semanas)
- 5 níveis de intensidade mapeados para opacidade do `--foreground`
- Tooltip com data e contagem ao hover

**`CheckinsTimeline`**
- Últimos 5 check-ins
- Ícone dot colorido por status (verde/amarelo/vermelho)
- Badge de status alinhado à direita
- Link "Ver todos" → `/check-ins`

**`StatusDonutCard`**
- Recharts `PieChart` (inner radius para donut)
- Legenda inline: Validado · Pendente · Rejeitado com contagem

### Estados

| Estado | Tratamento |
|---|---|
| Loading | Skeleton em cada card individualmente (não bloqueia a página toda) |
| Sem check-ins | Empty state no heatmap e timeline; KPIs mostram 0 |
| Erro de API | Toast de erro + botão retry via `useQuery`'s `refetch` |

---

## Biblioteca de Gráficos

**Recharts** via `shadcn/ui` chart components (`<ChartContainer>`, `<ChartTooltip>`, `<ChartLegend>`). Recharts já é a dependência do shadcn — sem instalar nova lib.

---

## Impacto em Rotas Existentes

| Arquivo | Mudança |
|---|---|
| `src/app/(authenticated)/login/page.tsx` (ou auth callback) | Redirect pós-login: `/academias` → `/inicio` |
| `src/components/layout/authenticated-shell.tsx` | Refatorar: remover tab-nav, adicionar `AppSidebar` |
| `src/app/(authenticated)/inicio/page.tsx` | **Novo** |
| `src/features/dashboard/**` | **Novo** |
| Demais rotas autenticadas | Herdam o novo shell automaticamente (sem mudança de código) |

---

## Fora de Escopo

- Campos novos na API (sem PATCH, sem novos endpoints)
- Notificações push ou real-time
- Customização de widgets pelo usuário
- Exportação de dados
- Comparativo com outros membros
- Gamificação avançada (badges, conquistas)
