# Task 6: Camada de dados frontend com TanStack Query [FR-001, FR-002, FR-003, FR-007]

**Status:** PENDING

**PRD:** `../prd/prd-notas-treino-calendario.md`

**Spec:** `../specs/notas-treino-calendario-design.md`

**Tier:** standard

## Visão Geral

Cria a camada de dados do frontend: query mensal com bounds do mês, três mutations com invalidação e o helper de bounds. O erro 409 é exposto com `code` para a UI trocar para o modo edição em vez de erro genérico.

## Arquivos

- Create: `apps/frontend/src/features/training-notes/api/use-training-notes.ts`
- Create: `apps/frontend/src/features/training-notes/lib/mes-bounds.ts`
- Modify: `apps/frontend/src/test/msw/handlers.ts`
- Test: `apps/frontend/src/features/training-notes/lib/mes-bounds.test.ts`
- Test: `apps/frontend/src/features/training-notes/api/use-training-notes.test.tsx`

## Interfaces

- **Consome:** paths `/training-notes` (`GET` com query `{ de, ate }`, `POST`, `PUT /training-notes/{date}`, `DELETE /training-notes/{date}`) de `@repo/api-types` via `api.GET/POST/PUT/DELETE` (task-05)
- **Produz:** `trainingNotesQueryKey(year: number, month: number): readonly ["training-notes", number, number]` (task-07); `useTrainingNotesQuery(year: number, month: number): UseQueryResult<TrainingNoteDTO[], ApiError>` (task-07); `useCreateNote(): UseMutationResult<NotaCriada, ApiError, { data: string; texto: string }>` (task-07); `useUpdateNote(): UseMutationResult<NotaAtualizada, ApiError, { data: string; texto: string }>` (task-07); `useDeleteNote(): UseMutationResult<void, ApiError, { data: string }>` (task-07); `mesBounds(year: number, month: number): { de: string; ate: string }` (task-07)

### Skills a invocar

- `tanstack-query-best-practices`: chave mensal, `invalidateQueries` e mutations com `toApiError`
- `typescript-advanced`: tipos a partir de `@repo/api-types`
- `test-antipatterns`: MSW com `onUnhandledRequest: "error"`, um comportamento por teste

## Passos

- **Step 1: Review Focus: Virada de ano na navegação (dez→jan) — Write the failing test**

  ```ts
  test("bounds de dezembro e janeiro cobrem o mês exato", () => {
    expect(mesBounds(2025, 12)).toEqual({ de: "2025-12-01", ate: "2025-12-31" });
    expect(mesBounds(2026, 1)).toEqual({ de: "2026-01-01", ate: "2026-01-31" });
  });
  ```

- **Step 2: Run test to verify it fails**

  Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/lib/mes-bounds.test.ts`
  Expected: FAIL — `mesBounds` não definido.

- **Step 3: Implement `mesBounds(year: number, month: number): { de: string; ate: string }` em `src/features/training-notes/lib/mes-bounds.ts`**

  Pino: primeiro e último dia do mês em `YYYY-MM-DD`, cuidando da virada dez→jan (mês seguinte de dezembro é janeiro do ano seguinte).

- **Step 4: Run test to verify it passes**

  Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/lib/mes-bounds.test.ts`
  Expected: PASS.

- **Step 5: Write the failing test**

  ```tsx
  test("query busca o mês com de/ate exatos sob a chave mensal", async () => {
    // wrapper: QueryClientProvider com QueryClient retry:false (espelha renderWithProviders); MSW (handlers desta task) só responde 200 quando a query é exatamente de=2026-10-01&ate=2026-10-31
    const { result } = renderHook(() => useTrainingNotesQuery(2026, 10), { wrapper });
    await waitFor(() => expect(result.current.isSuccess()).toBe(true));
    expect(result.current.data?.map((n) => n.data)).toEqual(["2026-10-16"]);
    expect(trainingNotesQueryKey(2026, 10)).toEqual(["training-notes", 2026, 10]);
  });
  ```

- **Step 6: Run test to verify it fails**

  Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/api/use-training-notes.test.tsx`
  Expected: FAIL — `useTrainingNotesQuery` não definido.

- **Step 7: Implement `trainingNotesQueryKey`, `useTrainingNotesQuery` e os handlers MSW do CRUD nos arquivos da task**

  Pinos: `trainingNotesQueryKey = (year, month) => ["training-notes", year, month] as const`; `api.GET("/training-notes", { params: { query: { de, ate } } })` com bounds de `mesBounds`; handlers em `src/test/msw/handlers.ts` via `endpoint(path)`.

- **Step 8: Run test to verify it passes**

  Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/api/use-training-notes.test.tsx`
  Expected: PASS.

- **Step 9: Write the failing test**

  ```tsx
  test("mutação com 409 expõe code e invalida a lista após sucesso", async () => {
    // mesmo wrapper do teste da query; MSW responde 409 com corpo de conflito para data já existente
    const { result } = renderHook(() => useCreateNote(), { wrapper });
    await act(async () => { await result.current.mutateAsync({ data: "2026-10-16", texto: "duplicada" }).catch((e: unknown) => e); });
    const err = result.current.failureReason as unknown as { status?: number; code?: string };
    expect(err.status).toBe(409);
    expect(err.code).toMatch(/NOTA_JA_EXISTE/);
  });
  ```

- **Step 10: Run test to verify it fails**

  Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/api/use-training-notes.test.tsx`
  Expected: FAIL — `useCreateNote` não definido (ou 409 chega sem `code` para a UI).

- **Step 11: Implement `useCreateNote`/`useUpdateNote`/`useDeleteNote` no arquivo da task**

  Pinos: `api.POST/PUT/DELETE` com `toApiError`; erro 409 exposto com `code` para a UI trocar para edição; `onSuccess: invalidateQueries({ queryKey: ["training-notes"] })`.

- **Step 12: Run test to verify it passes**

  Run: (cwd em `apps/frontend`) `pnpm vitest run src/features/training-notes/api/use-training-notes.test.tsx`
  Expected: PASS (todos os testes do arquivo).

## Critérios de Sucesso

- `mesBounds(2025, 12)` = `{ de: "2025-12-01", ate: "2025-12-31" }` e `mesBounds(2026, 1)` = `{ de: "2026-01-01", ate: "2026-01-31" }`, com recarga da lista no mês correto (Review Focus)
- Query mensal chama `GET /training-notes` com `de`/`ate` do mês e chave `["training-notes", year, month]`
- Pós-mutação invalida `["training-notes"]`; 409 chega à UI com `code` para trocar para edição em vez de erro genérico
