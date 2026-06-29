---
created_at: "2026-06-29T10:40:05-03:00"
updated_at: "2026-06-29T10:40:05-03:00"
---

# Design Spec — Analytics Dashboard Redesign

## Visão Geral

Redesign da tela `/admin/analytics` com foco em valor imediato ao operador da academia. A tela atual expõe dados corretos, mas exige interação (expandir seções colapsáveis) e scroll antes de mostrar o dado mais acionável: membros em risco de churn.

Três mudanças estruturais:

1. **At-risk zone surfaced ao topo** — lista de membros em risco aparece imediatamente abaixo do seletor de período, sem nenhuma interação prévia. Quando não há membros em risco, exibe estado positivo explícito ("academia saudável").
2. **KPI cards com sparklines embutidas** — os 3 cards existentes ganham tendência visual inline (SVG), eliminando a necessidade de seções de gráfico separadas.
3. **Remoção de todas as seções colapsáveis e gráficos grandes** — `CheckInMetricsSection`, `RetentionMetricsSection` e `GrowthMetricsSection` são removidos; os números de ativos/inativos/churn viram um row compacto sempre visível.

Nenhuma mudança de backend. Todos os dados necessários já são retornados pelas 3 queries existentes.

---

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| Usabilidade | Admin deve saber se a academia está saudável em ≤ 5 segundos, sem clicar em nada | At-risk zone + 3 KPI cards visíveis above the fold (viewport 1280px) sem scroll |
| Performance de percepção | KPIs carregando tarde aumentam ansiedade e retrabalho | Skeleton dos KPI cards resolve em < 2s com TanStack Query cache hit de 60s |
| Manutenibilidade | Remover ~300 linhas de componentes de chart e 3 seções colapsáveis reduz superfície de bug e bundle | Recharts removível após a feature (verificar se é usado em outro lugar); grafo de componentes de analytics passa de 8 para 4 componentes |

**Consideradas, não priorizadas:** scalability (volume de dados de analytics não cresce linearmente com usuários), i18n (sem expansão prevista), observabilidade (sem novos endpoints — logs existentes cobrem).

---

## Especificação Visual

**Artefato curado:** `mockups/analytics-dashboard-redesign-visual.md`

**Fonte de design original:** nenhuma; layout definido via mockup interativo do Visual Companion (sessão de brainstorming).

**Decisões visuais (norte, não pixel-final):**

- At-risk zone: fundo `rgba(245,158,11,0.1)`, borda `rgba(245,158,11,0.25)`, membros listados em rows com avatar inicial + nome + badge de dias (vermelho quando > 18 dias, âmbar caso contrário). Estado saudável: fundo `rgba(57,229,140,0.1)`, borda `rgba(57,229,140,0.25)`.
- KPI cards: mantêm estrutura atual (border `--color-border`, bg `--color-card`, padding 22px) com sparkline SVG posicionada absolute no canto inferior direito (`opacity: 0.35`, pointer-events: none). Card de retenção recebe `border-color: rgba(57,229,140,0.35)` + fundo levemente verde para destacar a métrica-alvo.
- Retention row: 3 pills compactos (`height: 44px`, `border-radius: --radius-sm`), valor em monospace, inativos e churn em `--color-destructive` quando acima de threshold.
- Period selector: mantido como está (SegmentedControl existente).
- Tokens: `--color-primary: #39e58c`, `--color-border: #2a2a2a`, `--color-card: #161616`, `--color-background: #080808`, `--radius-md: 14px`, `--radius-sm: 8px`.

**Fidelidade:** o mockup é um *norte*. Fidelidade final construída na implementação.

---

## Estrutura de Componentes

### Composição da página (`analytics/page.tsx`)

```
AnalyticsPage
├── PageHeader ("Analytics")
├── AnalyticsPeriodSelector          ← existente, sem mudança
├── AtRiskAlertZone                  ← NOVO
│   ├── [risco] AlertZone (âmbar)
│   │   ├── lista AtRiskMemberRow (até 3 visíveis)
│   │   └── "ver todos" expand (inline, sem navegação)
│   └── [saudável] HealthyZone (verde)
├── AnalyticsKpiRow                  ← existente, modificado
│   ├── KpiCardWithSparkline (check-ins + dailySeries)
│   ├── KpiCardWithSparkline (retenção + activeMembersTrend) [highlight]
│   └── KpiCardWithSparkline (novos membros + newMembersPerPeriod)
└── RetentionMiniStats               ← NOVO
    ├── StatPill (ativos)
    ├── StatPill (inativos)
    └── StatPill (churn rate)
```

### Componentes removidos

| Componente | Arquivo | Motivo |
|---|---|---|
| `CheckInMetricsSection` | `components/check-in-metrics-section.tsx` | Substituído por sparkline no KPI card |
| `RetentionMetricsSection` | `components/retention-metrics-section.tsx` | Substituído por AtRiskAlertZone + RetentionMiniStats |
| `GrowthMetricsSection` | `components/growth-metrics-section.tsx` | Substituído por sparkline no KPI card |
| Sub-componentes de chart | `components/charts/` | Recharts não mais usado (verificar outros usos antes de remover dep) |

### Novos componentes

#### `AtRiskAlertZone`

**Localização:** `src/features/admin/analytics/components/at-risk-alert-zone.tsx`

**Props:**
```typescript
interface AtRiskAlertZoneProps {
  members: AtRiskMember[]   // retornado por useRetentionMetrics().atRiskMembers
  isLoading: boolean
}
```

**Lógica:** se `members.length === 0` → renderiza `HealthyZone`. Caso contrário, renderiza zona âmbar com os primeiros 3 membros e toggle para ver o restante (estado local `showAll`).

**Threshold de dias:** crítico (vermelho) quando `daysSinceLastCheckIn >= 18`, âmbar caso contrário. Constante `AT_RISK_CRITICAL_THRESHOLD = 18` no módulo.

#### `KpiCardWithSparkline`

**Localização:** `src/features/admin/analytics/components/kpi-card-with-sparkline.tsx`

**Props:**
```typescript
interface KpiCardWithSparklineProps {
  value: string | number
  label: string
  sparklineData: number[]     // série temporal — mín 2 pontos
  highlight?: boolean         // borda/fundo verde para retenção
  isLoading?: boolean
}
```

**Sparkline:** SVG inline gerado por helper `buildSparklinePath(data: number[]): string` no mesmo módulo. Normaliza para viewBox fixo, desenha `<path>` com fill de gradiente. Zero dependência de Recharts.

#### `RetentionMiniStats`

**Localização:** `src/features/admin/analytics/components/retention-mini-stats.tsx`

**Props:**
```typescript
interface RetentionMiniStatsProps {
  activeCount: number
  inactiveCount: number
  churnRate: number
  isLoading: boolean
}
```

---

## Mapeamento de Dados (sem mudança de API)

| KPI / componente | Hook existente | Campo utilizado |
|---|---|---|
| Check-ins total | `useCheckInMetrics()` | `totalCheckIns` |
| Sparkline check-ins | `useCheckInMetrics()` | `dailySeries` |
| Taxa de retenção | `useRetentionMetrics()` | `retentionRate` |
| Sparkline retenção | `useGrowthMetrics()` | `activeMembersTrend` |
| At-risk members | `useRetentionMetrics()` | `atRiskMembers` |
| Ativos / inativos / churn | `useRetentionMetrics()` | `activeCount`, `inactiveCount`, `churnRate` |
| Novos membros total | `useGrowthMetrics()` | `newMembersCount` |
| Sparkline novos membros | `useGrowthMetrics()` | `newMembersPerPeriod` |

As 3 queries (`useCheckInMetrics`, `useRetentionMetrics`, `useGrowthMetrics`) permanecem intactas com os mesmos parâmetros de período e stale time de 60s.

---

## Decisões Arquiteturais

### D1. Sparklines via SVG inline (sem Recharts)

- **Contexto:** A tela usa Recharts para `LineChart`, `BarChart` e `AreaChart`. Com a remoção dos gráficos grandes, só restariam sparklines de 7-30 pontos, sem tooltips ou interatividade.
- **Decisão:** Sparklines implementadas como SVG inline com `<path>` gerado por helper puro (`buildSparklinePath`). Sem Recharts nos componentes de KPI.
- **Justificativa técnica:** Série pequena com resultado visual idêntico; zero overhead de bundle do Recharts para esse caso de uso; tooltip não é necessário em sparklines de tendência.
- **Justificativa de negócio:** Performance de percepção melhor — KPI cards não dependem de lazy-load do bundle de charts.
- **Trade-offs aceitos:** Se no futuro for necessário tooltip interativo na sparkline, será necessário adicionar Recharts ou outra lib de chart novamente. Verificar antes de remover a dependência se algum outro módulo a usa.

### D2. At-risk surfaced acima dos KPI cards

- **Contexto:** Na tela atual, a lista at-risk fica dentro da seção "Retenção" colapsada por padrão — o dado mais acionável exige 2 interações para aparecer.
- **Decisão:** `AtRiskAlertZone` é o primeiro bloco de conteúdo após o period selector, antes dos KPI cards.
- **Justificativa técnica:** Segue padrão de progressive disclosure invertido: o que exige ação vem antes do que é informativo.
- **Justificativa de negócio:** Admin que abre o dashboard e vê a lista at-risk age imediatamente (contacta o membro); admin que não a vê de imediato pode ignorar o dado por dias.
- **Trade-offs aceitos:** Em academias muito saudáveis (zero at-risk), a HealthyZone ocupa espaço que poderia estar vazio. O espaço não é desperdiçado — a confirmação positiva tem valor informacional.

### D3. Estado positivo explícito (HealthyZone)

- **Contexto:** Quando `atRiskMembers.length === 0`, não exibir nada cria ambiguidade (bug? dado não carregou? não tem membros?).
- **Decisão:** Renderizar `HealthyZone` com mensagem de confirmação positiva em verde.
- **Justificativa:** Reduz ansiedade do operador; segue padrão de "estado vazio com valor" (meaningful empty state).
- **Trade-offs aceitos:** Nenhum significativo.

### D4. Sem delta badge na versão inicial

- **Contexto:** O mockup apresentou badges de variação percentual (ex: +12% vs período anterior). A API atual não retorna dados do período comparativo.
- **Decisão:** Delta badges são out-of-scope para esta feature. Sparkline visual (tendência de subida/descida) cumpre o papel de contexto temporal sem exigir mudança de backend.
- **Justificativa:** Adicionar comparação de período exigiria nova lógica de backend ou dois fetches por KPI. Custo-benefício não justifica na primeira entrega.
- **Trade-offs aceitos:** Admin não vê percentual exato de variação. Pode ser adicionado como follow-up quando/se o backend suportar.

---

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| `activeMembersTrend` tem granularidade insuficiente para sparkline de retenção | 2 | 2 | 4 🟡 | Verificar formato do array antes de implementar; fallback: usar `activeCount` como ponto único (sparkline flat) |
| Recharts usado em outro módulo além de analytics | 1 | 2 | 2 🟢 | Grep por `from 'recharts'` antes de remover dep; se houver outro uso, manter dep e só remover imports de analytics |
| `buildSparklinePath` produz path inválido para séries com todos os valores iguais | 1 | 2 | 2 🟢 | Adicionar guarda: se `max === min`, normalizar para linha horizontal (retorna path reto) |
| At-risk list muito longa quebra layout da alert zone | 1 | 2 | 2 🟢 | Limitar exibição padrão a 3 itens; `showAll` toggle mantém a lista adicional colapsada internamente |

---

## Testes

- Renderizar `AtRiskAlertZone` com `members.length > 0` → verificar que zona âmbar está presente e mostra os primeiros 3 membros
- Renderizar `AtRiskAlertZone` com `members.length === 0` → verificar que `HealthyZone` (verde) está presente e zona âmbar ausente
- Clicar em "ver todos" na alert zone → verificar que todos os membros ficam visíveis
- Renderizar `KpiCardWithSparkline` com `sparklineData=[10,15,12,18]` → verificar que um `<svg>` está presente no card
- Renderizar `KpiCardWithSparkline` com `sparklineData` de valores todos iguais → verificar que não lança erro (path horizontal)
- Renderizar `RetentionMiniStats` com `churnRate=5.5` → verificar que o valor aparece em vermelho (acima de threshold)
- Renderizar `AnalyticsPage` → verificar que `CheckInMetricsSection`, `RetentionMetricsSection` e `GrowthMetricsSection` não estão presentes no DOM
- Testar `buildSparklinePath([])` → deve retornar string vazia ou path mínimo sem lançar erro
