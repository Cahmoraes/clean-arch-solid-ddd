# Task 10: IoC — registrar RejectCheckIn no container [RF-001]

**Status:** DONE
**PRD:** `../prd/prd-checkin-approve-reject.md`
**Spec:** `../specs/checkin-approve-reject-design.md`

## Visão Geral

Adicionar os símbolos IoC `RejectCheckIn` em `CHECKIN_TYPES`, registrar o use case e controller no módulo, e resolver o controller no bootstrap.

**Depende de:** Task 7, Task 8

## Arquivos

- Modify: `apps/backend/src/shared/infra/ioc/module/service-identifier/checkin-types.ts`
- Modify: `apps/backend/src/shared/infra/ioc/module/check-in/check-in-module.ts`
- Modify: `apps/backend/src/bootstrap/setup-check-in-module.ts`

## Passos

- [ ] **Step 1: Adicionar símbolos RejectCheckIn em CHECKIN_TYPES**

Em `apps/backend/src/shared/infra/ioc/module/service-identifier/checkin-types.ts`, adicionar `RejectCheckIn` em `UseCases` e `Controllers`:

```typescript
export const CHECKIN_TYPES = {
	Repositories: {
		CheckIn: Symbol.for("CheckInRepository"),
	},
	PG: {
		CheckIn: Symbol.for("PgCheckInRepository"),
	},
	UseCases: {
		CreateCheckIn: Symbol.for("CreateCheckInUseCase"),
		ValidateCheckIn: Symbol.for("ValidateCheckInUseCase"),
		RejectCheckIn: Symbol.for("RejectCheckInUseCase"),
		FetchCheckIns: Symbol.for("FetchCheckInsUseCase"),
		CheckIn: Symbol.for("CheckInUseCase"),
		CheckInHistory: Symbol.for("CheckInHistoryUseCase"),
	},
	Controllers: {
		CheckIn: Symbol.for("CheckInController"),
		ValidateCheckIn: Symbol.for("ValidateCheckInController"),
		RejectCheckIn: Symbol.for("RejectCheckInController"),
		ListCheckIns: Symbol.for("ListCheckInsController"),
		Metrics: Symbol.for("CheckInMetricsController"),
	},
} as const
```

- [ ] **Step 2: Registrar bindings no check-in-module.ts**

Em `apps/backend/src/shared/infra/ioc/module/check-in/check-in-module.ts`, adicionar imports e bindings:

```typescript
import { ContainerModule } from "inversify"

import { CheckInUseCase } from "@/check-in/application/use-case/check-in.usecase"
import { CheckInHistoryUseCase } from "@/check-in/application/use-case/check-in-history.usecase"
import { FetchCheckInsUseCase } from "@/check-in/application/use-case/fetch-check-ins.usecase"
import { RejectCheckInUseCase } from "@/check-in/application/use-case/reject-check-in.usecase"
import { ValidateCheckInUseCase } from "@/check-in/application/use-case/validate-check-in.usecase"
import { CheckInController } from "@/check-in/infra/controller/check-in.controller"
import { ListCheckInsController } from "@/check-in/infra/controller/list-check-ins.controller"
import { MetricsController } from "@/check-in/infra/controller/metrics.controller"
import { RejectCheckInController } from "@/check-in/infra/controller/reject-check-in.controller"
import { ValidateCheckInController } from "@/check-in/infra/controller/validate-check-in.controller"

import { CHECKIN_TYPES } from "../../types"
import { CheckInRepositoryProvider } from "./check-in-repository-provider"

export const checkInModule = new ContainerModule(({ bind }) => {
	bind(CHECKIN_TYPES.Repositories.CheckIn)
		.toDynamicValue(CheckInRepositoryProvider.provide)
		.inSingletonScope()
	bind(CHECKIN_TYPES.Controllers.ValidateCheckIn).to(ValidateCheckInController)
	bind(CHECKIN_TYPES.Controllers.RejectCheckIn).to(RejectCheckInController)
	bind(CHECKIN_TYPES.Controllers.CheckIn).to(CheckInController)
	bind(CHECKIN_TYPES.Controllers.ListCheckIns).to(ListCheckInsController)
	bind(CHECKIN_TYPES.Controllers.Metrics).to(MetricsController)
	bind(CHECKIN_TYPES.UseCases.CheckIn).to(CheckInUseCase)
	bind(CHECKIN_TYPES.UseCases.CheckInHistory).to(CheckInHistoryUseCase)
	bind(CHECKIN_TYPES.UseCases.FetchCheckIns).to(FetchCheckInsUseCase)
	bind(CHECKIN_TYPES.UseCases.ValidateCheckIn).to(ValidateCheckInUseCase)
	bind(CHECKIN_TYPES.UseCases.RejectCheckIn).to(RejectCheckInUseCase)
})
```

- [ ] **Step 3: Resolver o controller no bootstrap**

Em `apps/backend/src/bootstrap/setup-check-in-module.ts`, adicionar o `RejectCheckIn` controller:

```typescript
import { CHECKIN_TYPES } from "@/shared/infra/ioc/types"

import { type ModuleControllers, resolve } from "./server-build"

/**
 * Setup Check-in Module
 * Resolves and returns all check-in-related controllers
 */
export function setupCheckInModule(): ModuleControllers {
	const controllers = [
		resolve(CHECKIN_TYPES.Controllers.CheckIn),
		resolve(CHECKIN_TYPES.Controllers.ValidateCheckIn),
		resolve(CHECKIN_TYPES.Controllers.RejectCheckIn),
		resolve(CHECKIN_TYPES.Controllers.ListCheckIns),
		resolve(CHECKIN_TYPES.Controllers.Metrics),
	]
	return { controllers }
}
```

- [ ] **Step 4: Type-check**

```bash
pnpm --filter backend tsc:check
```

Esperado: 0 erros.

- [ ] **Step 5: Rodar todos os testes**

```bash
pnpm --filter backend test:run
```

Esperado: todos passam.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/shared/infra/ioc/module/service-identifier/checkin-types.ts \
        apps/backend/src/shared/infra/ioc/module/check-in/check-in-module.ts \
        apps/backend/src/bootstrap/setup-check-in-module.ts
git commit -m "feat(check-in): register RejectCheckIn in IoC container
```

## Critérios de Sucesso

- `CHECKIN_TYPES.UseCases.RejectCheckIn` e `CHECKIN_TYPES.Controllers.RejectCheckIn` existem
- `RejectCheckInUseCase` e `RejectCheckInController` estão ligados no módulo
- Controller resolvido no bootstrap
- 0 erros de TypeScript
- Todos os testes passam
