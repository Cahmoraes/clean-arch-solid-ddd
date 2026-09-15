# Task 5: Frontend detalhe: OperatingHoursSummary + useIsGymOpen + integração DetailCard [FR-006, FR-007, FR-008, FR-009]

**Status:** PENDING
**PRD:** `../prd/prd-gym-operating-hours.md`
**Spec:** `../specs/gym-operating-hours-design.md`
**Tier:** standard
**Depends on:** task-02

## Visão Geral

Implementa `OperatingHoursSummary` com layout C (resumo compacto agrupado + badge Aberto agora/Fechado + tabela expansível com today highlight) e hook `useIsGymOpen`, integrando ao `DetailCard` em `/academias/[id]`.

## Arquivos

- Create: `apps/frontend/src/features/gyms/components/operating-hours-summary.tsx`
- Create: `apps/frontend/src/features/gyms/hooks/use-is-gym-open.ts`
- Modify: `apps/frontend/src/app/(authenticated)/academias/[id]/page.tsx`
- Modify: `apps/frontend/src/features/gyms/api/index.ts` (ajusta type `Gym` para incluir `operatingHours`)
- Modify: `apps/frontend/src/features/gyms/api/extended-paths.ts` (GymSummary com operatingHours)
- Test: `apps/frontend/src/features/gyms/components/operating-hours-summary.test.tsx`

### Conformidade com as Skills Padrão

- `frontend-design`: fidelidade ao DetailCard existente (gap-6/p-6, rounded-[12px]).
- `tailwindcss`: tokens primary #39e58c, border, bg #fcfcf9.
- `vercel-react-best-practices`: memoização de agrupamento e cálculo isOpenAt, sem re-render desnecessário.
- `typescript-advanced`: tipagem strict para DTO e timezone.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/gym-operating-hours-visual.md` (layout C — baseline)
- **Fonte de design original:** nenhuma; seguir o mockup curado
- **Confirmar com o usuário:** existe fonte de design original para o detalhe além do mockup?
- **Ferramentas de fidelidade visual:** nenhuma; construir manualmente a partir do mockup
- **Decisões visuais já tomadas (não refazer):** bloco `rounded-[10px] border-border bg-[#fcfcf9]` após `<dl>`, header Clock 11px uppercase, badge pill Aberto #e6f9ee/#b6e8c8 vs Fechado #fff1f0/#ffd0cc, resumo agrupado `Seg–Sex ...`, tabela 7 linhas com `today` `rgba(57,229,140,.10)`, estado vazio tracejado.

## Passos

- **Step 0: Confirm design source & fidelity tools**

Ler `### Fidelidade Visual` acima; confirmar com usuário se há URL de Figma além do mockup. Se não houver, seguir `gym-operating-hours-visual.md` manualmente.

- **Step 1: Write the failing test**

```tsx
// operating-hours-summary.test.tsx
import { renderWithProviders } from "@/test/render.js";
import { OperatingHoursSummary } from "./operating-hours-summary.js";

test("exibe resumo compacto e badge Aberto agora", () => {
  const hours = [{ weekday: 1, intervals: [{ open: "06:00", close: "22:00" }] }, { weekday: 6, intervals: [{ open: "08:00", close: "14:00" }] }];
  const { getByText } = renderWithProviders(<OperatingHoursSummary operatingHours={hours} now={new Date("2026-09-15T13:00:00Z")} />);
  expect(getByText(/Aberto agora/i)).toBeInTheDocument();
  expect(getByText(/Seg.*06:00/)).toBeInTheDocument();
});
test("exibe Horário não informado quando null", () => {
  const { getByText } = renderWithProviders(<OperatingHoursSummary operatingHours={null} />);
  expect(getByText(/Horário não informado/i)).toBeInTheDocument();
});
```

- **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/gyms/components/operating-hours-summary.test.tsx`
Expected: FAIL — module not found

- **Step 3: Write minimal implementation**

```tsx
// use-is-gym-open.ts
export function useIsGymOpen(operatingHours: DayScheduleDTO[] | null | undefined, now: Date = new Date(), timeZone="America/Sao_Paulo") {
  // usa Intl.DateTimeFormat para weekday e HH:mm em timeZone, checa intervals
  return { isOpen: boolean, closesAt: string | null, opensAt: string | null };
}

// operating-hours-summary.tsx
import { Clock } from "lucide-react";
import { useIsGymOpen, toCompactString } from "@/features/gyms/lib/operating-hours.js";

export function OperatingHoursSummary({ operatingHours, now }: { operatingHours: DayScheduleDTO[] | null; now?: Date }) {
  if (!operatingHours || operatingHours.length===0) return <div className="mt-3 rounded-[10px] border border-dashed border-border p-2.5 text-xs text-muted-foreground">Horário não informado</div>;
  const { isOpen, closesAt } = useIsGymOpen(operatingHours, now);
  const compact = toCompactString(operatingHours);
  return (
    <div className="mt-3 rounded-[10px] border border-border bg-[#fcfcf9] overflow-hidden">
      <div className="flex items-center gap-1.5 px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[.05em] text-muted-foreground border-b border-border"><Clock className="h-3.5 w-3.5" /> Horário de funcionamento</div>
      <div className="flex items-center justify-between px-2.5 py-2">
        <span className={`text-xs font-semibold ${isOpen?"text-[#0a7a3a]":"text-[#b42318]"}`}>{isOpen?"● Aberto agora":"● Fechado"}</span>
        {closesAt && <span className={`rounded-full border px-2 py-1 text-[11px] font-bold ${isOpen?"bg-[#e6f9ee] border-[#b6e8c8] text-[#0a7a3a]":"bg-[#fff1f0] border-[#ffd0cc] text-[#b42318]"}`}>{isOpen?`Fecha às ${closesAt}`:`Abre às ${closesAt}`}</span>}
      </div>
      <div className="px-2.5 pb-1 text-xs">{compact}</div>
      <details className="border-t border-border"><summary className="flex justify-center py-1.5 text-[11px] text-muted-foreground cursor-pointer">Ver horários completos ▾</summary>
        <table className="w-full text-xs"><tbody>{/* 7 linhas, today highlight via Intl weekday */}</tbody></table>
      </details>
    </div>
  );
}
```

Integra ao `DetailCard` em `page.tsx` após `<dl>`:

```tsx
import { OperatingHoursSummary } from "@/features/gyms/components/operating-hours-summary.js";
<dl>...</dl>
<OperatingHoursSummary operatingHours={gym.operatingHours as DayScheduleDTO[] | null} />
```

Estende `Gym`/`GymSummary` com `operatingHours: DayScheduleDTO[] | null`.

- **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/gyms/components/operating-hours-summary.test.tsx`
Expected: PASS

## Critérios de Sucesso

- [ ] `OperatingHoursSummary` renderiza resumo agrupado e tabela expansível 7 dias com today highlight [FR-007]
- [ ] Badge Aberto/Fechado com `America/Sao_Paulo` correto em bordas (ex: 21:59 aberto, 22:01 fechado) [FR-009]
- [ ] Estado vazio “Horário não informado” quando null [FR-008]
- [ ] `GET /gyms/:id` mockado retorna operatingHours e DetailCard exibe sem regressão no DetailCard existente
