# Task 9: Backend IoC — analytics-module + wiring + geração de types [FR-001]

**Status:** DONE
**PRD:** `../prd/prd-admin-analytics.md`
**Spec:** `../specs/admin-analytics-design.md`
**Depends on:** task-08

## Visão Geral

Cria o `analyticsModule` (ContainerModule do Inversify) que registra repositórios, use cases e controllers de analytics. Carrega o módulo no container principal e gera os tipos OpenAPI compartilhados com o frontend via `pnpm generate:types`.

## Arquivos

- Create: `apps/backend/src/shared/infra/ioc/module/analytics/analytics-module.ts`
- Modify: `apps/backend/src/shared/infra/ioc/container.ts`

### Conformidade com as Skills Padrão

- no-workarounds: registrar repositórios com `.toDynamicValue(Provider.provide).inSingletonScope()`, exatamente como os outros módulos. Não usar `.toConstantValue()` no módulo de produção.

## Passos

- **Step 1: Criar analytics-module.ts**

```typescript
// apps/backend/src/shared/infra/ioc/module/analytics/analytics-module.ts
import { ContainerModule } from "inversify"
import { FetchCheckInAnalyticsUseCase } from "@/analytics/application/use-case/fetch-check-in-analytics.usecase"
import { FetchGrowthAnalyticsUseCase } from "@/analytics/application/use-case/fetch-growth-analytics.usecase"
import { FetchRetentionAnalyticsUseCase } from "@/analytics/application/use-case/fetch-retention-analytics.usecase"
import { FetchCheckInAnalyticsController } from "@/analytics/infra/http/controller/fetch-check-in-analytics.controller"
import { FetchGrowthAnalyticsController } from "@/analytics/infra/http/controller/fetch-growth-analytics.controller"
import { FetchRetentionAnalyticsController } from "@/analytics/infra/http/controller/fetch-retention-analytics.controller"
import { ANALYTICS_TYPES } from "../../types"
import { AnalyticsCheckInRepositoryProvider } from "./analytics-check-in-repository-provider"
import { AnalyticsUserRepositoryProvider } from "./analytics-user-repository-provider"

export const analyticsModule = new ContainerModule(({ bind }) => {
  bind(ANALYTICS_TYPES.Repositories.AnalyticsCheckIn)
    .toDynamicValue(AnalyticsCheckInRepositoryProvider.provide)
    .inSingletonScope()

  bind(ANALYTICS_TYPES.Repositories.AnalyticsUser)
    .toDynamicValue(AnalyticsUserRepositoryProvider.provide)
    .inSingletonScope()

  bind(ANALYTICS_TYPES.UseCases.FetchCheckInAnalytics).to(FetchCheckInAnalyticsUseCase)
  bind(ANALYTICS_TYPES.UseCases.FetchRetentionAnalytics).to(FetchRetentionAnalyticsUseCase)
  bind(ANALYTICS_TYPES.UseCases.FetchGrowthAnalytics).to(FetchGrowthAnalyticsUseCase)

  bind(ANALYTICS_TYPES.Controllers.FetchCheckInAnalytics).to(FetchCheckInAnalyticsController)
  bind(ANALYTICS_TYPES.Controllers.FetchRetentionAnalytics).to(FetchRetentionAnalyticsController)
  bind(ANALYTICS_TYPES.Controllers.FetchGrowthAnalytics).to(FetchGrowthAnalyticsController)
})
```

- **Step 2: Abrir container.ts e adicionar o analyticsModule**

Arquivo atual: `apps/backend/src/shared/infra/ioc/container.ts`

Localizar as linhas de import e adicionar:

```typescript
import { Container } from "inversify"
import { analyticsModule } from "./module/analytics/analytics-module"  // ADICIONAR
import { checkInModule } from "./module/check-in/check-in-module"
import { gymModule } from "./module/gym/gym-module"
import { healthCheckModule } from "./module/health-check/heath-check-module"
import { infraModule } from "./module/infra/infra-module"
import { notificationModule } from "./module/notification/notification-module"
import { sessionModule } from "./module/session/session-module"
import { subscriptionModule } from "./module/subscription/subscription-module"
import { userModule } from "./module/user/user-module"

export const container = new Container()
container.load(
  userModule,
  gymModule,
  checkInModule,
  infraModule,
  sessionModule,
  healthCheckModule,
  subscriptionModule,
  notificationModule,
  analyticsModule,  // ADICIONAR
)
```

- **Step 3: Verificar TypeScript**

```bash
pnpm --filter backend tsc:check
```

Expected: nenhum erro.

- **Step 4: Rodar todos os testes**

```bash
pnpm --filter backend test:run
```

Expected: todos os testes existentes passam.

- **Step 5: Gerar os tipos OpenAPI para o frontend**

```bash
pnpm generate:types
```

Expected: o comando exporta o spec do backend e regenera `packages/api-types/src/`. Confirmar que os paths `/admin/analytics/checkins`, `/admin/analytics/retention` e `/admin/analytics/growth` aparecem nos tipos gerados:

```bash
grep -r "admin/analytics" packages/api-types/src/
```

Expected: linhas com `"/admin/analytics/checkins"`, `"/admin/analytics/retention"`, `"/admin/analytics/growth"`.

## Critérios de Sucesso

- `analyticsModule` carregado no container principal
- `container.get(ANALYTICS_TYPES.Controllers.FetchCheckInAnalytics)` resolve sem erro
- Os três endpoints aparecem nos tipos gerados em `packages/api-types/`
- `pnpm --filter backend tsc:check` passa
- `pnpm --filter backend test:run` passa
