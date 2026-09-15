# Task 3: Backend API: use cases create/update/fetch + controllers Zod + OpenAPI [FR-001, FR-002, FR-003, FR-004, FR-005, FR-006]

**Status:** PENDING
**PRD:** `../prd/prd-spec-gym-dates.md`
**Spec:** `../specs/spec-gym-dates-design.md`
**Tier:** standard
**Depends on:** task-02

## Visão Geral

Estende `create-gym`, `update-gym`, `fetch-gym-by-id` (e `fetch-all/search` se necessário) para aceitar/retornar `operatingHours`, com validação Zod no transport e mapeamento `InvalidOperatingHoursError` → 400, atualizando OpenAPI e tipos.

## Arquivos

- Modify: `apps/backend/src/gym/application/use-case/create-gym.usecase.ts`
- Modify: `apps/backend/src/gym/application/use-case/update-gym.usecase.ts`
- Modify: `apps/backend/src/gym/application/use-case/fetch-gym-by-id.usecase.ts`
- Modify: `apps/backend/src/gym/infra/controller/create-gym.controller.ts`
- Modify: `apps/backend/src/gym/infra/controller/update-gym.controller.ts`
- Modify: `apps/backend/src/gym/infra/controller/fetch-gym-by-id.controller.ts`
- Modify: `apps/backend/src/gym/infra/controller/schemas/gym-schemas.ts` (ou inline schemas)
- Modify: `apps/backend/docs/openapi-spec.json` (via `makeCreateGymSwaggerSchema` + export)
- Test: `apps/backend/src/gym/application/use-case/create-gym.usecase.test.ts` (novos casos)
- Test: `apps/backend/src/gym/application/use-case/update-gym.usecase.test.ts`

### Conformidade com as Skills Padrão

- `zod`: schema `operatingHoursSchema` com refinamentos FR-003/004/005.
- `typescript-advanced`: Either chaining em use cases sem throw.
- `no-workarounds`: mapear erro de domínio para HTTP correto, sem `as any` para silenciar.

## Passos

- **Step 1: Write the failing test**

```typescript
// create-gym.usecase.test.ts novo caso
test("Deve rejeitar horário com intervalo sobreposto", async () => {
  const result = await sut.execute({
    title: "Gym", cnpj: "11222333000181", latitude: -23.5, longitude: -46.6, address: "Rua X", phone: "11999999999",
    operatingHours: [{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }, { open: "11:30", close: "14:00" }] }]
  });
  expect(result.isFailure()).toBe(true);
  expect(result.value).toBeInstanceOf(InvalidOperatingHoursError);
});
test("Deve criar gym com operatingHours válido e fetch deve retornar", async () => {
  const created = await sut.execute({ title: "Gym B", cnpj: "22333444000181", latitude: -23.5, longitude: -46.6, address: "Rua Y", operatingHours: [{ weekday: 1, intervals: [{ open: "08:00", close: "18:00" }] }] });
  expect(created.isSuccess()).toBe(true);
  const fetched = await fetchById.execute({ gymId: created.forceSuccess().value.gymId });
  expect(fetched.forceSuccess().value.gym.operatingHours).toEqual([{ weekday: 1, intervals: [{ open: "08:00", close: "18:00" }] }]);
});
```

- **Step 2: Run test to verify it fails**

Run: `npx vitest run --config ./test/vite.config.app-domain.ts apps/backend/src/gym/application/use-case/create-gym.usecase.test.ts -t "rejeitar horário"`
Expected: FAIL — `operatingHours` ignorado / não validado

- **Step 3: Write minimal implementation**

```typescript
// gym-schemas.ts
export const timeIntervalSchema = z.object({ open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }).refine(v => v.open < v.close, { message: "open deve ser < close" });
export const dayScheduleSchema = z.object({ weekday: z.number().int().min(0).max(6), intervals: z.array(timeIntervalSchema).max(3) }).refine(d => {
  const sorted = [...d.intervals].sort((a,b)=>a.open.localeCompare(b.open));
  for(let i=1;i<sorted.length;i++) if (sorted[i-1].close > sorted[i].open) return false;
  return true;
}, { message: "intervalos sobrepostos" });
export const operatingHoursSchema = z.array(dayScheduleSchema).max(7).optional().refine(arr => !arr || new Set(arr.map(d=>d.weekday)).size===arr.length, { message:"weekday duplicado" });

export const createGymSchema = z.object({
  title: z.string(), cnpj: z.string(), description: z.string().optional(), phone: z.string().optional(),
  latitude: z.number(), longitude: z.number(), address: z.string(),
  operatingHours: operatingHoursSchema
});
```

```typescript
// create-gym.usecase.ts
async execute(input: CreateGymUseCaseInput & { operatingHours?: DayScheduleDTO[] }): Promise<Either<..., CreateGymResponse>> {
  const operatingHoursResult = input.operatingHours ? OperatingHours.create(input.operatingHours) : success(null);
  if (operatingHoursResult.isFailure()) return failure(operatingHoursResult.value);
  const gymResult = Gym.create({ ..., operatingHours: operatingHoursResult.value?.toJSON() ?? null });
  // ... existing flow
}

// fetch-gym-by-id.usecase.ts
toDTO(gym: Gym) { return { ..., operatingHours: gym.operatingHours?.toJSON() ?? null } }
```

Atualiza `update-gym.usecase.ts` para substituir integralmente `operatingHours` quando fornecido (FR-002: `[]` = todos fechados, `undefined` = manter null).

```typescript
// controllers — isProtected:true, onlyAdmin:true mantido
createGymSchema.parse(request.body) // inclui operatingHours
fetch-gym-by-id.controller: retorna operatingHours no JSON 200
```

Regenera OpenAPI: `pnpm --filter backend openapi:export` → verifica `makeCreateGymSwaggerSchema` inclui `operatingHours`.

- **Step 4: Run test to verify it passes**

Run: `npx vitest run --config ./test/vite.config.app-domain.ts apps/backend/src/gym/application/use-case/create-gym.usecase.test.ts -t "rejeitar horário"`
Expected: PASS

Run: `npx vitest run --config ./test/vite.config.app-domain.ts apps/backend/src/gym/application/use-case/update-gym.usecase.test.ts`
Expected: PASS com caso de substituição

## Critérios de Sucesso

- [ ] `POST /gyms` aceita `operatingHours` opcional válido e persiste; payload inválido retorna 400 [FR-001, FR-003, FR-004, FR-005]
- [ ] `PUT /gyms/:id` substitui horário integralmente; `[]` zera, `undefined` mantém null [FR-002]
- [ ] `GET /gyms/:id` retorna `operatingHours` idêntico ou `null` [FR-006]
- [ ] OpenAPI exportado contém `operatingHours` e `pnpm generate:types` subsequente refletirá (validado em task-04/07)
