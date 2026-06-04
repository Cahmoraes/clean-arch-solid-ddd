# Task 2: Backend IoC — analytics-types + export em types.ts [FR-001]

**Status:** IN_PROGRESS
**PRD:** `../prd/prd-admin-analytics.md`
**Spec:** `../specs/admin-analytics-design.md`
**Depends on:** N/A

## Visão Geral

Cria os service identifiers Inversify para o bounded context analytics e os exporta a partir do barrel `types.ts`. Tasks subsequentes importam `ANALYTICS_TYPES` para registrar e resolver dependências.

## Arquivos

- Create: `apps/backend/src/shared/infra/ioc/module/service-identifier/analytics-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/types.ts`

### Conformidade com as Skills Padrão

- no-workarounds: seguir exatamente o padrão `USER_TYPES` em `user-types.ts`

## Passos

- **Step 1: Criar analytics-types.ts**

```typescript
// apps/backend/src/shared/infra/ioc/module/service-identifier/analytics-types.ts
export const ANALYTICS_TYPES = {
  Repositories: {
    AnalyticsCheckIn: Symbol.for("AnalyticsCheckInRepository"),
    AnalyticsUser: Symbol.for("AnalyticsUserRepository"),
  },
  UseCases: {
    FetchCheckInAnalytics: Symbol.for("FetchCheckInAnalyticsUseCase"),
    FetchRetentionAnalytics: Symbol.for("FetchRetentionAnalyticsUseCase"),
    FetchGrowthAnalytics: Symbol.for("FetchGrowthAnalyticsUseCase"),
  },
  Controllers: {
    FetchCheckInAnalytics: Symbol.for("FetchCheckInAnalyticsController"),
    FetchRetentionAnalytics: Symbol.for("FetchRetentionAnalyticsController"),
    FetchGrowthAnalytics: Symbol.for("FetchGrowthAnalyticsController"),
  },
} as const
```

- **Step 2: Exportar do barrel types.ts**

Abrir `apps/backend/src/shared/infra/ioc/types.ts` e adicionar a linha de export no final:

```typescript
export { AUTH_TYPES } from "./module/service-identifier/auth-types"
export { CHECKIN_TYPES } from "./module/service-identifier/checkin-types"
export { GYM_TYPES } from "./module/service-identifier/gym-types"
export { HEALTH_CHECK_TYPES } from "./module/service-identifier/health-check-types"
export { NOTIFICATION_TYPES } from "./module/service-identifier/notification-types"
export { SHARED_TYPES } from "./module/service-identifier/shared-types"
export { USER_TYPES } from "./module/service-identifier/user-types"
export { ANALYTICS_TYPES } from "./module/service-identifier/analytics-types"
```

- **Step 3: Verificar TypeScript**

```bash
pnpm --filter backend tsc:check
```

Expected: nenhum erro.

- **Step 4: Commit**

```bash
git add apps/backend/src/shared/infra/ioc/module/service-identifier/analytics-types.ts \
        apps/backend/src/shared/infra/ioc/types.ts
git commit -m "feat(analytics): add ANALYTICS_TYPES service identifiers for Inversify IoC"
```

## Critérios de Sucesso

- `ANALYTICS_TYPES` tem `Repositories`, `UseCases` e `Controllers` com todos os Symbols
- `import { ANALYTICS_TYPES } from '@/shared/infra/ioc/types'` resolve sem erro
- `pnpm --filter backend tsc:check` passa
