# Task 2: Prisma migration + entidade Gym + PrismaGymRepository + factory [FR-001, FR-006]

**Status:** PENDING
**PRD:** `../prd/prd-spec-gym-dates.md`
**Spec:** `../specs/spec-gym-dates-design.md`
**Tier:** standard
**Depends on:** task-01

## Visão Geral

Adiciona coluna `operating_hours Json?` ao `Gym` no Prisma, estende `Gym` restore/create para hidratar VO, atualiza `PrismaGymRepository` save/update/createGym e factory `createAndSaveGym`. Sem alterar controllers ainda.

## Arquivos

- Modify: `apps/backend/prisma/schema.prisma`
- Modify: `apps/backend/src/gym/domain/gym.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/prisma/prisma-gym-repository.ts`
- Modify: `apps/backend/src/shared/infra/database/repository/in-memory/in-memory-gym-repository.ts`
- Modify: `apps/backend/test/factory/create-and-save-gym.ts`
- Test: `apps/backend/src/shared/infra/database/repository/prisma/prisma-gym-repository.operating-hours.test.ts` (opcional, pode ser coberto em task-07)

### Conformidade com as Skills Padrão

- `typescript-advanced`: tipagem de Json prisma + DTO OperatingHours.
- `no-workarounds`: migration via `prisma:migrate:dev` sem raw hack desnecessário.
- `refactoring`: mover mapping para funções puras `toPersistence/toDomain` se duplicado.

## Passos

- **Step 1: Write the failing test**

```typescript
// apps/backend/src/gym/domain/gym.test.ts (novo caso)
import { Gym } from "./gym.js";
import { OperatingHours } from "./value-object/spec-gym-dates.js";

test("Gym deve persistir operatingHours via restore", () => {
  const hours = OperatingHours.create([{ weekday: 1, intervals: [{ open: "08:00", close: "18:00" }] }]).forceSuccess().value;
  const gym = Gym.create({ title: "Gym A", cnpj: "11222333000181", latitude: -23.5, longitude: -46.6, address: "Rua X", phone: "11999999999", operatingHours: hours.toJSON() } as any).forceSuccess().value;
  expect(gym.operatingHours?.toJSON()).toEqual(hours.toJSON());
});
```

- **Step 2: Run test to verify it fails**

Run: `npx vitest run --config ./test/vite.config.app-domain.ts apps/backend/src/gym/domain/gym.test.ts -t "persistir operatingHours"`
Expected: FAIL — `operatingHours` unknown prop / `Gym` não aceita

- **Step 3: Write minimal implementation**

```prisma
// prisma/schema.prisma
model Gym {
  // ... existentes
  operating_hours Json? @db.Json
}
```

```bash
pnpm --filter backend prisma:migrate:dev --name add_operating_hours
pnpm --filter backend prisma:generate
```

```typescript
// gym.ts — estende GymCreateProps/GymRestoreProps
export type GymCreateProps = Omit<GymConstructor,"id"|"coordinate"|"title"|"phone"|"cnpj"|"status"|"operatingHours"> & { ..., operatingHours?: DayScheduleDTO[] | null }
export type GymRestoreProps = ... & { operatingHours?: DayScheduleDTO[] | null; status: GymStatusTypes }

private constructor(
  private readonly props: GymConstructor & { operatingHours: OperatingHours | null }
) {}

public static create(props: GymCreateProps): Either<..., Gym> {
  const operatingHoursResult = props.operatingHours ? OperatingHours.create(props.operatingHours) : success(null);
  if (operatingHoursResult.isFailure()) return failure(operatingHoursResult.value);
  // ... existing Name/CNPJ/Phone/Coordinate validations
  return success(new Gym({ ..., operatingHours: operatingHoursResult.value }));
}
public static restore(props: GymRestoreProps): Gym {
  return new Gym({ ..., operatingHours: OperatingHours.restore(props.operatingHours ?? null) });
}
get operatingHours(): OperatingHours | null { return this.props.operatingHours; }
```

```typescript
// prisma-gym-repository.ts — mapeia operating_hours
interface GymCreateProps { ..., operating_hours: Prisma.JsonValue | null }
async save(gym: Gym) { await prisma.gym.create({ data: { ..., operating_hours: gym.operatingHours?.toJSON() ?? Prisma.JsonNull } }) }
async update(gym: Gym) { await prisma.gym.update({ where:{id: gym.id}, data:{ ..., operating_hours: gym.operatingHours?.toJSON() ?? Prisma.JsonNull }}) }
private createGym(row: GymRow): Gym { return Gym.restore({ ..., operatingHours: row.operating_hours as DayScheduleDTO[] | null }) }
```

Atualiza `InMemoryGymRepository` e `createAndSaveGym` para aceitar `operatingHours`.

- **Step 4: Run test to verify it passes**

Run: `npx vitest run --config ./test/vite.config.app-domain.ts apps/backend/src/gym/domain/gym.test.ts -t "persistir operatingHours"`
Expected: PASS

Run: `npx vitest run --config ./test/vite.config.app-domain.ts apps/backend/src/shared/infra/database/repository/prisma/prisma-gym-repository.test.ts` (se existir) — sem regressão

## Critérios de Sucesso

- [ ] Migration `add_operating_hours` aplicada e `prisma generate` sem erro [FR-001, FR-006]
- [ ] `Gym.create` aceita `operatingHours` DTO opcional e valida via VO; `restore` hidrata corretamente
- [ ] `PrismaGymRepository.save/update` persiste `Json?` e `createGym` retorna VO igual ao salvo
- [ ] Factory e InMemory atualizados para testes subsequentes
