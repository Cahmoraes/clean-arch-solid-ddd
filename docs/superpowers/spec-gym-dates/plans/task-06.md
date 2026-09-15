# Task 6: Frontend admin: integração OperatingHoursField nas páginas nova/editar + client create/update [FR-001, FR-002, FR-010]

**Status:** PENDING
**PRD:** `../prd/prd-spec-gym-dates.md`
**Spec:** `../specs/spec-gym-dates-design.md`
**Tier:** standard
**Depends on:** task-03, task-04

## Visão Geral

Liga `OperatingHoursField` às páginas de cadastro e edição de academia, ajustando `useCreateGym`/`useUpdateGym` para enviar `operatingHours` e carregar valor existente na edição. Campo opcional colapsado.

## Arquivos

- Modify: `apps/frontend/src/app/(authenticated)/admin/academias/nova/page.tsx`
- Modify: `apps/frontend/src/app/(authenticated)/admin/academias/[id]/editar/page.tsx`
- Modify: `apps/frontend/src/features/gyms/api/index.ts` (buildCreateGymBody, useCreateGym/useUpdateGym)
- Modify: `apps/frontend/src/features/gyms/api/extended-paths.ts` (GymCreateBody/GymUpdateBody com operatingHours)
- Test: `apps/frontend/src/app/(authenticated)/admin/academias/nova/page.test.tsx` (novo caso)
- Test: `apps/frontend/src/features/gyms/api/index.test.tsx` (mock POST/PUT com operatingHours)

### Conformidade com as Skills Padrão

- `tanstack-query-best-practices`: invalidação `gymsKeys.all` após mutação, optimistic update não usado.
- `zod`: validação de operatingHours no client antes do submit.
- `typescript-advanced`: tipagem de `CreateGymInput` com operatingHours opcional.

### Fidelidade Visual

- **Mockup de referência:** `../specs/mockups/spec-gym-dates-visual.md` (tokens compartilhados, não layout direto)
- **Fonte de design original:** nenhuma
- **Ferramentas de fidelidade visual:** nenhuma
- **Decisões visuais já tomadas:** seção colapsada por padrão, 7 linhas com toggle, spacing do form existente.

## Passos

- **Step 1: Write the failing test**

```tsx
// nova/page.test.tsx
test("envia operatingHours ao criar academia", async () => {
  const { getByText, getByLabelText } = renderWithProviders(<AdminNovaAcademiaPage />);
  await fillBasicFields(); // helper
  const toggle = getByLabelText(/Segunda.*Fechado/i);
  // deixa Segunda aberta com 08:00-18:00 via inputs type=time
  fireEvent.change(getByLabelText(/Segunda open/i), { target:{ value:"08:00" } });
  fireEvent.change(getByLabelText(/Segunda close/i), { target:{ value:"18:00" } });
  // mock
  server.use(http.post(`${API_BASE_URL}/gyms`, async ({ request }) => {
    const body = await request.json() as any;
    expect(body.operatingHours).toEqual(expect.arrayContaining([expect.objectContaining({ weekday:1 })]));
    return HttpResponse.json({ gymId:"1" }, { status:201 });
  }));
  await getByText(/Criar/i).click();
  await waitFor(()=> expect(screen.getByText(/sucesso/i)).toBeInTheDocument());
});
```

- **Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/\(authenticated\)/admin/academias/nova/page.test.tsx -t "envia operatingHours"`
Expected: FAIL — body.operatingHours undefined / assertion fails

- **Step 3: Write minimal implementation**

```typescript
// extended-paths.ts
export interface GymCreateBody { title:string; cnpj:string; description?:string; phone?:string; address:string; latitude:number; longitude:number; operatingHours?: DayScheduleDTO[] | null }
export interface GymUpdateBody extends GymCreateBody {}

// api/index.ts
function buildCreateGymBody(input: CreateGymInput & { operatingHours?: DayScheduleDTO[] | null }): GymCreateBody {
  return { title: input.title, cnpj: input.cnpj, address: input.location.address, latitude: input.location.latitude, longitude: input.location.longitude, description: input.description || undefined, phone: input.phone || undefined, operatingHours: input.operatingHours ?? null };
}
export function useCreateGym() { return useMutation({ mutationFn: (input: CreateGymInput & { operatingHours?: DayScheduleDTO[] | null }) => fetchJson("/gyms", { method:"POST", body: JSON.stringify(buildCreateGymBody(input)) }), onSuccess:()=> queryClient.invalidateQueries({ queryKey: gymsKeys.all }) }) }
export function useUpdateGym() { return useMutation({ mutationFn: ({id, input}: {id:string; input: CreateGymInput & { operatingHours?: DayScheduleDTO[] | null }}) => fetchJson(`/gyms/${id}`, { method:"PUT", body: JSON.stringify(buildCreateGymBody(input)) }) }) }
```

```tsx
// nova/page.tsx e editar/page.tsx — adiciona seção colapsada
import { OperatingHoursField } from "@/features/gyms/components/operating-hours-field.js";
import { operatingHoursSchema } from "@/features/gyms/schemas/operating-hours-schema.js";

const [operatingHours, setOperatingHours] = useState<DayScheduleDTO[] | null>(null);
// no submit:
const parsed = operatingHoursSchema.safeParse(operatingHours ?? undefined);
if (!parsed.success) setFieldError(parsed.error.issues[0].message);
else await createGym.mutateAsync({ ...formValues, operatingHours: parsed.data ?? null });

// JSX:
<details className="rounded-md border p-3"><summary className="cursor-pointer text-sm font-medium">Horário de funcionamento (opcional)</summary>
  <OperatingHoursField value={operatingHours} onChange={setOperatingHours} />
</details>
```

Edição carrega `useGymById(id).data?.operatingHours` em `useEffect` para inicializar field.

- **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/gyms/api/index.test.tsx -t "create"`
Expected: PASS com body contendo operatingHours

Run: `npx vitest run src/app/\(authenticated\)/admin/academias/nova/page.test.tsx -t "envia operatingHours"`
Expected: PASS

## Critérios de Sucesso

- [ ] Cadastro envia `operatingHours` opcional válido e cria com sucesso [FR-001]
- [ ] Edição carrega horário existente, permite alterar e persiste via PUT substituindo integralmente [FR-002]
- [ ] Validação client impede submit com intervalos inválidos e exibe erro inline [FR-010]
- [ ] Invalidação de `gymsKeys.all` após mutação reflete no detalhe sem refresh manual
