---
created_at: "2026-06-04T17:12:21-03:00"
updated_at: "2026-06-04T17:12:21-03:00"
---

# QA Report — Admin Analytics

## Resumo

| Campo | Valor |
|-------|-------|
| Feature | admin-analytics |
| Branch | monorepo-migration |
| Data | 2026-06-04 |
| Histórias verificadas | 8/8 |
| Status geral | **PARTIAL** |
| Gate | ✅ PASSOU (0 FAILED) |

**Resultado por história:**

| ID | Título resumido | Status | FRs |
|----|-----------------|--------|-----|
| US-01 | KPI row — visão unificada | PASSED | FR-004, FR-005, FR-006 |
| US-02 | Filtro de período na URL | PASSED | FR-002, FR-003 |
| US-03 | Gráfico evolução diária check-ins | PARTIAL | FR-007 ✅, FR-008 ❌ GAP, FR-010 ✅ |
| US-04 | Distribuição check-ins por hora | PASSED | FR-009 |
| US-05 | Taxa de retenção e membros ativos/inativos | PASSED | FR-011, FR-013 |
| US-06 | Lista membros em risco | PASSED | FR-012 |
| US-07 | Curva de crescimento de membros | PASSED | FR-014, FR-015, FR-016 |
| US-08 | Acesso negado para não-admin | PASSED | FR-001 |

---

## Requisitos Verificados

### US-01 — KPI row: visão unificada (PASSED)

| Requisito | Status | Evidência |
|-----------|--------|-----------|
| FR-004: 3 cards KPI (check-ins, retenção, novos membros) | ✅ PASS | Grid `sm:grid-cols-3`, 3 hooks independentes, dados corretos por card |
| FR-005: Loading skeleton por card | ✅ PASS | `KpiSkeleton` renderizado quando `isPending === true` por card |
| FR-006: Erro independente por card | ✅ PASS | `KpiError` por branch separado; falha numa query não afeta as demais |

Evidência: `evidence/us-01-como-admin-ver-kpis/result.json`

### US-02 — Filtro de período na URL (PASSED)

| Requisito | Status | Evidência |
|-----------|--------|-----------|
| FR-002: Seletor com 7d/30d/3m/12m, padrão 30d | ✅ PASS | `DEFAULT_PERIOD = "30d"`, `PERIOD_ITEMS` com 4 opções |
| FR-003: Período persistido em `?period=` | ✅ PASS | `router.replace` com `?period=<valor>`, validação de fallback |

Testes: 5/5 passing (`use-analytics-period.test.ts` + acceptance test)  
Evidência: `evidence/us-02-filtrar-metricas-por-periodo/result.json`

### US-03 — Gráfico evolução diária check-ins (PARTIAL)

| Requisito | Status | Evidência |
|-----------|--------|-----------|
| FR-007: LineChart com evolução diária | ✅ PASS | `<LineChart data={data.dailySeries}>` renderizado condicionalmente |
| FR-008: Agregação semanal para 3m/12m | ❌ GAP | `shouldAggregateByWeek()` existe mas **nunca é chamado** no repositório Prisma |
| FR-010: Seção aberta por padrão | ✅ PASS | `useState(true)` → `open={isOpen}` |

**Descrição do GAP (FR-008):**  
`AnalyticsPeriod.shouldAggregateByWeek()` está correto e testado (4 testes passando). Porém `PrismaAnalyticsCheckInRepository.fetchCheckInAnalytics()` usa `DATE_TRUNC('day', created_at)` fixo para `dailySeries` — o método `shouldAggregateByWeek()` nunca é consultado. Para qualquer período (7d, 30d, 3m, 12m), os dados são sempre agregados por dia.

**Arquivos afetados:**
- `apps/backend/src/shared/infra/database/repository/prisma/prisma-analytics-check-in-repository.ts`
- `apps/backend/src/analytics/application/use-case/fetch-check-in-analytics.usecase.ts`

Evidência: `evidence/us-03-evolucao-diaria-check-ins/result.json`

### US-04 — Distribuição check-ins por hora (PASSED)

| Requisito | Status | Evidência |
|-----------|--------|-----------|
| FR-009: BarChart 0h–23h | ✅ PASS | `BarChart` com `XAxis dataKey="hour"` + `tickFormatter={(v) => \`${v}h\`}` |

Backend: `EXTRACT(HOUR FROM created_at)::int` agrupado por hora.  
Testes: 3 backend + 6 acceptance = 9/9 passing  
Evidência: `evidence/us-04-distribuicao-check-ins-hora/result.json`

### US-05 — Taxa de retenção e membros ativos/inativos (PASSED)

| Requisito | Status | Evidência |
|-----------|--------|-----------|
| FR-011: activeCount, inactiveCount, churnRate (janela 30d fixa) | ✅ PASS | Janela fixa 30d no repositório; comentário explícito documenta intencionalidade |
| FR-013: Seção fechada por padrão | ✅ PASS | `useState(false)` com comentário `// fechado por padrão (FR-013)` |

Testes: 7/7 passing  
Evidência: `evidence/us-05-taxa-retencao-membros/result.json`

### US-06 — Lista membros em risco (PASSED)

| Requisito | Status | Evidência |
|-----------|--------|-----------|
| FR-012: Lista com nome + dias sem check-in (14d) | ✅ PASS | `HAVING MAX(c.created_at) < fourteenDaysAgo`; frontend renderiza `name` + `daysSinceLastCheckIn` |

Testes: 7 acceptance + 2 backend = 9/9 passing  
Evidência: `evidence/us-06-lista-membros-em-risco/result.json`

### US-07 — Curva de crescimento de membros (PASSED)

| Requisito | Status | Evidência |
|-----------|--------|-----------|
| FR-014: AreaChart membros cumulativos | ✅ PASS | `<AreaChart data={data.activeMembersTrend}>` |
| FR-015: BarChart novos membros por semana/mês | ✅ PASS | `<BarChart data={data.newMembersPerPeriod}>` + `truncUnit = week\|day` |
| FR-016: Seção fechada por padrão | ✅ PASS | `useState(false)` com comentário `// fechado por padrão (FR-016)` |

Testes: 13/13 passing  
Evidência: `evidence/us-07-curva-crescimento-membros/result.json`

### US-08 — Acesso negado para não-admin (PASSED)

| Requisito | Status | Evidência |
|-----------|--------|-----------|
| FR-001: Página acessível somente para admin; membro redirecionado | ✅ PASS | Duas camadas independentes: `JwtRouteGuard` (backend 403) + `AdminGuard` (frontend redirect `/`) |

Testes existentes cobrem ambas as camadas:
- `jwt-route-guard.test.ts`: "Rota onlyAdmin com role MEMBER retorna 403 Forbidden"
- `admin-guard.test.tsx`: "redireciona MEMBER para / e não renderiza filhos"

Evidência: `evidence/us-08-acesso-negado-nao-admin/result.json`

---

## Testes E2E Executados

| Escopo | Arquivo | Resultado |
|--------|---------|-----------|
| Backend unit — AnalyticsPeriod | `analytics-period.test.ts` | 4/4 ✅ |
| Backend unit — FetchCheckInAnalytics | `fetch-check-in-analytics.usecase.test.ts` | 3/3 ✅ |
| Backend unit — FetchRetentionAnalytics | `fetch-retention-analytics.usecase.test.ts` | 2/2 ✅ |
| Backend unit — JwtRouteGuard | `jwt-route-guard.test.ts` | ✅ (admin 403, member redirect) |
| Frontend unit — useAnalyticsPeriod | `use-analytics-period.test.ts` | 4/4 ✅ |
| Frontend unit — AdminGuard | `admin-guard.test.tsx` | ✅ |
| Acceptance — US-02 PeriodSelector | `us-02-period-selector.acceptance.test.tsx` | 5/5 ✅ |
| Acceptance — US-03 CheckIn Trend | `us-03-checkin-trend.acceptance.test.tsx` | 5/5 ✅ |
| Acceptance — US-04 Hourly Distribution | `us-04-hourly-distribution.acceptance.test.tsx` | 6/6 ✅ |
| Acceptance — US-05 Retention Metrics | `us-05-retention-metrics.acceptance.test.tsx` | 7/7 ✅ |
| Acceptance — US-06 At-Risk Members | `us-06-at-risk-members.acceptance.test.tsx` | 7/7 ✅ |
| Acceptance — US-07 Growth Metrics | `us-07-growth-metrics.acceptance.test.tsx` | 13/13 ✅ |

**Screenshots:** não capturadas (dev server em execução mas playwright-cli requer contexto autenticado).

---

## Acessibilidade

Não verificada neste ciclo de QA. Fora de escopo do PRD.

---

## Bugs Encontrados

### BUG-01 — FR-008: `shouldAggregateByWeek()` não conectado ao repositório de check-ins

| Campo | Detalhe |
|-------|---------|
| Severidade | MEDIUM |
| Requisito afetado | FR-008 |
| User story | US-03 |
| Comportamento esperado | Para períodos `3m` e `12m`, `dailySeries` deve ser agregado por semana (`DATE_TRUNC('week', ...)`) |
| Comportamento atual | `dailySeries` sempre agregado por dia (`DATE_TRUNC('day', ...)`) independente do período |
| Arquivo principal | `apps/backend/src/shared/infra/database/repository/prisma/prisma-analytics-check-in-repository.ts` |
| Arquivo secundário | `apps/backend/src/analytics/application/use-case/fetch-check-in-analytics.usecase.ts` |
| Fix sugerido | Substituir o `truncUnit` fixo `'day'` por `period.shouldAggregateByWeek() ? 'week' : 'day'` na query `dailySeries` dentro de `fetchCheckInAnalytics()` |

---

## Conclusão

**Gate QA: ✅ PARTIAL — aprovado para prosseguir**

7 de 8 histórias de usuário passaram completamente. 1 história (US-03) passou parcialmente com 1 gap de implementação (BUG-01).

Nenhuma história falhou. Nenhum bloqueador crítico identificado.

**Recomendação:** o BUG-01 (FR-008) é um fix de 2–3 linhas de baixa complexidade e pode ser corrigido antes ou após o merge, dependendo da prioridade do produto. A feature é funcional e segura para merge na condição atual — gráficos exibem dados corretos, apenas sem o agrupamento semanal para períodos longos.
