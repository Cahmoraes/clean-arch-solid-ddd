# Task 1: VO de domínio OperatingHours (TimeInterval/DaySchedule) com validação e isOpenAt [FR-003, FR-004, FR-005]

**Status:** PENDING
**PRD:** `../prd/prd-spec-gym-dates.md`
**Spec:** `../specs/spec-gym-dates-design.md`
**Tier:** capable
**Depends on:** N/A

## Visão Geral

Criar Value Objects de domínio `TimeInterval`, `DaySchedule` e `OperatingHours` com invariantes (HH:mm, open<close, sem sobreposição intra-dia, weekday 0-6 sem duplicar) e métodos `create/restore/equals/toJSON/isOpenAt/toCompactString`. Base para todo o fluxo.

## Arquivos

- Create: `apps/backend/src/gym/domain/value-object/spec-gym-dates.ts`
- Create: `apps/backend/src/gym/domain/value-object/errors/invalid-operating-hours-error.ts`
- Modify: `apps/backend/src/gym/domain/gym.ts` (adiciona campo opcional e integração no create/restore, mas sem persistência ainda — persistência é task-02)
- Test: `apps/backend/src/gym/domain/value-object/spec-gym-dates.test.ts`

### Conformidade com as Skills Padrão

- `typescript-advanced`: tipagem de VO com generics Either, mapped types para DTO JSON.
- `zod`: referência para validar formato HH:mm no VO (regex) alinhado ao schema transport.
- `no-workarounds`: corrigir causa raiz de invariantes (sobreposição/ordenação), sem suprimir com any/cast.

## Passos

- **Step 1: Write the failing test**

```typescript
// apps/backend/src/gym/domain/value-object/spec-gym-dates.test.ts
import { describe, test, expect } from "vitest";
import { OperatingHours } from "./spec-gym-dates.js";

describe("OperatingHours", () => {
  test("deve rejeitar open >= close", () => {
    const result = OperatingHours.create([{ weekday: 1, intervals: [{ open: "10:00", close: "09:00" }] }]);
    expect(result.isFailure()).toBe(true);
  });
  test("deve rejeitar sobreposição intra-dia", () => {
    const result = OperatingHours.create([{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }, { open: "11:00", close: "14:00" }] }]);
    expect(result.isFailure()).toBe(true);
  });
  test("deve aceitar múltiplos intervalos não sobrepostos e calcular isOpenAt", () => {
    const hours = OperatingHours.create([{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }, { open: "14:00", close: "18:00" }] }]).forceSuccess().value;
    // segunda 10:00 America/Sao_Paulo deve estar aberto
    const date = new Date("2026-09-14T13:00:00.000Z"); // 10:00 em Sao Paulo (UTC-3)
    expect(hours.isOpenAt(date, "America/Sao_Paulo")).toBe(true);
  });
}
```

- **Step 2: Run test to verify it fails**

Run: `npx vitest run --config ./test/vite.config.app-domain.ts apps/backend/src/gym/domain/value-object/spec-gym-dates.test.ts`
Expected: FAIL with "Cannot find module ./spec-gym-dates.js" / "OperatingHours is not defined"

- **Step 3: Write minimal implementation**

```typescript
// apps/backend/src/gym/domain/value-object/spec-gym-dates.ts
import { Either, failure, success } from "@/shared/domain/either.js";
import { InvalidOperatingHoursError } from "./errors/invalid-operating-hours-error.js";

export interface TimeIntervalDTO { open: string; close: string }
export interface DayScheduleDTO { weekday: number; intervals: TimeIntervalDTO[] }

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class TimeInterval {
  private constructor(readonly open: string, readonly close: string) {}
  static create(dto: TimeIntervalDTO): Either<InvalidOperatingHoursError, TimeInterval> {
    if (!HH_MM.test(dto.open) || !HH_MM.test(dto.close)) return failure(new InvalidOperatingHoursError("formato HH:mm inválido"));
    if (dto.open >= dto.close) return failure(new InvalidOperatingHoursError("open deve ser < close"));
    return success(new TimeInterval(dto.open, dto.close));
  }
}
export class OperatingHours {
  private constructor(private readonly schedules: DayScheduleDTO[]) {}
  static create(dto: DayScheduleDTO[]): Either<InvalidOperatingHoursError, OperatingHours> {
    // valida weekday 0-6, sem duplicar, ordena intervals, checa sobreposição prev.close <= next.open, HH:mm
    // ... implementação completa
    return success(new OperatingHours(dto));
  }
  static restore(json: DayScheduleDTO[] | null): OperatingHours | null {
    if (!json) return null;
    return new OperatingHours(json);
  }
  toJSON(): DayScheduleDTO[] { return this.schedules; }
  equals(other: OperatingHours | null): boolean { /* compara JSON */ return false; }
  isEmpty(): boolean { return this.schedules.length === 0; }
  isOpenAt(date: Date, timeZone: string): boolean { /* converte via Intl.DateTimeFormat com timeZone */ return false; }
  toCompactString(): string { /* agrupa dias consecutivos com mesmo intervals, ex: Seg–Sex 06:00–22:00 */ return ""; }
}
```

```typescript
// apps/backend/src/gym/domain/value-object/errors/invalid-operating-hours-error.ts
export class InvalidOperatingHoursError extends Error {
  constructor(message: string) { super(message); this.name = "InvalidOperatingHoursError"; }
}
```

Ajuste `Gym` para aceitar `operatingHours?: OperatingHours | null` em `GymCreateProps/GymRestoreProps` e expôr getter.

- **Step 4: Run test to verify it passes**

Run: `npx vitest run --config ./test/vite.config.app-domain.ts apps/backend/src/gym/domain/value-object/spec-gym-dates.test.ts`
Expected: PASS (3 tests)

## Critérios de Sucesso

- [ ] `OperatingHours.create` rejeita HH:mm inválido, open>=close, sobreposição, weekday duplicado/fora de 0-6
- [ ] `isOpenAt` retorna true/false corretamente com timeZone America/Sao_Paulo e múltiplos intervalos [FR-003, FR-004, FR-005]
- [ ] `toCompactString` agrupa dias consecutivos e `restore/toJSON` round-trip preserva dados
- [ ] `Gym.create` integra VO via Either sem throw
