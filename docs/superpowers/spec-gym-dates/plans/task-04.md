# Task 4: Frontend base: tipos @repo/api-types + Zod + OperatingHoursField [FR-010, FR-003, FR-004, FR-005]

**Status:** PENDING
**PRD:** `../prd/prd-spec-gym-dates.md`
**Spec:** `../specs/spec-gym-dates-design.md`
**Tier:** standard
**Depends on:** task-01

## Visão Geral

Cria tipos compartilhados, Zod schemas frontend e componente `OperatingHoursField` reutilizável (7 linhas Dom–Sáb, toggle Fechado, +intervalo max 3/dia, input time, erro inline). Base para cadastro/edição.

## Arquivos

- Create: `apps/frontend/src/features/gyms/schemas/operating-hours-schema.ts`
- Modify: `apps/frontend/src/features/gyms/schemas/create-gym-schema.ts`
- Create: `apps/frontend/src/features/gyms/components/operating-hours-field.tsx`
- Create: `apps/frontend/src/features/gyms/lib/operating-hours.ts` (helpers: toCompactString, isOpenAt client)
- Test: `apps/frontend/src/features/gyms/components/operating-hours-field.test.tsx`
- Test: `apps/frontend/src/features/gyms/schemas/operating-hours-schema.test.ts`

### Conformidade com as Skills Padrão

- `zod`: schema com refinamentos para FR-003/004/005 espelhando backend.
- `typescript-advanced`: inferência `z.infer` e type-safe props.
- `frontend-design`: layout do field com shadcn/ui, acessibilidade.
- `tailwindcss`: estilos com tokens `--color-primary`, radius, spacing 4px.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/spec-gym-dates-visual.md` (não para este field, mas tokens compartilhados)
- **Fonte de design original:** nenhuma; seguir tokens de `src/app/globals.css`
- **Ferramentas de fidelidade visual:** nenhuma configurada; construir manualmente a partir do mockup/tokens
- **Decisões visuais já tomadas:** primary #39e58c, border #e4e4dc, radius 10-14px, Inter/Space Grotesk

## Passos

- **Step 1: Write the failing test**

```typescript
// operating-hours-schema.test.ts
import { operatingHoursSchema } from "./operating-hours-schema.js";
test("deve rejeitar sobreposição", () => {
  const result = operatingHoursSchema.safeParse([{ weekday: 1, intervals: [{ open: "08:00", close: "12:00" }, { open: "11:00", close: "14:00" }] }]);
  expect(result.success).toBe(false);
});
```

```tsx
// operating-hours-field.test.tsx
import { renderWithProviders } from "@/test/render.js";
import { OperatingHoursField } from "./operating-hours-field.js";
test("exibe 7 linhas e toggle Fechado limpa intervalos", async () => {
  const onChange = vi.fn();
  const { getByText, getByLabelText } = renderWithProviders(<OperatingHoursField value={[]} onChange={onChange} />);
  expect(getByText("Segunda")).toBeInTheDocument();
  const toggle = getByLabelText(/Segunda.*Fechado/i);
  await toggle.click();
  expect(onChange).toHaveBeenCalled();
});
```

- **Step 2: Run test to verify it fails**

Run: `npx vitest run --config ./vitest.config.ts src/features/gyms/schemas/operating-hours-schema.test.ts`
Expected: FAIL — cannot find module

Run: `npx vitest run src/features/gyms/components/operating-hours-field.test.tsx`
Expected: FAIL — OperatingHoursField not found

- **Step 3: Write minimal implementation**

```typescript
// operating-hours-schema.ts
import { z } from "zod";
const timeIntervalSchema = z.object({ open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/) }).refine(v=>v.open < v.close, "open < close");
const dayScheduleSchema = z.object({ weekday: z.number().int().min(0).max(6), intervals: z.array(timeIntervalSchema).max(3) }).refine(d=>{
  const s=[...d.intervals].sort((a,b)=>a.open.localeCompare(b.open));
  for(let i=1;i<s.length;i++) if(s[i-1].close > s[i].open) return false;
  return true;
}, "sobreposição");
export const operatingHoursSchema = z.array(dayScheduleSchema).max(7).optional().refine(arr=>!arr||new Set(arr.map(d=>d.weekday)).size===arr.length, "weekday duplicado");
export type OperatingHoursInput = z.infer<typeof operatingHoursSchema>;
```

```tsx
// operating-hours-field.tsx
import { useState } from "react";
import { Label } from "@/components/ui/label.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
export interface OperatingHoursFieldProps { value: DayScheduleDTO[] | null | undefined; onChange: (v: DayScheduleDTO[] | null) => void; error?: string }
const WEEKDAYS = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
export function OperatingHoursField({ value, onChange }: OperatingHoursFieldProps) {
  // 7 linhas, toggle Fechado (ausência de DaySchedule = fechado), + intervalo até 3, input type=time, erro inline
  return <div className="space-y-2">{/* implementação */}</div>;
}
```

Estende `createGymSchema` para incluir `operatingHours: operatingHoursSchema.optional()`.

```typescript
// operating-hours.ts helpers client
export function toCompactString(hours: DayScheduleDTO[] | null): string { /* agrupa */ return ""; }
export function isOpenAt(hours: DayScheduleDTO[] | null, date: Date, timeZone="America/Sao_Paulo"): boolean { /* Intl.DateTimeFormat */ return false; }
```

- **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/gyms/schemas/operating-hours-schema.test.ts`
Expected: PASS

Run: `npx vitest run src/features/gyms/components/operating-hours-field.test.tsx`
Expected: PASS

## Critérios de Sucesso

- [ ] `operatingHoursSchema` rejeita FR-003/004/005 e aceita múltiplos intervalos válidos
- [ ] `OperatingHoursField` renderiza 7 linhas, toggle Fechado, +intervalo max 3, type=time, erro inline [FR-010]
- [ ] `createGymSchema` estendido não quebra testes existentes de `create-gym-schema.test.ts`
