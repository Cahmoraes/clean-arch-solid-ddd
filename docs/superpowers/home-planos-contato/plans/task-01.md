# Task 1: Backend — Endpoint `GET /plans` [FR-001]

**Status:** PENDING
**PRD:** `../prd/prd-home-planos-contato.md`
**Spec:** `../specs/home-planos-contato-design.md`
**Depends on:** N/A

## Visão Geral

Criar o endpoint `GET /plans` no backend Fastify que retorna os planos disponíveis como `DemoPlan[]`. Segue o padrão Clean Architecture com Inversify: tipo de domínio → use case → controller → registro no módulo IoC → setup no bootstrap. O array de planos (hoje `DEMO_PLANS`) é movido para o backend como fonte de verdade.

## Arquivos

- Create: `apps/backend/src/subscription/domain/plans.ts`
- Modify: `apps/backend/src/subscription/infra/ioc/subscription-types.ts` — adicionar `ListPlans` em `CONTROLLERS` e `USE_CASES`
- Create: `apps/backend/src/subscription/application/use-case/list-plans.usecase.ts`
- Modify: `apps/backend/src/subscription/infra/controller/routes/subscription-routes.ts` — adicionar `PLANS: "/plans"`
- Create: `apps/backend/src/subscription/infra/controller/list-plans.controller.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts` — bindings do use case e controller
- Modify: `apps/backend/src/bootstrap/setup-subscription-module.ts` — resolver o novo controller
- Create: `apps/backend/src/subscription/infra/controller/list-plans.business-flow-test.ts`

### Conformidade com as Skills Padrão

- `no-workarounds`: usar ao depurar erros de IoC (symbols duplicados, binding faltando) — nunca contornar com `any` ou supressão de erro
- `typescript-advanced`: tipar `ListPlansOutput` e `DemoPlan` sem `any`; usar `ReadonlyArray`
- `super.verification-before-completion`: rodar `pnpm --filter backend tsc:check`, `pnpm --filter backend biome:fix` e `pnpm --filter backend test:business-flow` antes de marcar DONE
- `super.systematic-debugging`: usar ao depurar falha de injeção do Inversify ou erro de binding

## Passos

### Step 1: Criar o tipo de domínio `DemoPlan` e a constante de planos

**Crie** `apps/backend/src/subscription/domain/plans.ts`:

```typescript
export interface DemoPlan {
  id: string
  name: string
  priceId: string
  priceLabel: string
  tagline: string
  features: ReadonlyArray<string>
}

export const DEMO_PLANS: ReadonlyArray<DemoPlan> = [
  {
    id: "premium-mensal",
    name: "Premium Mensal",
    priceId: "price_demo_monthly",
    priceLabel: "R$ 49,90/mês",
    tagline: "Acesso ilimitado a todas as academias parceiras.",
    features: [
      "Check-ins ilimitados",
      "Histórico completo de visitas",
      "Suporte prioritário",
    ],
  },
  {
    id: "premium-anual",
    name: "Premium Anual",
    priceId: "price_demo_yearly",
    priceLabel: "R$ 479,00/ano",
    tagline: "20% de economia comparado ao plano mensal.",
    features: [
      "Tudo do Premium Mensal",
      "Pagamento único anual",
      "Economia equivalente a 2 meses grátis",
    ],
  },
]
```

### Step 2: Adicionar símbolos Inversify para ListPlans

**Leia** `apps/backend/src/subscription/infra/ioc/subscription-types.ts` para ver os símbolos existentes e **adicione** `ListPlans` em `CONTROLLERS` e `USE_CASES`:

```typescript
// Dentro do objeto SUBSCRIPTION_TYPES, adicione:
CONTROLLERS: {
  // ... existentes ...
  ListPlans: Symbol.for("SUBSCRIPTION_TYPES.Controllers.ListPlans"),
},
USE_CASES: {
  // ... existentes ...
  ListPlans: Symbol.for("SUBSCRIPTION_TYPES.UseCases.ListPlans"),
},
```

### Step 3: Escrever o teste de integração (falha primeiro)

**Crie** `apps/backend/src/subscription/infra/controller/list-plans.business-flow-test.ts`:

```typescript
import { describe, expect, test } from "vitest"
import { serverBuild } from "@/bootstrap/server-build.js"

describe("GET /plans", () => {
  test("retorna array de planos disponíveis com shape correto", async () => {
    const server = await serverBuild()

    const response = await server.inject({
      method: "GET",
      url: "/plans",
    })

    expect(response.statusCode).toBe(200)
    const body = JSON.parse(response.payload) as unknown[]
    expect(body).toBeInstanceOf(Array)
    expect(body.length).toBeGreaterThan(0)
    expect(body[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      priceId: expect.any(String),
      priceLabel: expect.any(String),
      tagline: expect.any(String),
      features: expect.any(Array),
    })

    await server.close()
  })
})
```

### Step 4: Rodar o teste e confirmar que falha

```bash
pnpm --filter backend test:business-flow -- --reporter=verbose list-plans
```

Esperado: FAIL — "Cannot find module" ou 404 no endpoint.

### Step 5: Criar o use case `ListPlansUseCase`

**Crie** `apps/backend/src/subscription/application/use-case/list-plans.usecase.ts`:

```typescript
import { injectable } from "inversify"
import { DEMO_PLANS, type DemoPlan } from "../../domain/plans.js"

export type ListPlansOutput = ReadonlyArray<DemoPlan>

@injectable()
export class ListPlansUseCase {
  public execute(): ListPlansOutput {
    return DEMO_PLANS
  }
}
```

### Step 6: Adicionar a rota `/plans` às constantes de rotas

**Leia** `apps/backend/src/subscription/infra/controller/routes/subscription-routes.ts` e **adicione** a rota:

```typescript
// Dentro do objeto SubscriptionRoutes, adicione:
PLANS: "/plans",
```

### Step 7: Criar o controller `ListPlansController`

**Crie** `apps/backend/src/subscription/infra/controller/list-plans.controller.ts`:

```typescript
import { inject, injectable } from "inversify"
import { BaseController } from "@/shared/infra/controller/base-controller.js"
import { Logger } from "@/shared/infra/decorator/logger.js"
import { SHARED_TYPES } from "@/shared/infra/ioc/types.js"
import type { HttpServer } from "@/shared/infra/server/http-server.js"
import type { ListPlansUseCase } from "../../application/use-case/list-plans.usecase.js"
import { SUBSCRIPTION_TYPES } from "../ioc/subscription-types.js"
import { SubscriptionRoutes } from "./routes/subscription-routes.js"

@injectable()
export class ListPlansController extends BaseController {
  constructor(
    @inject(SHARED_TYPES.Server.Fastify)
    private readonly server: HttpServer,
    @inject(SUBSCRIPTION_TYPES.USE_CASES.ListPlans)
    private readonly listPlans: ListPlansUseCase,
  ) {
    super()
    this.bindMethods()
  }

  @Logger({ message: "✅" })
  public async init(): Promise<void> {
    await this.server.register(
      "get",
      SubscriptionRoutes.PLANS,
      {
        callback: this.callback,
        rateLimit: { max: 100, timeWindow: 60_000 },
      },
    )
  }

  private async callback() {
    return this.listPlans.execute()
  }
}
```

### Step 8: Registrar bindings no módulo Inversify

**Leia** `apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts` e **adicione** os bindings:

```typescript
// Adicione os imports no topo:
import { ListPlansUseCase } from "@/subscription/application/use-case/list-plans.usecase.js"
import { ListPlansController } from "@/subscription/infra/controller/list-plans.controller.js"

// Dentro do ContainerModule, adicione:
bind(SUBSCRIPTION_TYPES.USE_CASES.ListPlans).to(ListPlansUseCase)
bind(SUBSCRIPTION_TYPES.CONTROLLERS.ListPlans).to(ListPlansController)
```

### Step 9: Resolver o novo controller no bootstrap

**Leia** `apps/backend/src/bootstrap/setup-subscription-module.ts` e **adicione** o controller ao array de controllers retornado:

```typescript
// Adicione o import:
import type { ListPlansController } from "@/subscription/infra/controller/list-plans.controller.js"

// No array de controllers retornado, adicione:
resolve<ListPlansController>(SUBSCRIPTION_TYPES.CONTROLLERS.ListPlans),
```

### Step 10: Rodar o teste e confirmar que passa

```bash
pnpm --filter backend test:business-flow -- --reporter=verbose list-plans
```

Esperado: PASS — "retorna array de planos disponíveis com shape correto".

### Step 11: Verificar lint e tipos

```bash
pnpm --filter backend biome:fix
pnpm --filter backend tsc:check
```

Esperado: zero issues.

### Step 12: Commit

```bash
git -C /home/cahmoraes/projects/estudo/clean-arch-solid-ddd add \
  apps/backend/src/subscription/domain/plans.ts \
  apps/backend/src/subscription/application/use-case/list-plans.usecase.ts \
  apps/backend/src/subscription/infra/controller/list-plans.controller.ts \
  apps/backend/src/subscription/infra/controller/list-plans.business-flow-test.ts \
  apps/backend/src/subscription/infra/ioc/subscription-types.ts \
  apps/backend/src/subscription/infra/controller/routes/subscription-routes.ts \
  apps/backend/src/shared/infra/ioc/module/subscription/subscription-module.ts \
  apps/backend/src/bootstrap/setup-subscription-module.ts

git -C /home/cahmoraes/projects/estudo/clean-arch-solid-ddd commit -m "feat(subscription): adiciona endpoint GET /plans com DEMO_PLANS"
```

## Critérios de Sucesso

- `GET /plans` retorna 200 com `DemoPlan[]` (FR-001)
- Array contém pelo menos 2 planos com `id`, `name`, `priceId`, `priceLabel`, `tagline`, `features`
- `pnpm --filter backend biome:fix` passa com zero issues
- `pnpm --filter backend tsc:check` passa sem erros
- `pnpm --filter backend test:business-flow` passa
