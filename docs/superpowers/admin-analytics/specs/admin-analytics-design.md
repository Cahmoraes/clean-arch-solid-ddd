---
created_at: "2026-06-04T14:24:53-03:00"
updated_at: "2026-06-04T14:24:53-03:00"
---

# Analytics Admin — Design Spec

## Visão Geral

Página dedicada `/admin/analytics` para admins visualizarem métricas operacionais agregadas do sistema de check-ins. A feature cobre três categorias: **ocupação/horários de pico**, **retenção de membros** e **crescimento**. Os dados são carregados on-demand ao abrir a página, com filtro de período pré-definido (7d, 30d, 3m, 12m) persistido na URL. Não há atualização automática — o admin refresca manualmente quando necessário.

Audiência: somente admins autenticados. Membros não têm acesso.

---

## Características Arquiteturais

**Priorizadas (top 3):**

| Característica | Por quê (preocupação de domínio) | Critério mensurável |
|---|---|---|
| Manutenibilidade | Sistema com ~30 features em Clean Architecture; desvios criam dívida multiplicada | Cada use case tem responsabilidade única; nenhum componente ultrapassa a responsabilidade descrita em uma frase |
| Performance | Queries de analytics agregam todas as linhas de `CheckIn` e `User`; sem índices, viram gargalo | Cada endpoint responde em < 500ms com 10k check-ins no banco |
| Observabilidade | Admin toma decisões baseadas nesses números; dados incorretos são invisíveis sem feedback de erro | Cada seção da UI tem error boundary próprio; erros de query são logados no backend com contexto do período |

**Consideradas, não priorizadas:** scalability (volume atual não justifica CQRS nem read models pré-computados), real-time (on-demand é suficiente para tomada de decisão administrativa).

---

## Arquitetura e Fluxo de Dados

```
Frontend (Next.js 16)                  Backend (Fastify + Clean Arch)
─────────────────────────────          ──────────────────────────────────────────
AnalyticsPage
  ├── PeriodSelector (URL state)
  ├── AnalyticsKpiRow
  │     useCheckInMetrics(period) ──▶  GET /admin/analytics/checkins?period=30d
  │     useRetentionMetrics(period)──▶  GET /admin/analytics/retention?period=30d
  │     useGrowthMetrics(period)  ──▶  GET /admin/analytics/growth?period=30d
  ├── CheckInMetricsSection           FetchCheckInAnalyticsUseCase
  │     (colapsável)                     └── AnalyticsCheckInRepository (interface)
  ├── RetentionMetricsSection               └── PrismaAnalyticsCheckInRepository
  │     (colapsável)               FetchRetentionAnalyticsUseCase
  └── GrowthMetricsSection              └── AnalyticsUserRepository (interface)
        (colapsável)                        └── PrismaAnalyticsUserRepository
                                    FetchGrowthAnalyticsUseCase
                                        └── AnalyticsUserRepository
```

Os 3 endpoints são chamados em paralelo (`useQueries` do TanStack Query) no mount da página para popular os KPI cards. As seções colapsáveis reutilizam os dados já cacheados — sem request adicional ao expandir.

**Period resolution:** `AnalyticsPeriod` (value object de domínio) valida o identificador e retorna `{ from: Date, to: Date }`. Quando `period >= 3m`, o use case agrega `dailySeries` por semana (máximo ~52 pontos por gráfico).

---

## Componentes

### Backend

| Componente | Tipo | Responsabilidade |
|---|---|---|
| `AnalyticsPeriod` | Value Object (Domain) | Valida e converte identificador de período (`7d\|30d\|3m\|12m`) em intervalo de datas concreto |
| `AnalyticsCheckInRepository` | Interface (Domain) | Declara queries de agregação de check-ins por período |
| `AnalyticsUserRepository` | Interface (Domain) | Declara queries de agregação de usuários por período |
| `FetchCheckInAnalyticsUseCase` | Use Case (Application) | Retorna série temporal de check-ins por dia e distribuição por hora do dia para o período |
| `FetchRetentionAnalyticsUseCase` | Use Case (Application) | Retorna contagem de ativos/inativos, taxa de churn e membros sem check-in recente |
| `FetchGrowthAnalyticsUseCase` | Use Case (Application) | Retorna novos cadastros e evolução de membros ativos por semana/mês no período |
| `PrismaAnalyticsCheckInRepository` | Repository (Infra) | Implementa `AnalyticsCheckInRepository` via `prisma.checkIn.groupBy` |
| `PrismaAnalyticsUserRepository` | Repository (Infra) | Implementa `AnalyticsUserRepository` via `prisma.user.groupBy` + `count` |

### Frontend

| Componente | Responsabilidade |
|---|---|
| `AnalyticsPage` | Orquestra a página `/admin/analytics`: compõe KPI row, PeriodSelector e seções colapsáveis |
| `PeriodSelector` | SegmentedControl com opções `7d \| 30d \| 3m \| 12m`; estado persistido em `?period=` na URL |
| `AnalyticsKpiRow` | Row de 3 KPI cards (total check-ins, taxa de retenção %, novos membros) — números rápidos no topo |
| `CheckInMetricsSection` | Seção colapsável: line chart de check-ins por dia + bar chart de distribuição por hora (horários de pico) |
| `RetentionMetricsSection` | Seção colapsável: donut ativos/inativos + lista de membros em risco (sem check-in recente) |
| `GrowthMetricsSection` | Seção colapsável: area chart cumulativo de membros + bar chart de novos membros por período |

---

## API Contracts

Todos os endpoints requerem autenticação de admin (`onlyAdmin: true`).

```
GET /admin/analytics/checkins?period={7d|30d|3m|12m}
Response: {
  totalCheckIns: number,
  dailySeries: Array<{ date: string, count: number }>,
  hourlyDistribution: Array<{ hour: number, count: number }>
}

GET /admin/analytics/retention?period={7d|30d|3m|12m}
Response: {
  activeCount: number,
  inactiveCount: number,
  churnRate: number,                          // 0-1
  atRiskMembers: Array<{ id: string, name: string, daysSinceLastCheckIn: number }>
}

GET /admin/analytics/growth?period={7d|30d|3m|12m}
Response: {
  totalMembers: number,
  newMembersCount: number,
  newMembersPerPeriod: Array<{ date: string, count: number }>,
  activeMembersTrend: Array<{ date: string, count: number }>
}
```

> **Definição de membro "inativo":** sem check-in nos últimos 30 dias, independente do período selecionado.
> **Definição de membro "em risco":** sem check-in nos últimos 14 dias.

---

## Layout da Página

```
/admin/analytics
┌──────────────────────────────────────────────┐
│ Analytics             [7d] [30d] [3m] [12m]  │  ← PeriodSelector (URL)
├────────────┬───────────┬──────────────────────┤
│ 1.234      │ 87%       │ +34                  │  ← AnalyticsKpiRow
│ Check-ins  │ Retenção  │ Novos membros        │
├──────────────────────────────────────────────┤
│ ▼ Check-ins detalhado                        │  ← aberto por padrão
│   [line chart diário] [bar chart por hora]   │
├──────────────────────────────────────────────┤
│ ▶ Retenção de membros                        │  ← fechado por padrão
├──────────────────────────────────────────────┤
│ ▶ Crescimento                                │  ← fechado por padrão
└──────────────────────────────────────────────┘
```

Estado de seções abertas: local no componente (`useState`), não persistido em URL — estado de UI descartável.

---

## Decisões Arquiteturais

### D1. Interfaces de repositório exclusivas para analytics

- **Contexto:** Analytics precisa de `groupBy`, contagens agregadas e filtros por período — operações que não existem nos repositórios de domínio (`CheckInRepository`, `UserRepository`).
- **Decisão:** Criar `AnalyticsCheckInRepository` e `AnalyticsUserRepository` como interfaces independentes, implementadas por classes Prisma exclusivas.
- **Justificativa técnica:** Evita poluir os repositórios de domínio com queries de leitura especializadas; cada interface satisfaz um único use case de leitura.
- **Justificativa de negócio:** Manutenibilidade — alterar a estratégia de query de analytics (ex: migrar para SQL raw) não afeta o domínio de escrita.
- **Trade-offs aceitos:** 2 interfaces e 2 implementações adicionais; custo baixo dado o ganho de isolamento.

### D2. Recharts + shadcn Chart component como biblioteca de visualização

- **Contexto:** O projeto não tem biblioteca de charts. Opções avaliadas: Recharts (shadcn nativo), Tremor, Chart.js.
- **Decisão:** `recharts` com o wrapper `Chart` do shadcn/ui.
- **Justificativa técnica:** Integração nativa com o design system já adotado (shadcn); dark mode automático via CSS variables; SSR-compatível com App Router; ~45 KB vs ~200 KB do Tremor.
- **Justificativa de negócio:** Consistência visual com o restante da UI sem configuração adicional de tema.
- **Trade-offs aceitos:** API declarativa do Recharts tem curva de aprendizado inicial; sem widgets pré-prontos como o Tremor oferece.

### D3. Period filter via URL state

- **Contexto:** O estado do filtro de período precisa ser acessível por múltiplos componentes da página.
- **Decisão:** `?period=30d` na URL via `useSearchParams`; padrão `30d`.
- **Justificativa técnica:** Segue o padrão já estabelecido no projeto (filtros de check-in usam URL state). Link compartilhável entre admins.
- **Justificativa de negócio:** Admin pode enviar `analytics?period=3m` para colega e ambos verão a mesma visão.
- **Trade-offs aceitos:** Navegação com back/forward do browser altera o filtro — comportamento esperado para URL state.

---

## Riscos

| Risco | Impacto (1-3) | Probabilidade (1-3) | Score | Mitigação |
|---|---|---|---|---|
| `prisma.checkIn.groupBy` lento sem índices em volume alto | 3 | 2 | 6 🔴 | Criar índice composto `(created_at)` e `(user_id, created_at)` na migration antes de implementar os use cases |
| KPI row dispara 3 requests paralelos no mount e a página fica em skeleton por muito tempo | 2 | 2 | 4 🟡 | Usar `useQueries` do TanStack Query para paralelismo; staleTime de 5–10 min para evitar refetch desnecessário na navegação |
| `period=12m` com `dailySeries` retorna 365 pontos e o gráfico fica ilegível | 2 | 2 | 4 🟡 | Agregar por semana no use case quando `period >= 3m` (máx ~52 pontos) |
| Definição de "membro inativo" diverge entre retenção e crescimento | 2 | 1 | 2 🟢 | Definição centralizada em `AnalyticsPeriod` ou constante compartilhada entre use cases |

---

## Testes

**Backend (unit):**
- `AnalyticsPeriod`: valida cada identificador de período e os limites `from`/`to` resultantes
- `FetchCheckInAnalyticsUseCase`: mock do repositório; verifica agregação correta e delegação de período
- `FetchRetentionAnalyticsUseCase`: mock; verifica cálculo de `churnRate` e lista de membros em risco
- `FetchGrowthAnalyticsUseCase`: mock; verifica agregação semanal quando `period >= 3m`

**Backend (integração):**
- Endpoints `GET /admin/analytics/*` com banco real: verifica proteção `onlyAdmin`, respostas para cada período, performance < 500ms

**Frontend (unit):**
- `PeriodSelector`: verifica escrita e leitura do param `period` na URL
- `AnalyticsKpiRow`: verifica renderização com dados mockados e estado de loading skeleton
- Seções colapsáveis: verifica toggle de abertura/fechamento

**Frontend (e2e):**
- Admin abre `/admin/analytics`, vê KPI row populado, troca período para 7d, verifica refetch dos dados
- Membro não-admin é redirecionado ao tentar acessar a página
