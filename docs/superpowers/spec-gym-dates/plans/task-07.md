# Task 7: Testes de cobertura e polish: unit/integration/component + regeneração tipos + ajustes finais [FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010]

**Status:** DONE
**PRD:** `../prd/prd-spec-gym-dates.md`
**Spec:** `../specs/spec-gym-dates-design.md`
**Tier:** standard
**Depends on:** task-05, task-06

## Visão Geral

Garante cobertura dos invariantes não cobertos nas tasks anteriores, testes de integração Prisma e business-flow, testes de componente para Field/Summary, regeneração de `@repo/api-types` e polish visual. Fecha gaps de FRs.

## Arquivos

- Modify: `apps/backend/src/gym/domain/value-object/spec-gym-dates.test.ts` (casos de borda adicionais)
- Create: `apps/backend/test/spec-gym-dates.business-flow-test.ts` (HTTP 400/201 com operatingHours)
- Modify: `apps/frontend/src/features/gyms/components/operating-hours-field.test.tsx` (casos adicionais)
- Modify: `apps/frontend/src/features/gyms/components/operating-hours-summary.test.tsx` (bordas timezone 22:00, múltiplos intervalos)
- Modify: `packages/api-types/index.d.ts` (regenerado via `pnpm generate:types`)
- Test: `apps/backend/src/gym/application/use-case/fetch-gym-by-id.usecase.test.ts`

### Conformidade com as Skills Padrão

- `test-antipatterns`: testa comportamento real (VO e HTTP), não mocks internos.
- `no-workarounds`: corrige falhas de tipo/estilo sem `any` ou biome:ignore.
- `typescript-advanced`: geração de tipos OpenAPI validada.

## Passos

- **Step 1: Write the failing test**

```typescript
// spec-gym-dates.test.ts casos de borda
test("toCompactString agrupa Seg-Sex com mesmo horário", () => {
  const hours = OperatingHours.create([
    { weekday:1, intervals:[{open:"06:00",close:"22:00"}] },
    { weekday:2, intervals:[{open:"06:00",close:"22:00"}] },
    { weekday:3, intervals:[{open:"06:00",close:"22:00"}] },
    { weekday:4, intervals:[{open:"06:00",close:"22:00"}] },
    { weekday:5, intervals:[{open:"06:00",close:"22:00"}] },
    { weekday:6, intervals:[{open:"08:00",close:"14:00"}] },
  ]).forceSuccess().value;
  expect(hours.toCompactString()).toContain("Seg–Sex 06:00–22:00");
});
```

```typescript
// business-flow: POST /gyms com operatingHours inválido deve 400
test("POST /gyms deve rejeitar operatingHours sobreposto com 400", async () => {
  const res = await app.inject({ method:"POST", url:"/gyms", payload:{ title:"Gym", cnpj:"99888777000100", latitude:-23.5, longitude:-46.6, address:"Rua X", operatingHours:[{ weekday:1, intervals:[{open:"08:00",close:"12:00"},{open:"11:00",close:"14:00"}]}] }});
  expect(res.statusCode).toBe(400);
});
```

- **Step 2: Run test to verify it fails**

Run: `npx vitest run --config ./test/vite.config.app-domain.ts apps/backend/src/gym/domain/value-object/spec-gym-dates.test.ts -t "toCompactString agrupa"`
Expected: FAIL se método ainda não agrupa corretamente (esperado `Seg–Sex` mas retorna lista separada)

Run: `npx vitest run --config ./test/vite.config.business-flow.ts test/spec-gym-dates.business-flow-test.ts -t "rejeitar"`
Expected: FAIL se controller ainda não valida corretamente

- **Step 3: Write minimal implementation**

Ajusta `OperatingHours.toCompactString` para agrupar consecutivos com `intervals` idênticos (JSON.stringify comparison). Garante `isOpenAt` usa `Intl.DateTimeFormat({ timeZone, weekday:"short", hour:"2-digit", minute:"2-digit", hour12:false })` e compara lexicograficamente `HH:mm`.

```bash
pnpm generate:types
# verifica packages/api-types/index.d.ts contém operatingHours
```

Ajusta `OperatingHoursSummary` para exibir `Abre às HH:mm` quando fechado e próximo intervalo.

- **Step 4: Run test to verify it passes**

Run: `npx vitest run --config ./test/vite.config.app-domain.ts apps/backend/src/gym/domain/value-object/spec-gym-dates.test.ts -t "toCompactString"`
Expected: PASS

Run: `npx vitest run --config ./test/vite.config.business-flow.ts test/spec-gym-dates.business-flow-test.ts -t "rejeitar"`
Expected: PASS com 400 e 201 para válido

Run: `npx vitest run src/features/gyms/components/operating-hours-summary.test.tsx`
Expected: PASS

## Critérios de Sucesso

- [ ] `toCompactString` agrupa corretamente e `isOpenAt` passa em bordas 22:00 [FR-007, FR-009]
- [ ] Business-flow `POST/PUT /gyms` com operatingHours válido/inválido cobre 400/200 [FR-003, FR-004, FR-005, FR-006]
- [ ] Component tests de Field/Summary cobrem FR-008/010 sem flake
- [ ] `@repo/api-types` regenerado contém `operatingHours`
